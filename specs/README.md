# Spec-Driven Development (SDD) en LicitApp

Trabajamos cada ajuste o feature escribiendo primero una **especificación** que
funciona como contrato antes de tocar código. Esto lo hace trazable y revisable.

## El flujo (4 pasos)

1. **Spec** — Copia `_template.md` a `specs/<nombre-del-ajuste>.md` y complétala:
   objetivo, requisitos, contratos de datos e interfaces, criterios de aceptación.
2. **Plan** — Pide a Claude un plan (plan mode). Claude lee la spec + el código
   afectado y propone qué archivos crear/modificar. Apruébalo antes de continuar.
3. **Implementación** — Se ejecuta el plan respetando `CLAUDE.md`
   (signals, OnPush, inject, Tailwind, rutas lazy con guards).
4. **Verificación** — `npm test` + validación de los criterios de aceptación.

## Convenciones de las specs
- Un archivo `.md` por ajuste, nombre en kebab-case (p. ej. `filtro-por-estado-secop.md`).
- Estado al inicio: `Borrador` → `Aprobada` → `Implementada`.
- Las interfaces TS de la spec deben coincidir con las de `pages/<Feature>/interface/`.

## Cómo pedírselo a Claude
- "Escribe la spec para <ajuste> en specs/" → genera el borrador.
- "Hazme un plan a partir de specs/<ajuste>.md" → plan de implementación.
- "Implementa specs/<ajuste>.md con el subagente angular-frontend" → ejecución.
