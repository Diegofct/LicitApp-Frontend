/**
 * Representa la estructura estándar de una respuesta paginada desde el backend.
 * @template T El tipo de dato de los elementos en el contenido.
 */
export interface PaginatedResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
}
