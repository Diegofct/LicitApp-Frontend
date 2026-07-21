/**
 * Modelo de dominio del módulo de autenticación y autorización.
 * Refleja el contrato del backend (Spring Boot, JWT stateless). NO modificar el contrato.
 */

export type Rol = 'ANALISTA' | 'ADMIN';

/** Cuerpo enviado a POST /auth/login. */
export interface LoginRequest {
  correo: string;
  contrasena: string;
}

/** Respuesta de POST /auth/login (200). */
export interface LoginResponse {
  token: string;
  tipo: string;
  expiraEnSegundos: number;
  usuarioId: number;
  nombre: string;
  correo: string;
  rol: Rol;
}

/** Usuario autenticado. Devuelto por GET /auth/me y GET/POST /usuarios. */
export interface Usuario {
  id: number;
  nombre: string;
  correo: string;
  rol: Rol;
  activo: boolean;
  fechaCreacion?: string;
}

/** Cuerpo enviado a POST /usuarios (solo ADMIN). */
export interface CrearUsuarioRequest {
  nombre: string;
  correo: string;
  contrasena: string;
  rol: Rol;
}

/** Etiqueta legible para cada rol, usada en la UI. */
export const ROL_LABEL: Record<Rol, string> = {
  ANALISTA: 'Analista',
  ADMIN: 'Administrador',
};

/** Cuerpo enviado a PUT /usuarios/{id} (solo ADMIN). La contraseña no se edita aquí. */
export interface ActualizarUsuarioRequest {
  nombre: string;
  correo: string;
  rol: Rol;
}

/** Cuerpo enviado a PATCH /usuarios/{id}/estado (borrado lógico / reactivación). */
export interface CambiarEstadoUsuarioRequest {
  activo: boolean;
}

/** Cuerpo enviado a PATCH /usuarios/{id}/contrasena (nueva clave, mín. 8 caracteres). */
export interface RestablecerContrasenaRequest {
  contrasena: string;
}
