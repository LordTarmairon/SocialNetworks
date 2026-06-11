# Palantír — Chat (Frontend)

Cliente de mensajería estilo WhatsApp/Messenger. Forma parte del monorepo
[SocialNetwork](../../README.md) y consume la API compartida (`Backend/`).

> _Palantír_: la «piedra vidente» de Tolkien que permite comunicarse a distancia.

## Stack

- React + Vite + TypeScript
- React Router
- socket.io-client (mensajería en tiempo real)

## Funcionalidades

- **Alta y acceso por número de teléfono** (o por usuario).
- Chats 1‑a‑1 y **grupos** (crear, renombrar, añadir miembros, salir).
- **Editar y borrar** mensajes, **reenviar**, **reacciones** y notas de voz.
- **Llamadas de voz y vídeo** 1‑a‑1 (WebRTC; el servidor solo hace de
  señalización por WebSocket, el audio/vídeo viaja peer‑to‑peer).
- Recibos de lectura y «última conexión» configurables en Ajustes.

## Desarrollo

```bash
npm install
cp .env.example .env     # apunta a la API (http://localhost:3000)
npm run dev              # http://localhost:5173
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
