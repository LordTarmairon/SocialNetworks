import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { errorMessage } from '../lib/errors';

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    displayName: '',
    username: '',
    email: '',
    password: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function update(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await register(form);
      navigate('/');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-layout">
      <div className="auth-logo">Palantír</div>
      <form className="auth-card" onSubmit={handleSubmit}>
        <h1 className="auth-title">Crear cuenta</h1>
        <p className="auth-subtitle">Únete en menos de un minuto</p>

        {error && <div className="auth-error">{error}</div>}

        <label className="auth-field">
          <span>Nombre a mostrar</span>
          <input
            type="text"
            value={form.displayName}
            onChange={update('displayName')}
            required
          />
        </label>

        <label className="auth-field">
          <span>Usuario</span>
          <input
            type="text"
            autoComplete="username"
            value={form.username}
            onChange={update('username')}
            required
          />
        </label>

        <label className="auth-field">
          <span>Email</span>
          <input
            type="email"
            autoComplete="email"
            value={form.email}
            onChange={update('email')}
            required
          />
        </label>

        <label className="auth-field">
          <span>Contraseña</span>
          <input
            type="password"
            autoComplete="new-password"
            value={form.password}
            onChange={update('password')}
            minLength={8}
            required
          />
        </label>

        <button className="auth-button" type="submit" disabled={submitting}>
          {submitting ? 'Creando…' : 'Crear cuenta'}
        </button>

        <p className="auth-switch">
          ¿Ya tienes cuenta? <Link to="/login">Entra</Link>
        </p>
      </form>
    </div>
  );
}
