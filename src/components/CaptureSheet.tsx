import { useEffect, useRef, useState } from 'react';
import { Camera, Video, PenLine, Mic, Square, Play, Pause } from 'lucide-react';
import { Sheet } from './Sheet';
import { Button } from './Button';
import { PhotoCapture, VideoCapture, type MediaResult } from './MediaCapture';
import { MAX_VOICE_MS } from '../lib/mediaLimits';
import type { MediaType } from '../types/fragment';

const MEDIA_LABELS: Record<MediaType, string> = {
  photo: '사진',
  video: '영상',
  text: '글',
  voice: '음성',
};

const MEDIA_ICON: Record<MediaType, typeof Camera> = {
  photo: Camera,
  video: Video,
  text: PenLine,
  voice: Mic,
};

export interface CaptureDraft {
  type: MediaType;
  title: string;
  previewUrl?: string;
  /** 새 미디어가 캡처된 경우에만 있음. 편집에서 미디어 변경 안 했으면 undefined */
  mediaBlob?: Blob;
}

interface CaptureSheetProps {
  open: boolean;
  initialType: MediaType;
  initialDraft?: CaptureDraft;
  saveLabel?: string;
  onClose: () => void;
  onSave: (draft: CaptureDraft) => void;
}

export function CaptureSheet({
  open,
  initialType,
  initialDraft,
  saveLabel = '저장',
  onClose,
  onSave,
}: CaptureSheetProps) {
  const [type, setType] = useState<MediaType>(initialType);
  const [title, setTitle] = useState('');
  const [media, setMedia] = useState<MediaResult | null>(null);
  // 편집 모드에서 변경 없이 유지되는 기존 URL (mediaBlob 없음)
  const [existingPreviewUrl, setExistingPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      if (initialDraft) {
        setType(initialDraft.type);
        setTitle(initialDraft.title);
        setMedia(null);
        setExistingPreviewUrl(initialDraft.previewUrl ?? null);
      } else {
        setType(initialType);
        setTitle('');
        setMedia(null);
        setExistingPreviewUrl(null);
      }
    }
  }, [open, initialType, initialDraft]);

  const effectivePreview = media?.url ?? existingPreviewUrl;
  const canSave = title.trim().length > 0 || !!effectivePreview;

  const handleMedia = (next: MediaResult | null) => {
    setMedia(next);
    if (next) setExistingPreviewUrl(null);
  };

  const handleSave = () => {
    if (!canSave) return;
    onSave({
      type,
      title: title.trim() || defaultTitle(type),
      previewUrl: effectivePreview ?? undefined,
      mediaBlob: media?.blob,
    });
  };

  return (
    <Sheet
      open={open}
      title={initialDraft ? '결 다듬기' : '결 남기기'}
      onClose={onClose}
      footer={
        <Button
          variant="primary"
          className="btn--block"
          onClick={handleSave}
          disabled={!canSave}
        >
          {saveLabel}
        </Button>
      }
    >
      <div className="capsheet__tabs" role="tablist" aria-label="결 매체 선택">
        {(Object.keys(MEDIA_LABELS) as MediaType[]).map((t) => {
          const Icon = MEDIA_ICON[t];
          const active = type === t;
          return (
            <button
              key={t}
              role="tab"
              aria-selected={active}
              className={`capsheet__tab ${active ? 'capsheet__tab--active' : ''}`}
              onClick={() => {
                setType(t);
                setMedia(null);
                setExistingPreviewUrl(null);
              }}
            >
              <Icon size={18} strokeWidth={active ? 2 : 1.5} aria-hidden />
              <span>{MEDIA_LABELS[t]}</span>
            </button>
          );
        })}
      </div>

      <div className="capsheet__body">
        {type === 'photo' && (
          <PhotoCapture previewUrl={effectivePreview} onComplete={handleMedia} />
        )}
        {type === 'video' && (
          <VideoCapture previewUrl={effectivePreview} onComplete={handleMedia} />
        )}
        {type === 'text' && (
          <textarea
            className="capsheet__textarea"
            placeholder="오늘 떠오른 한 줄을 적어요"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={500}
            rows={6}
          />
        )}
        {type === 'voice' && (
          <VoiceField previewUrl={effectivePreview} onComplete={handleMedia} />
        )}

        {(type === 'photo' || type === 'video' || type === 'voice') && (
          <label className="capsheet__caption">
            <span className="capsheet__caption-label">한 줄 메모 (선택)</span>
            <input
              type="text"
              className="capsheet__input"
              placeholder="짧게 한 줄"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={80}
            />
          </label>
        )}
      </div>
    </Sheet>
  );
}

function defaultTitle(type: MediaType): string {
  switch (type) {
    case 'photo':
      return '사진 한 장';
    case 'video':
      return '영상 한 컷';
    case 'voice':
      return '음성 메모';
    case 'text':
      return '메모';
  }
}

interface VoiceFieldProps {
  previewUrl: string | null;
  onComplete: (media: MediaResult | null) => void;
}

function VoiceField({ previewUrl, onComplete }: VoiceFieldProps) {
  const [recording, setRecording] = useState(false);
  const [playing, setPlaying] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const maxTimerRef = useRef<number | null>(null);

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        onComplete({ url: URL.createObjectURL(blob), blob });
        stream.getTracks().forEach((t) => t.stop());
      };
      recorder.start();
      recorderRef.current = recorder;
      setRecording(true);
      // 최대 60초에서 자동 정지 — 가볍게.
      maxTimerRef.current = window.setTimeout(stop, MAX_VOICE_MS);
    } catch (err) {
      console.warn('voice record unavailable', err);
    }
  };

  const stop = () => {
    if (maxTimerRef.current !== null) {
      window.clearTimeout(maxTimerRef.current);
      maxTimerRef.current = null;
    }
    recorderRef.current?.stop();
    setRecording(false);
  };

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (playing) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
  };

  return (
    <div className="capsheet__voice">
      {previewUrl ? (
        <div className="capsheet__voice-player">
          <button
            className="capsheet__voice-btn"
            onClick={togglePlay}
            aria-label={playing ? '일시정지' : '재생'}
          >
            {playing ? <Pause size={20} strokeWidth={1.5} /> : <Play size={20} strokeWidth={1.5} />}
          </button>
          <audio
            ref={audioRef}
            src={previewUrl}
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onEnded={() => setPlaying(false)}
          />
          <button className="capsheet__voice-link" onClick={() => onComplete(null)}>
            다시 녹음
          </button>
        </div>
      ) : (
        <button
          className={`capsheet__voice-btn capsheet__voice-btn--lg ${recording ? 'capsheet__voice-btn--rec' : ''}`}
          onClick={recording ? stop : start}
          aria-label={recording ? '녹음 중지' : '녹음 시작'}
        >
          {recording ? <Square size={24} strokeWidth={2} /> : <Mic size={24} strokeWidth={1.5} />}
        </button>
      )}
      <div className="capsheet__voice-hint">
        {recording
          ? '녹음 중… 다시 누르면 멈춰요.'
          : previewUrl
            ? '저장하면 보관돼요.'
            : '버튼을 눌러 녹음을 시작해요.'}
      </div>
    </div>
  );
}
