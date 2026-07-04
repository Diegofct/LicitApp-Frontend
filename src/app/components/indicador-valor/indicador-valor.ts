import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EstadoIndicador } from '../../pages/Empresa/interface/empresa';

interface BadgeConfig {
  texto: string;
  clases: string;
  tooltip: string;
}

/**
 * Renderiza un indicador financiero del RUP respetando su estado:
 *
 * - CALCULABLE (o estado ausente con valor presente): muestra el número
 *   formateado con DecimalPipe usando `format` (por defecto '1.2-2'), sin
 *   alterar el formato numérico actual del proyecto.
 * - Cualquier estado indeterminado: muestra un badge Tailwind con la etiqueta
 *   correspondiente y un tooltip explicativo en vez del número.
 *
 * Pensado para los 5 ratios que ahora pueden venir `null`
 * (liquidez, endeudamiento, razonCoberturaInteres, rentabilidadActivo,
 * rentabilidadPatrimonio). Las magnitudes sin estado (capitalTrabajo,
 * patrimonio) no necesitan este componente.
 */
@Component({
  selector: 'app-indicador-valor',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (esCalculable()) {
      <span>{{ valor | number: format }}</span>
    } @else {
      <span
        class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
        [class]="badge().clases"
        [title]="tooltip || badge().tooltip"
      >
        {{ badge().texto }}
      </span>
    }
  `,
})
export class IndicadorValorComponent {
  /** Valor numérico del ratio. `null`/`undefined` cuando es indeterminado. */
  @Input() valor: number | null | undefined = null;
  /** Estado hermano del ratio. Si falta, se infiere por presencia de `valor`. */
  @Input() estado?: EstadoIndicador;
  /** Formato DecimalPipe para el caso calculable. */
  @Input() format = '1.2-2';
  /** Tooltip opcional que reemplaza el genérico del estado (p.ej. específico del indicador). */
  @Input() tooltip?: string;

  /** Configuración de badge por cada estado indeterminado. */
  private static readonly BADGES: Record<
    Exclude<EstadoIndicador, 'CALCULABLE'>,
    BadgeConfig
  > = {
    INDETERMINADO_FAVORABLE: {
      texto: 'N.A. — Cumple',
      clases: 'bg-green-100 text-green-800 ring-1 ring-green-200',
      tooltip: 'No aplica: el indicador no es evaluable, pero la empresa cumple.',
    },
    INDETERMINADO_A_VERIFICAR: {
      texto: 'Requiere verificación',
      clases: 'bg-amber-100 text-amber-800 ring-1 ring-amber-200',
      tooltip: 'Indeterminado: este indicador requiere verificación manual.',
    },
    DATO_FALTANTE: {
      texto: 'Dato faltante',
      clases: 'bg-gray-100 text-gray-700 ring-1 ring-gray-200',
      tooltip: 'Faltó un insumo del cálculo para determinar este indicador.',
    },
  };

  /** Hay número real que mostrar (estado calculable o legado sin estado). */
  esCalculable(): boolean {
    if (this.estado) return this.estado === 'CALCULABLE';
    // Compatibilidad con datos previos sin campo de estado.
    return this.valor !== null && this.valor !== undefined;
  }

  /** Badge a renderizar cuando el indicador es indeterminado. */
  badge(): BadgeConfig {
    const estado = this.estado;
    if (estado && estado !== 'CALCULABLE') {
      return IndicadorValorComponent.BADGES[estado];
    }
    // Sin estado y sin valor: tratamos como dato faltante.
    return IndicadorValorComponent.BADGES.DATO_FALTANTE;
  }
}
