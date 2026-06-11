# ---- Build ----------------------------------------------------------------
FROM node:22-bookworm-slim AS builder
WORKDIR /app

# La API y el WebSocket a los que apunta la app (se incrustan en el build).
ARG VITE_API_URL=http://localhost:3000/api
ARG VITE_WS_URL=http://localhost:3000
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_WS_URL=$VITE_WS_URL

COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# ---- Servir estáticos -----------------------------------------------------
FROM nginx:1.27-alpine AS runner
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
