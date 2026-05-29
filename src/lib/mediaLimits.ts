/**
 * 미디어 효율 제한 — "가볍게 한 결". 캡처 시점에 작게 만들어 저장·동기화·복원 비용을 줄인다.
 * (사후 압축보다 효율적이고 결 정체성에 맞음. 무료 기본값 — 추후 Plus에서 완화 가능.)
 */
export const MAX_VIDEO_MS = 30_000; // 영상 최대 30초
export const MAX_VOICE_MS = 60_000; // 음성 최대 60초

const IMG_MAX_DIM = 1600; // 긴 변 최대 px
const IMG_QUALITY = 0.8; // JPEG 품질
const IMG_SKIP_BELOW = 600_000; // 이미 충분히 작으면(<~0.6MB) 그대로 둠

/**
 * 이미지를 적당한 크기로 줄이고 재압축한다(canvas). 폰 사진 수MB → 수백KB.
 * 이미지가 아니거나 실패하면 원본을 그대로 반환(안전).
 */
export async function downscaleImage(input: Blob): Promise<Blob> {
  try {
    if (!input.type.startsWith('image/')) return input;
    const bitmap = await createImageBitmap(input);
    const longest = Math.max(bitmap.width, bitmap.height);
    const scale = Math.min(1, IMG_MAX_DIM / longest);
    if (scale >= 1 && input.size < IMG_SKIP_BELOW) {
      bitmap.close?.();
      return input; // 이미 작음
    }
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      bitmap.close?.();
      return input;
    }
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close?.();
    const out = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', IMG_QUALITY),
    );
    return out && out.size < input.size ? out : input;
  } catch {
    return input;
  }
}

/** 영상 길이(ms)를 메타데이터로 잰다. 실패 시 0. */
export function getVideoDurationMs(blob: Blob): Promise<number> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(blob);
    const v = document.createElement('video');
    v.preload = 'metadata';
    v.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(Number.isFinite(v.duration) ? v.duration * 1000 : 0);
    };
    v.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(0);
    };
    v.src = url;
  });
}
