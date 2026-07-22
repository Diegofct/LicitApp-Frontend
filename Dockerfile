# syntax=docker/dockerfile:1

# ============================================================================
# Etapa 1 — build: compila el SPA de Angular a estáticos.
# ============================================================================
FROM node:22-alpine AS build

WORKDIR /app

# Copiamos primero SOLO los manifiestos para aprovechar la caché de capas:
# mientras package.json / package-lock.json no cambien, Docker reutiliza la
# capa de node_modules y no reinstala en cada build.
COPY package.json package-lock.json ./

# 'npm ci' instala de forma reproducible y exacta según el lockfile
# (más determinista que 'npm install' para builds de CI/producción).
RUN npm ci

# Ahora el resto del código fuente (lo que no excluya .dockerignore).
COPY . .

# 'npm run build' == 'ng build'. angular.json tiene defaultConfiguration:
# production, así que aplica el fileReplacement environment.ts -> environment.prod.ts
# (RF4): la base de la API queda relativa '/api/v1'. Salida: dist/licitapp-frontend/browser
RUN npm run build

# ============================================================================
# Etapa 2 — runtime: Caddy sirve los estáticos y actúa de puerta de entrada.
# Imagen final ligera: NO contiene Node, node_modules ni el código fuente,
# solo el binario de Caddy y los archivos compilados.
# ============================================================================
FROM caddy:2-alpine

# Copiamos únicamente el resultado del build al directorio que sirve Caddy.
COPY --from=build /app/dist/licitapp-frontend/browser /srv

# El Caddyfile real (dominio, TLS automático, reverse_proxy /api/* -> backend,
# fallback SPA a /index.html) NO se hornea aquí: se monta en tiempo de ejecución
# desde el repo de despliegue 'licitapp-deploy' vía docker-compose. Así la
# configuración de dominio/entorno vive junto al compose, no dentro de la imagen.

# Caddy escucha en 80 (HTTP -> redirige a HTTPS) y 443 (HTTPS con Let's Encrypt).
EXPOSE 80 443
