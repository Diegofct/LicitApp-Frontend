/**
 * Salario mínimo mensual legal vigente, en pesos.
 *
 * Vive aquí y no dentro de un componente porque lo usan tanto el alta de procesos (para
 * calcular el valor en SMMLV de un cuadro) como el filtro de presupuesto de la Búsqueda SECOP.
 * Al cambiar de año se actualiza en este único sitio.
 */
export const SMMLV_VIGENTE = 1750905;
