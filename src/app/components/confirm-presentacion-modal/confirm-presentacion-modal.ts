import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  HostListener,
  Input,
  Output,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ConformacionResponse,
  TipoParticipacion,
} from '../../pages/Conformacion/interface/conformacion';

@Component({
  selector: 'app-confirm-presentacion-modal',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './confirm-presentacion-modal.html',
})
export class ConfirmPresentacionModal {
  @Input() conformacion: ConformacionResponse | null = null;
  @Input() cuadroLabel: string = '';
  @Input() loading: boolean = false;
  /** Mensaje opcional cuando el backend rechaza la transición con 400. */
  @Input() errorMessage: string | null = null;

  @Output() confirm = new EventEmitter<void>();
  @Output() definir = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();

  tipoLabel(tipo: TipoParticipacion | undefined): string {
    switch (tipo) {
      case 'INDIVIDUAL':
        return 'Individual';
      case 'CONSORCIO':
        return 'Consorcio';
      case 'UNION_TEMPORAL':
        return 'Unión Temporal';
      default:
        return '';
    }
  }

  tipoIcon(tipo: TipoParticipacion | undefined): string {
    switch (tipo) {
      case 'INDIVIDUAL':
        return 'bx-user';
      case 'CONSORCIO':
        return 'bx-buildings';
      case 'UNION_TEMPORAL':
        return 'bx-link';
      default:
        return 'bx-question-mark';
    }
  }

  iniciales(razonSocial: string): string {
    if (!razonSocial) return '?';
    return razonSocial
      .split(/\s+/)
      .filter((w) => w.length > 0)
      .slice(0, 2)
      .map((w) => w[0].toUpperCase())
      .join('');
  }

  onBackdrop(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.cancel.emit();
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (!this.loading) this.cancel.emit();
  }
}
