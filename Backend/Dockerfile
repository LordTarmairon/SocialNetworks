# ---- Etapa de build -------------------------------------------------------
FROM node:22-bookworm-slim AS builder
WORKDIR /app

# Dependencias (con dev) para compilar y generar el cliente Prisma.
COPY package*.json ./
RUN npm ci

COPY . .
RUN npx prisma generate
RUN npm run build

# ---- Etapa de ejecución ---------------------------------------------------
FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production

# Copiamos node_modules (incluye la CLI de Prisma para `db push` en el arranque),
# el build, el esquema y la config de Prisma.
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY package*.json ./

# Carpeta de subidas (montar como volumen para que persista).
RUN mkdir -p uploads
EXPOSE 3000

# Sincroniza el esquema con la base de datos y arranca la API.
CMD ["sh", "-c", "npx prisma db push --skip-generate && node dist/main"]
