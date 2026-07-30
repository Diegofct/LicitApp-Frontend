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

## Specs y skills: qué hace cada una

Una **spec** (`specs/*.md`) es un *contrato de una sola vez*: qué se cambia, hasta
dónde y cómo se acepta. Se escribe, se aprueba, se implementa y se cierra.

Una **skill** (`.claude/skills/<nombre>/SKILL.md`) es *conocimiento reutilizable*: el
cómo se hace bien un tipo de trabajo en este repo. No caduca y no decide alcance.
Claude la carga sola cuando la tarea coincide con su `description`.

| | Spec | Skill |
|---|---|---|
| Responde a | Qué y hasta dónde | Cómo |
| Vigencia | Un ajuste, luego `Implementada` | Permanente |
| Se activa | Porque la citas | Automáticamente, por el contexto |
| Contiene | Alcance, RF, CA, fases | Patrones, checklist, antipatrones |

**Ante conflicto manda la spec**, porque es la que fija el alcance acordado.

Encajan así en el flujo de 4 pasos: la skill aporta el vocabulario técnico al
escribir la **spec** (paso 1) y al ordenar las fases del **plan** (paso 2); guía la
**implementación** (paso 3); y su checklist alimenta los criterios que se validan en
la **verificación** (paso 4).

Skills disponibles:
- `responsive-ui` — adaptar templates a móvil/tablet/desktop sin tocar lógica.
  Contrato asociado: `specs/responsive-global.md`.
