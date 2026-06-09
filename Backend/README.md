# Backend — SocialNetwork API

API compartida (NestJS + Prisma 7 + PostgreSQL) para las dos apps:
la de mensajería (estilo WhatsApp) y la red social (estilo Tuenti).

## Stack

- **NestJS 11** (Node + TypeScript)
- **Prisma 7** como ORM (con driver adapter `@prisma/adapter-pg`)
- **PostgreSQL** — en desarrollo se levanta uno local con `prisma dev` (sin Docker)
- **JWT** (Passport) para autenticación

## Puesta en marcha

1. Instala dependencias:

   ```bash
   npm install
   ```

2. Arranca la base de datos local (deja esta terminal abierta):

   ```bash
   npx prisma dev --name socialnetwork
   ```

   Copia la `DATABASE_URL` que imprime al `.env` (parte de `.env.example`).

3. Sincroniza el esquema con la base de datos:

   ```bash
   npx prisma db push
   ```

4. Arranca la API en modo desarrollo:

   ```bash
   npm run start:dev
   ```

   La API queda en `http://localhost:3000/api`.

## Endpoints actuales

| Método | Ruta                 | Descripción                          |
| ------ | -------------------- | ------------------------------------ |
| POST   | `/api/auth/register` | Registro de usuario                  |
| POST   | `/api/auth/login`    | Login (con email o username)         |
| GET    | `/api/auth/me`       | Datos del usuario autenticado (JWT)  |

## Notas de Prisma 7

- Las URLs de conexión van en `prisma.config.ts`, **no** en `schema.prisma`.
- El cliente se genera en `src/generated/prisma` con `moduleFormat = "cjs"`
  para que case con el build CommonJS de NestJS.
- En desarrollo usamos `prisma db push` (la shadow DB del Postgres local no
  funciona bien con `prisma migrate dev`). Para producción se usarán migraciones.
