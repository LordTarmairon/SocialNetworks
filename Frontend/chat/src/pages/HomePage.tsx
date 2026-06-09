import { useAuth } from '../auth/AuthContext';

export function HomePage() {
  const { user, logout } = useAuth();

  return (
    <div className="home-layout">
      <header className="home-header">
        <h1>SocialChat</h1>
        <button className="home-logout" onClick={logout}>
          Salir
        </button>
      </header>

      <main className="home-main">
        <div className="home-welcome">
          <div className="home-avatar">
            {user?.displayName.charAt(0).toUpperCase()}
          </div>
          <h2>Hola, {user?.displayName} 👋</h2>
          <p>
            Has iniciado sesión como <strong>@{user?.username}</strong>.
          </p>
          <p className="home-hint">
            Aquí irá la lista de chats. La autenticación ya funciona de punta a
            punta contra el backend. 🎉
          </p>
        </div>
      </main>
    </div>
  );
}
