# LicitApp Frontend

SPA para la gestión de procesos de licitación (SECOP): búsqueda, análisis de
cumplimiento, cuadro de obra, conformación de consorcios, seguimiento y resultados, gestion de empresas

**Stack:** Angular 21 · TailwindCSS v4 · RxJS 7 · Vitest · TypeScript 5.9

## Comandos

| Acción | Comando |
| --- | --- |
| Servir en dev | `npm start` (ng serve -o) |
| Build de producción | `npm run build` |
| Build en watch (dev) | `npm run watch` |
| Tests | `npm test` (Vitest) |

## Estructura del proyecto

Organización **por feature** dentro de `src/app/`:

```
pages/<Feature>/
  interface/<feature>.ts     # tipos e interfaces o modelos del dominio
  service/<feature>.service.ts
  <componente>/<componente>.ts + .html
components/    # componentes reutilizables (modales, tabla, paginación, tabs…)
auth/          # guard, interceptor, interface y service de autenticación
layout/        # shell principal
services/      # servicios transversales (alert, etc.)
```

## Convenciones OBLIGATORIAS

### Componentes
- `standalone: true` siempre (no usamos NgModules).
- `ChangeDetectionStrategy.OnPush` en todos los componentes.
- Importa explícitamente lo que uses en `imports: [...]`.
- Plantilla en archivo `.html` separado (`templateUrl`), no inline.

### Estado y reactividad
- Estado de UI con **signals**: `signal()` para estado, `computed()` para derivados.
- No uses `BehaviorSubject`/`Subject` para estado de vista.
- No mutes objetos/arrays dentro de un signal: crea nuevas referencias (`.set()` / `.update()`), respeta OnPush.

### Inyección de dependencias
- Usa `inject()`, **nunca** inyección por constructor.
- Campos de dependencias como `private readonly`.

### Servicios y HTTP
- `@Injectable({ providedIn: 'root' })`.
- Devuelven `Observable<T>`, usan `HttpClient` vía `inject()`.
- La `apiUrl` base se define como `private readonly` en el servicio.
- Documenta cada método público con JSDoc (objetivo, params, errores HTTP relevantes).

### Rutas
- Siempre lazy con `loadComponent: () => import(...)`.
- Protege con guards: `authGuard`, `roleGuard([...roles])`, `loginGuard`.
- Roles operativos de escritura: `['ANALISTA', 'ADMIN']`.

### Estilos
- **TailwindCSS v4**: clases utilitarias en el template.
- Evita CSS suelto; úsalo solo para casos que Tailwind no cubra.
- Íconos con `boxicons`.

### Formato (Prettier)
- `printWidth: 100`, comillas simples. Plantillas HTML con parser `angular`.

## No hagas
- No introducir NgModules ni módulos legados.
- No usar `any` (tipa con las interfaces del feature).
- No romper OnPush con mutaciones directas de estado.
- No hardcodear URLs fuera del servicio correspondiente.

## Flujo de trabajo: SDD (Spec-Driven Development)
Para cada ajuste/feature seguimos: **spec → plan → implementación → verificación**.
Ver `specs/README.md`. Antes de programar un cambio no trivial, revisa/crea su spec
en `specs/` y confirma el plan.
