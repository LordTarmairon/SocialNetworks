# Mellon — Red social (Frontend)

Red social estilo Tuenti/Facebook. Forma parte del monorepo
[SocialNetwork](../../README.md) y consume la API compartida (`Backend/`).

> _Mellon_: «amigo» en sindarin (la palabra que abre las puertas de Moria).

## Stack

- React + Vite + TypeScript
- React Router
- socket.io-client (presencia y novedades)

## Funcionalidades

- Muro, **publicaciones**, fotos, **álbumes** e **historias** (vistas y reacciones).
- Comentarios y reacciones; menciones `@usuario` y `#hashtags`.
- **Amigos**, seguir usuarios, bloquear, **eventos** y guardados.
- **Etiquetado** de personas en fotos, novedades y «gente que quizás conozcas».
- Buscador en vivo, «quién vio tu perfil» y **Reels** (vídeos cortos verticales
  con comentarios).
- **Campana de notificaciones** en tiempo real (contador en vivo vía WebSocket).
- **Modo oscuro**, diseño **responsive/móvil** (barra inferior) y **PWA** instalable.
- Perfil con **foto de portada** además del avatar.

## Desarrollo

```bash
npm install
cp .env.example .env     # apunta a la API (http://localhost:3000)
npm run dev              # http://localhost:5174
```

Requiere el backend en marcha (ver [`Backend/README.md`](../../Backend/README.md)).

## Scripts

| Script            | Acción                          |
| ----------------- | ------------------------------- |
| `npm run dev`     | Servidor de desarrollo (HMR)    |
| `npm run build`   | Build de producción             |
| `npm run preview` | Sirve el build de producción    |
| `npm run lint`    | ESLint                          |

## Variables de entorno

| Variable         | Descripción                       | Por defecto                  |
| ---------------- | --------------------------------- | ---------------------------- |
| `VITE_API_URL`   | URL base de la API REST           | `http://localhost:3000/api`  |
| `VITE_WS_URL`    | URL del servidor de WebSockets    | `http://localhost:3000`      |
