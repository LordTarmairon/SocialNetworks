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
      <div className="auth-brand">
        <h1>mellon</h1>
        <p>Crea tu cuenta y vuelve a empezar.</p>
      </div>
      <form className="auth-card" onSubmit={handleSubmit}>
        <h2>Crear cuenta</h2>
        {error && <div className="auth-error">{error}</div>}
        <input
          placeholder="Nombre a mostrar"
          value={form.displayName}
          onChange={update('displayName')}
          required
        />
        <input
          placeholder="Usuario"
          autoComplete="username"
          value={form.username}
          onChange={update('username')}
          required
        />
        <input
          type="email"
          placeholder="Email"
          autoComplete="email"
          value={form.email}
          onChange={update('email')}
          required
        />
        <input
          type="password"
          placeholder="Contraseña (mín. 8)"
          autoComplete="new-password"
          value={form.password}
          onChange={update('password')}
          minLength={8}
          required
        />
        <button type="submit" disabled={submitting}>
          {submitting ? 'Creando…' : 'Crear cuenta'}
        </button>
        <p className="auth-switch">
          ¿Ya tienes cuenta? <Link to="/login">Entra</Link>
        </p>
      </form>
    </div>
  );
}
