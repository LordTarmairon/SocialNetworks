import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { Avatar } from '../components/Avatar';
import { errorMessage } from '../lib/errors';

export function SettingsPage() {
  const { user, logout, updateSettings } = useAuth();
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function toggle(
    key: 'showReadReceipts' | 'showLastSeen',
    value: boolean,
  ) {
    setSaving(key);
    setError(null);
    try {
      await updateSettings({ [key]: value });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="home-layout">
      <header className="home-header">
        <div className="home-me">
          <Avatar name={user?.displayName ?? '?'} size={36} />
          <strong>{user?.displayName}</strong>
        </div>
        <div className="sidebar-actions">
          <Link className="sidebar-link" to="/">
            Chats
          </Link>
          <button className="home-logout" onClick={logout}>
            Salir
          </button>
        </div>
      </header>

      <main className="contacts">
        {error && <div className="auth-error">{error}</div>}

        <h2 className="contacts-title">Privacidad</h2>

        <label className="setting-row">
          <div className="setting-info">
            <span className="setting-name">Confirmaciones de lectura</span>
            <span className="setting-desc">
              Si lo desactivas, no enviarás el doble check de "Visto"… y
              tampoco verás el de los demás.
            </span>
          </div>
          <input
            type="checkbox"
            className="setting-switch"
            checked={user?.showReadReceipts ?? true}
            disabled={saving === 'showReadReceipts'}
            onChange={(e) => toggle('showReadReceipts', e.target.checked)}
          />
        </label>

        <label className="setting-row">
          <div className="setting-info">
            <span className="setting-name">Hora de última conexión</span>
            <span className="setting-desc">
              Si lo desactivas, tus contactos no verán si estás en línea ni tu
              última conexión.
            </span>
          </div>
          <input
            type="checkbox"
            className="setting-switch"
            checked={user?.showLastSeen ?? true}
            disabled={saving === 'showLastSeen'}
            onChange={(e) => toggle('showLastSeen', e.target.checked)}
          />
        </label>
      </main>
    </div>
  );
}
