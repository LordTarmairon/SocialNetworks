import { useEffect, useMemo, useState } from 'react';
import { applyFilter, PHOTO_FILTERS } from '../lib/filters';

interface Props {
  file: File;
  onCancel: () => void;
  onDone: (blob: Blob) => void;
}

/** Editor de foto: elige un filtro y devuelve la imagen procesada. */
export function ImageFilterModal({ file, onCancel, onDone }: Props) {
  const [filterId, setFilterId] = useState('normal');
  const [busy, setBusy] = useState(false);
  const url = useMemo(() => URL.createObjectURL(file), [file]);

  useEffect(() => () => URL.revokeObjectURL(url), [url]);

  const css = PHOTO_FILTERS.find((f) => f.id === filterId)?.css ?? 'none';

  async function apply() {
    setBusy(true);
    try {
      const blob = await applyFilter(file, css);
      onDone(blob);
    } catch {
      // Si algo falla, subimos el original sin filtrar.
      onDone(file);
    }
  }

  return (
    <div className="edit-overlay" onClick={onCancel}>
      <div className="filter-card" onClick={(e) => e.stopPropagation()}>
        <h2 className="section-title">Ajusta tu foto</h2>
        <div className="filter-preview">
          <img src={url} alt="" style={{ filter: css }} />
        </div>
        <div className="filter-chips">
          {PHOTO_FILTERS.map((f) => (
            <button
              key={f.id}
              className={`filter-chip ${filterId === f.id ? 'active' : ''}`}
              onClick={() => setFilterId(f.id)}
            >
              <img src={url} alt="" style={{ filter: f.css }} />
              <span>{f.label}</span>
            </button>
          ))}
        </div>
        <div className="edit-actions">
          <button className="btn-ghost" onClick={onCancel} disabled={busy}>
            Cancelar
          </button>
          <button className="btn-green" onClick={apply} disabled={busy}>
            {busy ? 'Aplicando…' : 'Usar foto'}
          </button>
        </div>
      </div>
    </div>
  );
}
