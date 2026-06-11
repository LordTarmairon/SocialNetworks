import { useRef, useState, type ChangeEvent } from 'react';
import { useAuth } from '../auth/AuthContext';
import { errorMessage } from '../lib/errors';
import { mediaUrl, uploadImage } from '../lib/media';
import { usersApi } from '../lib/users';
import type { Profile } from '../lib/social';
import { Avatar } from './Avatar';

interface Props {
  profile: Profile;
  onSaved: (p: Partial<Profile>) => void;
  onClose: () => void;
}

export function EditProfile({ profile, onSaved, onClose }: Props) {
  const { user, setUser } = useAuth();
  const [displayName, setDisplayName] = useState(profile.displayName);
  const [bio, setBio] = useState(profile.bio ?? '');
  const [avatarUrl, setAvatarUrl] = useState(profile.avatarUrl);
  const [coverUrl, setCoverUrl] = useState(profile.coverUrl);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const coverRef = useRef<HTMLInputElement>(null);

  async function onPickAvatar(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    try {
      const url = await uploadImage(file);
      setAvatarUrl(url);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  async function onPickCover(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    try {
      setCoverUrl(await uploadImage(file));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      if (coverRef.current) coverRef.current.value = '';
    }
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const updated = await usersApi.updateProfile({
        displayName: displayName.trim(),
        bio: bio.trim(),
        avatarUrl: avatarUrl ?? undefined,
        coverUrl: coverUrl ?? undefined,
      });
      // Reflejar en la sesión y en la cabecera del perfil.
      if (user) setUser({ ...user, ...updated });
      onSaved({
        displayName: updated.displayName,
        bio: updated.bio,
        avatarUrl: updated.avatarUrl,
        coverUrl: updated.coverUrl,
      });
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="edit-overlay" onClick={onClose}>
      <div className="edit-card" onClick={(e) => e.stopPropagation()}>
        <h2 className="section-title">Editar perfil</h2>
        {error && <div className="auth-error">{error}</div>}

        <button
          type="button"
          className="edit-cover"
          onClick={() => coverRef.current?.click()}
          style={
            coverUrl
              ? { backgroundImage: `url(${mediaUrl(coverUrl)})` }
              : undefined
          }
          title="Cambiar portada"
        >
          <span className="edit-cover-badge">📷 Portada</span>
        </button>
        <input
          ref={coverRef}
          type="file"
          accept="image/*"
          hidden
          onChange={onPickCover}
        />

        <div className="edit-avatar">
          <button
            type="button"
            className="avatar-edit"
            onClick={() => fileRef.current?.click()}
            title="Cambiar foto"
          >
            <Avatar name={displayName || '?'} src={avatarUrl} size={88} />
            <span className="avatar-edit-badge">📷</span>
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            hidden
            onChange={onPickAvatar}
          />
        </div>

        <label className="edit-field">
          <span>Nombre a mostrar</span>
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            maxLength={50}
          />
        </label>
        <label className="edit-field">
          <span>Biografía</span>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            maxLength={280}
            rows={3}
            placeholder="Cuenta algo sobre ti…"
          />
        </label>

        <div className="edit-actions">
          <button className="btn-ghost" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn-green" onClick={save} disabled={saving}>
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
}
