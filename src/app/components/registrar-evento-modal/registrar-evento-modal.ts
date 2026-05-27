import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  HostListener,
  Input,
  OnInit,
  Output,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { SeguimientoService } from '../../pages/Seguimiento/service/seguimiento.service';
import {
  RegistrarEventoRequest,
  SeguimientoEvento,
  TIPO_EVENTO_META,
  TipoEvento,
} from '../../pages/Seguimiento/interface/seguimiento';
import { AlertService } from '../../services/alert.service';

@Component({
  selector: 'app-registrar-evento-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './registrar-evento-modal.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegistrarEventoModal implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly seguimientoService = inject(SeguimientoService);
  private readonly alertService = inject(AlertService);

  @Input({ required: true }) cuadroDeObraId!: number;
  @Output() close = new EventEmitter<void>();
  @Output() saved = new EventEmitter<SeguimientoEvento>();

  readonly saving = signal(false);
  readonly tipoOptions = Object.values(TIPO_EVENTO_META);

  form!: FormGroup;

  readonly tipoActual = signal<TipoEvento | null>(null);
  readonly esOtro = computed(() => this.tipoActual() === 'OTRO');

  ngOnInit(): void {
    const ahora = this.formatNow();
    this.form = this.fb.group({
      tipo: this.fb.control<TipoEvento | null>(null, Validators.required),
      fechaEvento: this.fb.control<string>(ahora, Validators.required),
      descripcion: this.fb.control<string>(''),
      observaciones: this.fb.control<string>(''),
    });

    this.form.get('tipo')!.valueChanges.subscribe((tipo: TipoEvento | null) => {
      this.tipoActual.set(tipo);
      const desc = this.form.get('descripcion')!;
      if (tipo === 'OTRO') {
        desc.setValidators([Validators.required, Validators.minLength(3)]);
      } else {
        desc.clearValidators();
        desc.setValue('');
      }
      desc.updateValueAndValidity();
    });
  }

  private formatNow(): string {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  setTipo(tipo: TipoEvento): void {
    this.form.get('tipo')!.setValue(tipo);
  }

  toneClasses(tono: string, selected: boolean): string {
    const map: Record<string, { bg: string; text: string; ring: string }> = {
      info: { bg: 'bg-blue-50', text: 'text-blue-600', ring: 'ring-blue-200' },
      success: { bg: 'bg-emerald-50', text: 'text-emerald-600', ring: 'ring-emerald-200' },
      warning: { bg: 'bg-amber-50', text: 'text-amber-600', ring: 'ring-amber-200' },
      danger: { bg: 'bg-red-50', text: 'text-red-600', ring: 'ring-red-200' },
      neutral: { bg: 'bg-gray-50', text: 'text-gray-600', ring: 'ring-gray-200' },
    };
    const t = map[tono] || map['neutral'];
    return selected
      ? `border-indigo-500 ring-2 ring-indigo-200 ${t.bg}`
      : `border-gray-100 hover:border-indigo-200`;
  }

  iconColor(tono: string): string {
    const map: Record<string, string> = {
      info: 'bg-blue-100 text-blue-600',
      success: 'bg-emerald-100 text-emerald-600',
      warning: 'bg-amber-100 text-amber-600',
      danger: 'bg-red-100 text-red-600',
      neutral: 'bg-gray-100 text-gray-600',
    };
    return map[tono] || map['neutral'];
  }

  isInvalid(name: string): boolean {
    const ctrl = this.form.get(name);
    return !!ctrl && ctrl.touched && ctrl.invalid;
  }

  guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.value;
    const payload: RegistrarEventoRequest = {
      tipo: raw.tipo,
      fechaEvento: raw.fechaEvento.length === 16 ? `${raw.fechaEvento}:00` : raw.fechaEvento,
      observaciones: raw.observaciones || undefined,
    };
    if (raw.tipo === 'OTRO') {
      payload.descripcion = raw.descripcion;
    }

    this.saving.set(true);
    this.seguimientoService.registrarEvento(this.cuadroDeObraId, payload).subscribe({
      next: (evento) => {
        this.saving.set(false);
        this.alertService.success('Evento registrado en el seguimiento.');
        this.saved.emit(evento);
        this.close.emit();
      },
      error: (err: HttpErrorResponse) => {
        this.saving.set(false);
        const msg = err.error?.message || 'No se pudo registrar el evento.';
        this.alertService.error(msg);
      },
    });
  }

  onBackdrop(event: MouseEvent): void {
    if (event.target === event.currentTarget && !this.saving()) this.close.emit();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (!this.saving()) this.close.emit();
  }
}
