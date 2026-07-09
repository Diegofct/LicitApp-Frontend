# Spec: <nombre del ajuste>

- **Estado:** Borrador
- **Feature/módulo afectado:** <Empresa | Licitaciones | AnalisisCumplimiento | ...>
- **Autor:** <tu nombre>
- **Fecha:** <YYYY-MM-DD>

## Objetivo
Qué problema resuelve y para qué usuario/rol (ANALISTA, ADMIN, etc.).

## Alcance
- **Incluye:** ...
- **No incluye:** ...

## Requisitos funcionales
- **RF1:** ...
- **RF2:** ...

## Contratos de datos
Interfaces TypeScript involucradas (deben alinearse con `pages/<Feature>/interface/`).

```ts
export interface Ejemplo {
  id: number;
  nombre: string;
}
```

## Endpoints / servicio
- `GET /api/v1/...` → respuesta esperada.
- Método del servicio a crear/usar: `<service>.<metodo>()`.

## UI / UX
- Componentes afectados o nuevos.
- Estados: carga, vacío, error, éxito.
- Notas de diseño (Tailwind, responsivo, accesibilidad).

## Criterios de aceptación (Given / When / Then)
- **CA1:** Dado ... cuando ... entonces ...
- **CA2:** Dado ... cuando ... entonces ...

## Notas técnicas
- Rutas/guards afectados.
- Consideraciones de signals/OnPush.
- Casos borde y validaciones.
