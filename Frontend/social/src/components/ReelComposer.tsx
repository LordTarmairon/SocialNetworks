import { useEffect, useMemo, useState } from 'react';
import { cropVideoToVertical } from '../lib/video';

interface Props {
  file: File;
  onCancel: () => void;
  onDone: (blob: Blob, caption: string) => void;
}

/** Compositor de reel: recorte vertical opcional + pie de foto. */
export function ReelComposer({ file, onCancel, onDone }: Props) {
  const [vertical, setVertical] = useState(true);
  const [caption, setCaption] = useState('');
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const url = useMemo(() => URL.createObjectURL(file), [file]);

  useEffect(() => () => URL.revokeObjectURL(url), [url]);

  async function publish() {
    setBusy(true);
    try {
      if (vertical) {
        const blob = await cropVideoToVertical(file, setProgress);
        // Si el recorte sale vacío/corrupto, caemos al original.
        if (blob.size < 2048) throw new Error('recorte vacío');
        onDone(blob, caption.trim());
      } else {
        onDone(file, caption.trim());
      }
    } catch {
      // Si el recorte falla, publicamos el vídeo original.
      onDone(file, caption.trim());
    }
  }

  return (
    <div className="edit-overlay" onClick={busy ? undefined : onCancel}>
      <div className="reelc-card" onClick={(e) => e.stopPropagation()}>
        <h2 className="section-title">Nuevo reel</h2>
        <div className={`reelc-preview ${vertical ? 'vertical' : ''}`}>
          <video src={url} autoPlay muted loop playsInline />
        </div>

        <label className="reelc-toggle">
          <input
            type="checkbox"
            checked={vertical}
            onChange={(e) => setVertical(e.target.checked)}
            disabled={busy}
          />
          Recortar a vertical (9:16)
        </label>

        <textarea
          className="reelc-caption"
          placeholder="Escribe un pie para tu reel…"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          rows={2}
          maxLength={300}
          disabled={busy}
        />

        {busy && vertical && (
          <div className="reelc-progress">
            Procesando vídeo… {Math.round(progress * 100)}%
          </div>
        )}

        <div className="edit-actions">
          <button className="btn-ghost" onClick={onCancel} disabled={busy}>
            Cancelar
          </button>
          <button className="btn-green" onClick={publish} disabled={busy}>
            {busy ? 'Publicando…' : 'Publicar'}
          </button>
        </div>
      </div>
    </div>
  );
}
