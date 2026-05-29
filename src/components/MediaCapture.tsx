import { useEffect, useRef, useState } from 'react';
import { Camera, Upload, RefreshCcw, Square } from 'lucide-react';
import { downscaleImage, getVideoDurationMs, MAX_VIDEO_MS } from '../lib/mediaLimits';
import { activeSpaceKeepsOriginal } from '../lib/plan';

/** Plus(원본 화질) 공간이면 원본 유지, 아니면 다운스케일. */
async function fitImage(blob: Blob): Promise<Blob> {
  return activeSpaceKeepsOriginal() ? blob : downscaleImage(blob);
}

type FacingMode = 'user' | 'environment';

export interface MediaResult {
  url: string;
  blob: Blob;
}

type OnComplete = (media: MediaResult | null) => void;

interface PhotoCaptureProps {
  previewUrl: string | null;
  onComplete: OnComplete;
}

export function PhotoCapture({ previewUrl, onComplete }: PhotoCaptureProps) {
  const [cameraOpen, setCameraOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const pickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (!file) return;
    const blob = await fitImage(file); // 무료=다운스케일 / Plus=원본
    onComplete({ url: URL.createObjectURL(blob), blob });
  };

  if (previewUrl) {
    return <PreviewBox kind="image" url={previewUrl} onReplace={() => onComplete(null)} />;
  }

  if (cameraOpen) {
    return (
      <PhotoCameraLive
        onCapture={(media) => {
          onComplete(media);
          setCameraOpen(false);
        }}
        onCancel={() => setCameraOpen(false)}
      />
    );
  }

  return (
    <>
      <div className="capsheet__choice">
        <button className="capsheet__choice-btn" onClick={() => setCameraOpen(true)}>
          <Camera size={22} strokeWidth={1.5} aria-hidden />
          <span>카메라로 찍기</span>
        </button>
        <button className="capsheet__choice-btn" onClick={() => fileInputRef.current?.click()}>
          <Upload size={22} strokeWidth={1.5} aria-hidden />
          <span>갤러리에서 선택</span>
        </button>
      </div>
      <input ref={fileInputRef} type="file" accept="image/*" onChange={pickFile} hidden />
    </>
  );
}

interface VideoCaptureProps {
  previewUrl: string | null;
  onComplete: OnComplete;
}

export function VideoCapture({ previewUrl, onComplete }: VideoCaptureProps) {
  const [cameraOpen, setCameraOpen] = useState(false);
  const [tooLong, setTooLong] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const pickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (!file) return;
    const ms = await getVideoDurationMs(file);
    if (ms > MAX_VIDEO_MS + 1500) {
      setTooLong(true); // 30초 초과 갤러리 영상은 받지 않음
      return;
    }
    setTooLong(false);
    onComplete({ url: URL.createObjectURL(file), blob: file });
  };

  if (previewUrl) {
    return <PreviewBox kind="video" url={previewUrl} onReplace={() => onComplete(null)} />;
  }

  if (cameraOpen) {
    return (
      <VideoCameraLive
        onCapture={(media) => {
          onComplete(media);
          setCameraOpen(false);
        }}
        onCancel={() => setCameraOpen(false)}
      />
    );
  }

  return (
    <>
      <div className="capsheet__choice">
        <button className="capsheet__choice-btn" onClick={() => setCameraOpen(true)}>
          <Camera size={22} strokeWidth={1.5} aria-hidden />
          <span>카메라로 찍기</span>
        </button>
        <button className="capsheet__choice-btn" onClick={() => fileInputRef.current?.click()}>
          <Upload size={22} strokeWidth={1.5} aria-hidden />
          <span>갤러리에서 선택</span>
        </button>
      </div>
      {tooLong && (
        <p className="capsheet__hint">영상은 30초까지 담을 수 있어요. 더 짧은 영상을 골라주세요.</p>
      )}
      <input ref={fileInputRef} type="file" accept="video/*" onChange={pickFile} hidden />
    </>
  );
}

function PreviewBox({
  kind,
  url,
  onReplace,
}: {
  kind: 'image' | 'video';
  url: string;
  onReplace: () => void;
}) {
  return (
    <div className="capsheet__preview">
      {kind === 'image' ? <img src={url} alt="" /> : <video src={url} controls />}
      <button className="capsheet__preview-replace" onClick={onReplace}>
        다시 선택
      </button>
    </div>
  );
}

interface LiveStreamOptions {
  video: boolean;
  audio: boolean;
  facing: FacingMode;
}

function useLiveStream({ video, audio, facing }: LiveStreamOptions) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let stream: MediaStream | null = null;
    setError(null);
    setReady(false);

    const start = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          // 720p로 제약 — 용량·대역폭 절감(사진은 어차피 다운스케일).
          video: video ? { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 720 } } : false,
          audio,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setReady(true);
      } catch (err) {
        console.warn('getUserMedia failed', err);
        if (!cancelled) setError('카메라 권한이 필요해요. 브라우저 권한을 확인해 주세요.');
      }
    };

    start();
    return () => {
      cancelled = true;
      stream?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [video, audio, facing]);

  return { videoRef, streamRef, error, ready };
}

interface PhotoCameraLiveProps {
  onCapture: (media: MediaResult) => void;
  onCancel: () => void;
}

function PhotoCameraLive({ onCapture, onCancel }: PhotoCameraLiveProps) {
  const [facing, setFacing] = useState<FacingMode>('environment');
  const { videoRef, error, ready } = useLiveStream({ video: true, audio: false, facing });

  const shoot = () => {
    const video = videoRef.current;
    if (!video || !ready) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    canvas.toBlob(
      async (blob) => {
        if (!blob) return;
        const fitted = await fitImage(blob); // 무료=다운스케일 / Plus=원본
        onCapture({ url: URL.createObjectURL(fitted), blob: fitted });
      },
      'image/jpeg',
      0.92,
    );
  };

  return (
    <CameraFrame
      videoRef={videoRef}
      error={error}
      onCancel={onCancel}
      onFlip={() => setFacing((f) => (f === 'user' ? 'environment' : 'user'))}
    >
      <button className="camera__shutter" aria-label="촬영" onClick={shoot} disabled={!ready} />
    </CameraFrame>
  );
}

interface VideoCameraLiveProps {
  onCapture: (media: MediaResult) => void;
  onCancel: () => void;
}

function VideoCameraLive({ onCapture, onCancel }: VideoCameraLiveProps) {
  const [facing, setFacing] = useState<FacingMode>('environment');
  const { videoRef, streamRef, error, ready } = useLiveStream({
    video: true,
    audio: true,
    facing,
  });
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!recording) return;
    const startedAt = Date.now();
    const id = window.setInterval(() => {
      const ms = Date.now() - startedAt;
      setElapsed(Math.floor(ms / 1000));
      if (ms >= MAX_VIDEO_MS) {
        // 30초에서 자동 정지 — 가볍게.
        recorderRef.current?.stop();
        setRecording(false);
      }
    }, 250);
    return () => window.clearInterval(id);
  }, [recording]);

  const start = () => {
    if (!streamRef.current || !ready) return;
    try {
      let recorder: MediaRecorder;
      try {
        recorder = new MediaRecorder(streamRef.current, { videoBitsPerSecond: 2_500_000 });
      } catch {
        recorder = new MediaRecorder(streamRef.current); // 옵션 미지원 환경 폴백
      }
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        onCapture({ url: URL.createObjectURL(blob), blob });
      };
      recorder.start();
      recorderRef.current = recorder;
      setRecording(true);
      setElapsed(0);
    } catch (err) {
      console.warn('video record start failed', err);
    }
  };

  const stop = () => {
    recorderRef.current?.stop();
    setRecording(false);
  };

  return (
    <CameraFrame
      videoRef={videoRef}
      error={error}
      onCancel={onCancel}
      onFlip={recording ? undefined : () => setFacing((f) => (f === 'user' ? 'environment' : 'user'))}
      topBadge={recording ? <span className="camera__rec">● {formatElapsed(elapsed)} / 0:30</span> : null}
    >
      {recording ? (
        <button
          className="camera__shutter camera__shutter--stop"
          aria-label="녹화 중지"
          onClick={stop}
        >
          <Square size={20} strokeWidth={2} fill="currentColor" />
        </button>
      ) : (
        <button
          className="camera__shutter camera__shutter--record"
          aria-label="녹화 시작"
          onClick={start}
          disabled={!ready}
        />
      )}
    </CameraFrame>
  );
}

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

interface CameraFrameProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  error: string | null;
  onCancel: () => void;
  onFlip?: () => void;
  topBadge?: React.ReactNode;
  children: React.ReactNode;
}

function CameraFrame({
  videoRef,
  error,
  onCancel,
  onFlip,
  topBadge,
  children,
}: CameraFrameProps) {
  if (error) {
    return (
      <div className="camera-error">
        <p>{error}</p>
        <button className="camera-error__cancel" onClick={onCancel}>
          취소
        </button>
      </div>
    );
  }

  return (
    <div className="camera">
      <video ref={videoRef} autoPlay playsInline muted className="camera__preview" />
      {topBadge && <div className="camera__top">{topBadge}</div>}
      <div className="camera__bottom">
        <button className="camera__chip" onClick={onCancel}>
          취소
        </button>
        {children}
        {onFlip ? (
          <button className="camera__chip camera__chip--icon" onClick={onFlip} aria-label="앞뒤 전환">
            <RefreshCcw size={18} strokeWidth={1.5} />
          </button>
        ) : (
          <span className="camera__chip camera__chip--ghost" aria-hidden />
        )}
      </div>
    </div>
  );
}
