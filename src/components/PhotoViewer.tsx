import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface PhotoViewerProps {
  open: boolean;
  src: string;
  alt?: string;
  onClose: () => void;
}

export function PhotoViewer({ open, src, alt = '', onClose }: PhotoViewerProps) {
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className="photo-viewer"
      role="dialog"
      aria-modal="true"
      aria-label="사진 크게 보기"
      onClick={onClose}
    >
      <img className="photo-viewer__img" src={src} alt={alt} onClick={(e) => e.stopPropagation()} />
      <button className="photo-viewer__close" aria-label="닫기" onClick={onClose}>
        <X size={20} strokeWidth={1.75} />
      </button>
    </div>,
    document.body,
  );
}
