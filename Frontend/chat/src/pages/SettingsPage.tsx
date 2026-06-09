import { useRef, useState, type ChangeEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { Avatar } from '../components/Avatar';
import { errorMessage } from '../lib/errors';
import { uploadImage } from '../lib/media';

export function SettingsPage() {
  const { user, logout, updateSettings, updateProfile } = useAuth();
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState(user?.displayName ?? '');
  const [bio, setBio] = useState(user?.bio ?? '');
  const fileRef = useRef<HTMLInputElement>(null);

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

  async function onAvatarChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setSaving('avatar');
    setError(null);
    try {
      const url = await uploadImage(file);
      await updateProfile({ avatarUrl: url });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(null);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  async function saveProfile() {
    setSaving('profile');
    setError(null);
    try {
      await updateProfile({ displayName: displayName.trim(), bio: bio.trim() });
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
          <Avatar
            name={user?.displayName ?? '?'}
            src={user?.avatarUrl}
            size={36}
          />
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

        {/* Perfil */}
        <h2 className="contacts-title">Perfil</h2>
        <div className="profile-edit">
          <button
            type="button"
            className="avatar-edit"
            onClick={() => fileRef.current?.click()}
            title="Cambiar foto"
          >
            <Avatar
              name={user?.displayName ?? '?'}
              src={user?.avatarUrl}
              size={88}
            />
            <span className="avatar-edit-badge">
              {saving === 'avatar' ? '…' : '📷'}
            </span>
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            hidden
            onChange={onAvatarChange}
          />
          <p className="setting-desc">Toca la foto para cambiarla (imagen o GIF).</p>
        </div>

        <label className="auth-field">
          <span>Nombre a mostrar</span>
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            maxLength={50}
          />
        </label>
        <label className="auth-field">
          <span>Biografía</span>
          <textarea
            className="bio-input"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            maxLength={280}
            rows={3}
            placeholder="Cuenta algo sobre ti…"
          />
        </label>
        <button
          className="auth-button"
          onClick={saveProfile}
          disabled={saving === 'profile'}
        >
          {saving === 'profile' ? 'Guardando…' : 'Guardar perfil'}
        </button>

        {/* Privacidad */}
        <h2 className="contacts-title" style={{ marginTop: '1.5rem' }}>
          Privacidad
        </h2>

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
