import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  OnInit,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Sobre2Service } from '../../pages/Sobre2/service/sobre-2.service';
import {
  OferenteProceso,
  OferenteProcesoRequest,
} from '../../pages/Sobre2/interface/sobre-2';
import { AlertService } from '../../services/alert.service';

/**
 * Alta y edición manual de un oferente del Sobre 2.
 *
 * Existe porque ~10% de los procesos no publican ofertas en SECOP y porque el
 * analista necesita corregir a mano lo que la importación trae sucio.
 */
@Component({
  selector: 'app-oferente-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './oferente-modal.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OferenteModal implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly sobre2Service = inject(Sobre2Service);
  private readonly alertService = inject(AlertService);

  /** Cuadro de obra al que pertenece el oferente. */
  readonly cuadroDeObraId = input.required<number>();
  /** Oferente a editar; `null` para alta. */
  readonly oferente = input<OferenteProceso | null>(null);
  /** Presupuesto oficial del proceso: solo para mostrar el % estimado mientras se escribe. */
  readonly presupuestoOficial = input<number>(0);

  readonly close = output<void>();
  readonly saved = output<OferenteProceso>();

  readonly saving = signal(false);
  readonly valorActual = signal<number | null>(null);

  readonly esEdicion = computed(() => this.oferente() !== null);
  /** Los registros de SECOP se sobrescriben en la próxima importación: hay que avisarlo. */
  readonly esDeSecop = computed(() => this.oferente()?.origen === 'SECOP');

  /** % sobre el presupuesto oficial, solo como ayuda visual de captura. */
  readonly porcentajeEstimado = computed<number | null>(() => {
    const presupuesto = this.presupuestoOficial();
    const valor = this.valorActual();
    if (!presupuesto || presupuesto <= 0 || valor === null || valor <= 0) return null;
    return (valor / presupuesto) * 100;
  });

  form!: FormGroup;

  ngOnInit(): void {
    const actual = this.oferente();
    this.form = this.fb.group({
      nombreOferente: this.fb.control<string>(actual?.nombreOferente ?? '', [
        Validators.required,
        Validators.maxLength(500),
      ]),
      nitOferente: this.fb.control<string>(actual?.nitOferente ?? '', [Validators.maxLength(32)]),
      valorOferta: this.fb.control<number | null>(actual?.valorOferta ?? null, [
        Validators.required,
        Validators.min(0.01),
      ]),
      moneda: this.fb.control<string>(actual?.moneda ?? 'COP', [Validators.maxLength(16)]),
      valida: this.fb.control<boolean>(actual?.valida ?? true),
    });

    this.valorActual.set(actual?.valorOferta ?? null);
    this.form.get('valorOferta')!.valueChanges.subscribe((v: number | null) => {
      this.valorActual.set(v === null || Number.isNaN(v) ? null : Number(v));
    });
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

    const raw = this.form.getRawValue();
    const body: OferenteProcesoRequest = {
      nombreOferente: (raw.nombreOferente as string).trim(),
      nitOferente: (raw.nitOferente as string)?.trim() || null,
      valorOferta: Number(raw.valorOferta),
      moneda: (raw.moneda as string)?.trim() || null,
      valida: raw.valida as boolean,
    };

    const actual = this.oferente();
    const peticion = actual
      ? this.sobre2Service.actualizarOferente(actual.id, body)
      : this.sobre2Service.crearOferente(this.cuadroDeObraId(), body);

    this.saving.set(true);
    peticion.subscribe({
      next: (oferente) => {
        this.saving.set(false);
        this.alertService.success(
          actual ? 'Oferente actualizado.' : 'Oferente agregado al proceso.',
        );
        this.saved.emit(oferente);
        this.close.emit();
      },
      error: (err: HttpErrorResponse) => {
        this.saving.set(false);
        this.alertService.error(err.error?.message || 'No se pudo guardar el oferente.');
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
