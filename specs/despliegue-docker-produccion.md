# Spec: Despliegue en producción con Docker (backend + base de datos + frontend)

- **Estado:** Borrador · pendiente de confirmar plan
- **Feature/módulo afectado:** Infraestructura (transversal): frontend `licitapp-frontend`,
  backend `licitapp`, base de datos MySQL. Nuevo material de despliegue (Docker/Caddy).
- **Autor:** Diego
- **Fecha:** 2026-07-17

## Objetivo

Poner LicitApp en producción de modo que cualquier persona escriba `https://<dominio>` en su
navegador y llegue a la aplicación funcionando (frontend + API + base de datos), servida
desde un servidor público, con HTTPS. Todo el runtime se empaqueta y orquesta con Docker
Compose; el hosting (servidor + dominio + TLS) se resuelve encima.

## Contexto y decisiones de destino

- **Destino:** servidor/nube con **dominio público** accesible desde internet, con HTTPS.
- **Punto de partida:** no hay servidor ni dominio todavía; esta spec incluye qué adquirir.
- **Repos:** `licitapp` (backend, Spring Boot 3.4 / Java 21 / Maven / MySQL / Flyway) y
  `licitapp-frontend` (Angular 21, build estático). Son repos git separados, hermanos bajo
  `Elemental/`.

## Alcance

- **Incluye:**
  - `Dockerfile` multi-etapa para backend y para frontend.
  - `docker-compose.yml` con tres servicios: `db` (MySQL), `backend`, `proxy` (Caddy).
  - **Caddy** como única puerta de entrada: sirve el SPA, reverse-proxy a `/api/v1`, TLS
    automático (Let's Encrypt).
  - Refactor del frontend: URLs de API **relativas** (hoy están hardcodeadas a
    `http://localhost:8080`), centralizadas en `environment`.
  - Manejo de secretos por `.env` (fuera de las imágenes y de git).
  - Persistencia de MySQL en un volumen con nombre.
  - Guía de adquisición (VPS + dominio + DNS) y procedimiento de despliegue.
- **No incluye:**
  - CI/CD automático (pipeline de despliegue continuo). Se despliega manualmente / vía skill.
  - Alta disponibilidad, réplicas, balanceo, orquestador (Kubernetes). Un solo host.
  - Backups automáticos gestionados externamente (se documenta el respaldo manual del volumen).
  - Cambios funcionales de la aplicación.

## Requisitos funcionales

- **RF1 — Una sola URL:** `https://<dominio>` sirve el frontend; las llamadas del frontend a
  `/api/v1/**` se reenvían al backend por la red interna. El usuario no ve puertos ni el
  backend directamente.
- **RF2 — HTTPS válido y automático:** Caddy obtiene y renueva el certificado TLS sin
  intervención manual. HTTP redirige a HTTPS.
- **RF3 — Mismo origen (sin CORS):** frontend y API se sirven desde el mismo origen (Caddy),
  eliminando la necesidad de configuración CORS.
- **RF4 — API configurable, no hardcodeada:** el frontend deja de apuntar a
  `http://localhost:8080`; usa una base relativa (`/api/v1`) vía `environment`.
- **RF5 — Persistencia:** los datos de MySQL sobreviven a reinicios y recreación de
  contenedores (volumen con nombre). Flyway aplica `V1`…`V24` en el primer arranque.
- **RF6 — Secretos fuera de las imágenes:** `JWT_SECRET`, `SECOP_APP_TOKEN` y credenciales
  de MySQL se inyectan por entorno; nunca se hornean en la imagen ni se suben a git.
- **RF7 — Base de datos no expuesta:** el puerto de MySQL solo es visible en la red interna
  de Docker; no se publica al exterior.

## Arquitectura de despliegue

```
Navegador  ──https://<dominio>──►  ┌──────────────────────────────┐
                                   │ proxy: Caddy (:80/:443)       │
                                   │  • TLS automático             │
                                   │  • sirve SPA (Angular)        │
                                   │  • /api/v1/* → backend:8080   │
                                   └───────┬──────────────────────┘
                                           │ red interna Docker
                                   ┌───────┴───────┐
                                   ▼               ▼
                          ┌────────────────┐ ┌──────────────────┐
                          │ backend :8080  │→│ db: MySQL :3306   │
                          │ Spring Boot    │ │ volumen datos     │
                          └────────────────┘ └──────────────────┘
```

- **proxy (Caddy):** único servicio con puertos publicados (80/443). El `Caddyfile` define
  el dominio, el reverse proxy a `backend:8080` para `/api/*`, y el `file_server` con
  fallback SPA (`try_files ... /index.html`) para las rutas lazy de Angular.
- **backend:** imagen con el `.jar`; escucha en 8080 solo hacia la red interna; conecta a
  `db:3306`. Depende de que `db` esté sana antes de arrancar (Flyway necesita la BD lista).
- **db:** MySQL 8, con volumen con nombre; sin puerto publicado.

## Cambios en el frontend (repo `licitapp-frontend`)

**Bloqueador actual:** todos los servicios hardcodean `http://localhost:8080/api/v1/...`
(p. ej. `licitaciones.service.ts`, `cuadro-de-obra.service.ts`,
`revision-licitacion.service.ts`, y el resto: empresa, análisis, seguimiento, resultados,
usuarios, auth). En producción ese `localhost` es el equipo del usuario, no el servidor, así
que ninguna llamada funcionaría. Los `// TODO: Mover la URL a un archivo de environment` ya
anticipaban esto.

**Solución:** centralizar la base de la API en `environment` y que todos los servicios la
usen.

```ts
// src/environments/environment.ts (dev)
export const environment = { apiBaseUrl: 'http://localhost:8080/api/v1' };

// src/environments/environment.prod.ts (prod)
export const environment = { apiBaseUrl: '/api/v1' }; // relativa → mismo origen (Caddy)
```

- Cada servicio: `private readonly apiUrl = \`${environment.apiBaseUrl}/<recurso>\`;`
- `angular.json`: `fileReplacements` en la configuración `production` (ya usada por
  `npm run build`) sustituye `environment.ts` por `environment.prod.ts`.
- **Alternativa considerada:** dejar `apiBaseUrl` relativo siempre y usar un
  `proxy.conf.json` del dev-server para reenviar `/api` a `localhost:8080` en desarrollo. Se
  documenta como opción; se decide en implementación.

## Artefactos nuevos

| Archivo | Repo / ubicación | Propósito |
| --- | --- | --- |
| `Dockerfile` | `licitapp/` | Multi-etapa: Maven build → imagen JRE con el `.jar`. |
| `Dockerfile` | `licitapp-frontend/` | Multi-etapa: Node build → export de `dist/` estático. |
| `docker-compose.yml` | (ver "Decisiones abiertas") | Orquesta `db`, `backend`, `proxy`. |
| `Caddyfile` | junto al compose | Dominio, reverse proxy `/api`, SPA fallback, TLS. |
| `.env.example` | junto al compose | Plantilla de secretos (sin valores reales). |
| `.dockerignore` | cada repo | Excluir `node_modules`, `target`, etc. de las imágenes. |

## Guía de adquisición (manual, la hace Diego)

1. **VPS:** DigitalOcean / Hetzner / AWS Lightsail / Contabo. **Mínimo 2 GB RAM** (MySQL +
   JVM). Ubuntu LTS. Instalar Docker Engine + Compose.
2. **Dominio:** registrar en Namecheap / Cloudflare / GoDaddy (o `.co` local).
3. **DNS:** registro **A** del dominio → IP pública del VPS. Esperar propagación.
4. **Firewall:** abrir solo 80 y 443 (y 22 para SSH). No exponer 3306 ni 8080.

## Procedimiento de despliegue (lo automatiza el skill)

1. En el VPS: clonar `licitapp` y `licitapp-frontend`.
2. Crear el `.env` a partir de `.env.example` con secretos reales.
3. `docker compose build` y `docker compose up -d`.
4. Caddy solicita el certificado TLS para el dominio (requiere DNS ya apuntando y 80/443
   abiertos). Verificar `https://<dominio>`.
5. Ver salud/logs: `docker compose ps`, `docker compose logs -f backend`.

## Criterios de aceptación

- **CA1 (RF1/RF2):** `https://<dominio>` carga el frontend con certificado válido; `http://`
  redirige a `https://`.
- **CA2 (RF1/RF3):** El login y las vistas (Licitaciones, Cuadro de Obra, etc.) funcionan
  contra la API sin errores de CORS ni de conexión.
- **CA3 (RF5):** Tras `docker compose down && up -d`, los datos persisten y las migraciones
  no se re-aplican.
- **CA4 (RF6/RF7):** No hay secretos en las imágenes ni en git; MySQL no responde desde
  fuera del host.
- **CA5 (RF4):** El bundle de producción no contiene `http://localhost:8080`.

## Decisiones abiertas (a resolver antes de implementar)

1. **Ubicación del `docker-compose.yml` + `Caddyfile` + `.env.example`:** los repos son
   separados. Opciones: (a) una carpeta/repo nuevo `licitapp-deploy` que referencia ambos
   contextos de build (`../licitapp`, `../licitapp-frontend`); (b) colocarlo en el repo
   backend. **Recomendación:** carpeta de despliegue dedicada (opción a), más limpia.
2. **Proveedor de VPS y dominio concretos:** define costo y pasos exactos de la guía.
3. **Estrategia de `apiBaseUrl` en dev:** `fileReplacements` (recomendado) vs. `proxy.conf.json`.
4. **Versión de MySQL** (8.0 vs 8.4 LTS) y de la imagen base de Java (JRE 21).

## Notas técnicas

- El backend hace llamadas salientes a SECOP II (datos.gov.co); el contenedor necesita
  egreso a internet (por defecto lo tiene). `SECOP_APP_TOKEN` va por entorno.
- `spring.jpa.hibernate.ddl-auto=update` coexiste con Flyway; el esquema real lo definen las
  migraciones. No cambia con este despliegue.
- El skill de despliegue documentará también el **respaldo** del volumen de MySQL
  (`docker compose exec db mysqldump ...`) como parte del procedimiento operativo.
- Mantener convenciones de cada repo; este trabajo es infraestructura, no toca lógica de
  negocio salvo el refactor de `apiBaseUrl` en el frontend (RF4).
```
