# SocialNetwork — Palantír & Mellon

Dos aplicaciones de red social que comparten **un único backend**:

| App          | Estilo                | Carpeta           | Puerto | Significado (Tolkien)                          |
| ------------ | --------------------- | ----------------- | ------ | --------------------------------------------- |
| **Palantír** | Chat (WhatsApp)       | `Frontend/chat`   | `5173` | _piedra vidente_ que comunica a distancia     |
| **Mellon**   | Red social (Tuenti)   | `Frontend/social` | `5174` | _amigo_ en sindarin                           |
| **API**      | Backend compartido    | `Backend`         | `3000` | NestJS + Prisma 7 + PostgreSQL                |

## Stack

- **Backend**: NestJS 11, Prisma 7 (driver adapter `@prisma/adapter-pg`),
  PostgreSQL, JWT (Passport), Socket.IO (chat en tiempo real), Multer (subidas).
- **Frontends**: React + Vite + TypeScript, React Router, socket.io-client.

## Funcionalidades principales

**Palantír (chat)**
- Alta y acceso **por número de teléfono** (o usuario).
- Mensajería 1‑a‑1 y grupos (crear, renombrar, añadir, salir).
- Editar y borrar mensajes, reenviar, reacciones, notas de voz.
- Recibos de lectura y «última conexión» configurables.

**Mellon (red social)**
- Muro, publicaciones, fotos, álbumes, historias (con vistas y reacciones).
- Comentarios y reacciones; menciones `@usuario` y `#hashtags`.
- Amigos, seguir usuarios, bloquear, eventos, guardados.
- Etiquetado de personas en fotos, novedades, «gente que quizás conozcas».
- Buscador en vivo, «quién vio tu perfil» y **Reels** (vídeos cortos).

## Puesta en marcha (desarrollo)

Necesitas **4 terminales** (base de datos, API y los dos frontends).

### 1) Base de datos + API

```bash
cd Backend
npm install
cp .env.example .env          # rellena JWT_SECRET; la DATABASE_URL la da el paso siguiente
npx prisma dev --name socialnetwork   # deja esta terminal abierta
```

En otra terminal:

```bash
cd Backend
npx prisma db push            # sincroniza el esquema
npm run start:dev             # API en http://localhost:3000/api
```

### 2) Palantír (chat)

```bash
cd Frontend/chat
npm install
cp .env.example .env
npm run dev                   # http://localhost:5173
```

### 3) Mellon (red social)

```bash
cd Frontend/social
npm install
cp .env.example .env
npm run dev                   # http://localhost:5174
```

## Notas

- Los secretos (`.env`), `node_modules`, builds (`dist/`), el cliente Prisma
  generado y la carpeta `Backend/uploads/` están **ignorados** por git.
- Detalles de cada parte en `Backend/README.md`, `Frontend/chat/README.md`
  y `Frontend/social/README.md`.
