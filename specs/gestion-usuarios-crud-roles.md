# Spec: Gestión de usuarios — editar, desactivar, restablecer contraseña y simplificar roles

- **Estado:** Implementada
- **Feature/módulo afectado:** Seguridad / Usuarios (frontend `licitapp-frontend` + backend `licitapp`)
- **Autor:** Diego
- **Fecha:** 2026-07-09

## Objetivo
Hoy el módulo de gestión de usuarios (solo accesible por ADMIN) permite **crear** y
**listar** usuarios, pero no editarlos, desactivarlos ni restablecer su contraseña.
Además el sistema define tres roles (ANALISTA, PROPIETARIO, ADMIN) cuando el negocio
solo necesita dos. Este ajuste completa el CRUD de usuarios y simplifica el modelo de
roles a **ANALISTA** y **ADMIN**, eliminando **PROPIETARIO**.

Todas estas operaciones las ejecuta únicamente un usuario **ADMIN** (la autorización ya
está centralizada en `SecurityConfig` con el matcher `/usuarios/**` → `hasRole("ADMIN")`).

## Alcance
- **Incluye (frontend):**
  - Editar un usuario (nombre, correo, rol).
  - Desactivar / reactivar un usuario (borrado lógico sobre el campo `activo`).
  - Restablecer la contraseña de un usuario (el ADMIN escribe la nueva clave).
  - Quitar `PROPIETARIO` del tipo `Rol`, etiquetas, badges, sidebar, header y lógica de sesión.
- **Incluye (backend `licitapp`):**
  - Endpoints `PUT /usuarios/{id}`, `PATCH /usuarios/{id}/estado`, `PATCH /usuarios/{id}/contrasena`.
  - Quitar `PROPIETARIO` del enum `Rol`, del javadoc y de `SecurityConfig`.
  - Migración Flyway que convierte los usuarios `PROPIETARIO` existentes en `ANALISTA`.
- **No incluye:**
  - Auto-registro público ni recuperación de contraseña por correo (no hay servicio de mail).
  - Borrado físico de usuarios (se usa borrado lógico con `activo`).
  - Cambiar la ruta `/usuarios` ni el hecho de que sea solo-ADMIN.
  - Auditoría/bitácora de cambios (fuera de alcance; el backend ya sella `fechaActualizacion`).

## Decisiones (confirmadas con el usuario)
1. **Restablecer contraseña:** el ADMIN escribe la nueva contraseña (con confirmación en
   la UI, mínimo 8 caracteres). No se generan claves temporales.
2. **Eliminar = desactivar (borrado lógico):** "eliminar" pone `activo=false`; el login ya
   rechaza usuarios inactivos (`AutenticacionService`). Se añade también **reactivar**.
3. **PROPIETARIO:** los usuarios existentes con ese rol se migran a `ANALISTA` mediante
   una migración Flyway (no-op si no existe ninguno).

## Requisitos funcionales

### Roles
- **RF1:** El sistema solo reconoce dos roles: `ANALISTA` y `ADMIN`. Toda referencia a
  `PROPIETARIO` se elimina en frontend y backend.
- **RF2:** Una migración Flyway (`V19`) ejecuta `UPDATE usuarios SET rol='ANALISTA' WHERE rol='PROPIETARIO'`
  para no dejar filas con un rol inexistente en el enum.

### Editar usuario
- **RF3:** Desde la tabla de usuarios, el ADMIN puede abrir un modal de edición para
  cambiar **nombre**, **correo** y **rol** de un usuario. La contraseña **no** se edita aquí.
- **RF4:** El backend expone `PUT /usuarios/{id}` que actualiza nombre, correo y rol.
  Si el nuevo correo ya pertenece a **otro** usuario → `409` (`CorreoYaRegistradoException`).
  Si el id no existe → `404`.

### Desactivar / reactivar
- **RF5:** Desde la tabla, el ADMIN puede **desactivar** un usuario activo y **reactivar**
  uno inactivo. La columna "Estado" refleja el cambio.
- **RF6:** El backend expone `PATCH /usuarios/{id}/estado` con cuerpo `{ "activo": boolean }`.
  Un usuario desactivado no puede iniciar sesión (comportamiento ya existente).

### Restablecer contraseña
- **RF7:** Desde la tabla, el ADMIN puede abrir un modal "Restablecer contraseña" que pide
  la nueva contraseña y su confirmación (mín. 8 caracteres, ambas deben coincidir).
- **RF8:** El backend expone `PATCH /usuarios/{id}/contrasena` con cuerpo `{ "contrasena": string }`
  (mín. 8). Rehashea con BCrypt y actualiza `fechaActualizacion`. Nunca devuelve el hash.

### Salvaguardas (evitar que el ADMIN se bloquee a sí mismo)
- **RF9:** El backend impide que un ADMIN **se desactive a sí mismo** o **cambie su propio rol**
  a ANALISTA (evita el auto-bloqueo). Devuelve `400` con mensaje claro.
- **RF10:** El backend impide **desactivar o degradar al último ADMIN activo** (siempre debe
  quedar al menos un ADMIN activo). Devuelve `400` con mensaje claro.
- **RF11 (frontend):** La UI oculta/deshabilita las acciones de "desactivar" y de degradar rol
  sobre la fila del propio usuario autenticado, y muestra el mensaje del backend si igual se intenta.

## Contratos de datos
Interfaces TypeScript en `src/app/auth/interface/auth.ts`.

```ts
// Rol pasa de 3 a 2 valores
export type Rol = 'ANALISTA' | 'ADMIN';

export const ROL_LABEL: Record<Rol, string> = {
  ANALISTA: 'Analista',
  ADMIN: 'Administrador',
};

// Nuevo: edición (sin contraseña)
export interface ActualizarUsuarioRequest {
  nombre: string;
  correo: string;
  rol: Rol;
}

// Nuevo: cambio de estado
export interface CambiarEstadoUsuarioRequest {
  activo: boolean;
}

// Nuevo: restablecer contraseña
export interface RestablecerContrasenaRequest {
  contrasena: string;
}
```

El DTO de respuesta (`Usuario`) no cambia: `{ id, nombre, correo, rol, activo, fechaCreacion? }`.

## Endpoints / servicio

### Backend (`licitapp`, context-path `/api/v1`)
| Método | Ruta | Cuerpo | Respuesta | Errores |
| --- | --- | --- | --- | --- |
| PUT | `/usuarios/{id}` | `{ nombre, correo, rol }` | `200` `UsuarioResponseDTO` | `404` no existe · `409` correo de otro · `400` RF9/RF10 |
| PATCH | `/usuarios/{id}/estado` | `{ activo }` | `200` `UsuarioResponseDTO` | `404` · `400` RF9/RF10 |
| PATCH | `/usuarios/{id}/contrasena` | `{ contrasena }` (min 8) | `204` No Content | `404` · `400` validación |

Se amplía el puerto de entrada `RegistrarUsuarioUseCase` (o se renombra conceptualmente a
gestión) con: `actualizar(id, nombre, correo, rol, correoSolicitante)`,
`cambiarEstado(id, activo, correoSolicitante)`, `restablecerContrasena(id, nuevaContrasena)`.
El `correoSolicitante` (de `Authentication.getName()`) permite aplicar RF9. RF10 se valida
consultando cuántos ADMIN activos quedan (`UsuarioRepositoryPort`).

### Frontend (`usuario.service.ts`)
- `actualizarUsuario(id, body): Observable<Usuario>` → `PUT /usuarios/{id}`
- `cambiarEstado(id, activo): Observable<Usuario>` → `PATCH /usuarios/{id}/estado`
- `restablecerContrasena(id, contrasena): Observable<void>` → `PATCH /usuarios/{id}/contrasena`

## UI / UX
- **Componente:** `pages/Usuarios/usuarios.ts` + `usuarios.html` (standalone, OnPush, signals).
- **Tabla:** nueva columna **"Acciones"** al final de cada fila con botones-ícono:
  - `bx-edit` Editar · `bx-key` Restablecer contraseña · `bx-user-check`/`bx-user-x`
    Reactivar/Desactivar (según estado). Se ocultan las acciones peligrosas sobre la fila propia (RF11).
- **Modal editar:** reutiliza el diseño del modal de creación pero sin campo contraseña;
  precarga nombre/correo/rol; título "Editar usuario".
- **Modal restablecer contraseña:** dos campos (nueva + confirmar) con toggle de visibilidad;
  valida coincidencia y longitud; título "Restablecer contraseña" + correo del usuario.
- **Desactivar/Reactivar:** confirmación con `AlertService` antes de ejecutar; refresca la lista.
- **Estados:** carga (spinner ya existente), guardando (botón con spinner), error (banner rojo
  reutilizando `formError`), éxito (`AlertService.success`).
- **Roles en selects:** el `@for` de roles ahora solo pinta ANALISTA y ADMIN.
- Diseño Tailwind consistente con el modal actual; íconos boxicons; responsivo.

## Criterios de aceptación (Given / When / Then)
- **CA1:** Dado un ADMIN en `/usuarios`, cuando edita el nombre/correo/rol de un usuario y
  guarda, entonces la fila se actualiza y se muestra "Usuario actualizado".
- **CA2:** Dado un ADMIN que edita un correo que ya usa otro usuario, cuando guarda, entonces
  ve el mensaje "Ese correo ya está registrado" (backend `409`) y no se altera la fila.
- **CA3:** Dado un usuario activo, cuando el ADMIN lo desactiva, entonces su estado pasa a
  "Inactivo" y ese usuario ya no puede iniciar sesión.
- **CA4:** Dado un usuario inactivo, cuando el ADMIN lo reactiva, entonces vuelve a "Activo"
  y puede iniciar sesión.
- **CA5:** Dado un ADMIN, cuando restablece la contraseña de un usuario con una clave válida
  (≥8, coincide con la confirmación), entonces ese usuario puede entrar con la nueva clave.
- **CA6:** Dado el modal de restablecer, cuando las dos contraseñas no coinciden o miden <8,
  entonces el botón queda deshabilitado / se muestra el error y no se llama al backend.
- **CA7:** Dado el único ADMIN activo, cuando intenta desactivarse o cambiarse a ANALISTA,
  entonces el backend responde `400` y la operación no se realiza (RF9/RF10); la UI ya ocultó
  esas acciones sobre su propia fila.
- **CA8:** Dado cualquier formulario/selección de rol, cuando se listan los roles disponibles,
  entonces solo aparecen "Analista" y "Administrador" (no "Propietario").
- **CA9:** Dada la migración `V19`, cuando arranca el backend con usuarios PROPIETARIO previos,
  entonces todos quedan como ANALISTA y el enum ya no contiene PROPIETARIO.
- **CA10:** El proyecto frontend compila (`npm run build`) y el backend compila
  (`.\mvnw.cmd clean compile`) sin errores.

## Notas técnicas
- **Frontend afectado además de Usuarios:**
  - `auth/interface/auth.ts` (tipo `Rol`, `ROL_LABEL`, nuevas interfaces).
  - `auth/service/auth.service.ts`: `puedeEscribir` (ya no excluye PROPIETARIO → todos los
    roles autenticados escriben) y `rutaInicial` (elimina la rama PROPIETARIO → siempre
    `/busqueda-secop`).
  - `components/sidebar/sidebar.component.ts`: quitar PROPIETARIO de los `roles` de
    "Seguimiento" y "Resultados" → `['ANALISTA','ADMIN']`.
  - `components/header/header.component.ts`: quitar `PROPIETARIO` de `ROL_BADGE`.
- **Backend afectado además de Usuarios:**
  - `Seguridad/domain/enums/Rol.java` (quitar valor + javadoc).
  - `Seguridad/infrastructure/config/SecurityConfig.java`: quitar los matchers GET que daban
    acceso a PROPIETARIO (los de `/resultados/**` y `/seguimientos/**`); ANALISTA/ADMIN ya
    tienen acceso por el matcher operativo, así que esas líneas quedan redundantes.
  - Nuevos: `ActualizarUsuarioRequestDTO`, `CambiarEstadoRequestDTO`, `RestablecerContrasenaRequestDTO`;
    ampliar `UsuarioController`, el use case y `RegistroUsuarioService`; usar `HashContrasenaPort`
    para el rehash. Reusar `CorreoYaRegistradoException` y `ResourceNotFoundException`.
  - Migración `db/migration/V19__migrar_rol_propietario_a_analista.sql`.
- **Signals/OnPush:** el estado de modales y usuario en edición se maneja con `signal()`;
  la lista se recarga con `.set()` (nuevas referencias), respetando OnPush.
- **Casos borde:** correo se normaliza (trim+lowercase) en backend como en creación; editar un
  usuario a su mismo correo no debe dar 409 (comparar contra otros ids); último ADMIN activo (RF10).
- **Verificación:** `npm run build` (frontend) y `.\mvnw.cmd clean compile` (backend); prueba
  manual autenticada como ADMIN con el backend + MySQL arriba (SDD: verificación).
