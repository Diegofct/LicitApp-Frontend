import { Component, EventEmitter, Input, OnInit, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { CuadroDeObraService } from '../../pages/CuadroDeObra/service/cuadro-de-obra.service';
import { CuadroDeObraItem } from '../../pages/CuadroDeObra/interface/cuadro-de-obra';
import { ConformacionProponenteService } from '../../pages/Conformacion/service/conformacion.service';
import { ConformacionResponse } from '../../pages/Conformacion/interface/conformacion';
import { AlertService } from '../../services/alert.service';
import { ConfirmPresentacionModal } from '../confirm-presentacion-modal/confirm-presentacion-modal';

@Component({
  selector: 'app-edit-cuadro-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ConfirmPresentacionModal],
  templateUrl: './edit-cuadro-modal.html',
})
export class EditCuadroModal implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly cuadroService = inject(CuadroDeObraService);
  private readonly conformacionService = inject(ConformacionProponenteService);
  private readonly alertService = inject(AlertService);
  private readonly router = inject(Router);

  @Input({ required: true }) item!: CuadroDeObraItem;
  @Output() close = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  /** Salario Mínimo Mensual Legal Vigente en Colombia (2026). */
  readonly SMMLV_2026 = 1750905;

  form!: FormGroup;
  loading = false;

  // Estado del modal de confirmación de presentación
  showConfirmPresentacion = signal(false);
  conformacionEncontrada = signal<ConformacionResponse | null>(null);
  presentacionErrorMsg = signal<string | null>(null);
  presentacionLoading = signal(false);

  /** Snapshot del payload listo para PUT cuando el usuario confirme. */
  private pendingPayload: any = null;

  ngOnInit(): void {
    this.initForm();
  }

  private initForm(): void {
    const formattedCierre = this.formatDateForInput(this.item.fechaCierre);
    const formattedPublicacion = this.formatDateForInput(this.item.fechaPublicacion);

    this.form = this.fb.group({
      id: [this.item.id],
      numeroProceso: [this.item.numeroProceso, Validators.required],
      entidadContratante: [this.item.entidadContratante, Validators.required],
      descripcionObjeto: [this.item.descripcionObjeto, Validators.required],
      estadoProceso: [this.item.estadoProceso, Validators.required],
      fechaPublicacion: [formattedPublicacion, Validators.required],
      departamento: [this.item.departamento, Validators.required],
      municipio: [this.item.municipio, Validators.required],
      monto: [this.item.monto, [Validators.required, Validators.min(0)]],
      fechaCierre: [formattedCierre, Validators.required],
      valorSMMLV: [this.item.valorSMMLV, [Validators.required]],
      tipoProyecto: [this.item.tipoProyecto, Validators.required],
      experiencia: [this.item.experiencia, Validators.required],
      plazo: [this.item.plazo, [Validators.required, Validators.min(0)]],
      anticipo: [this.item.anticipo, [Validators.required, Validators.min(0), Validators.max(100)]],
      observacion: [this.item.observacion || ''],
      cuadroDeObraEstado: [this.item.cuadroDeObraEstado, Validators.required],
    });
  }

  private formatDateForInput(dateStr: string | undefined): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return !isNaN(date.getTime()) ? date.toISOString().slice(0, 16) : '';
  }

  /** Formatea un valor numérico como moneda colombiana (sin decimales). */
  formatCurrency(value: number | string | null | undefined): string {
    if (value === null || value === undefined || value === '') return '';
    const num = typeof value === 'string' ? parseFloat(value.replace(/[^\d.-]/g, '')) : value;
    if (isNaN(num)) return '';
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num);
  }

  /** Captura la digitación del presupuesto, lo almacena como número y recalcula el SMMLV. */
  onMontoInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    const digits = target.value.replace(/[^\d]/g, '');
    const numValue = digits ? parseInt(digits, 10) : 0;

    this.form.get('monto')?.setValue(numValue, { emitEvent: false });
    target.value = numValue ? this.formatCurrency(numValue) : '';
    this.calcularSMMLV(numValue);
  }

  /** valorSMMLV = Presupuesto / SMMLV vigente (redondeado a 2 decimales). */
  private calcularSMMLV(monto: number): void {
    const valor = monto && monto > 0 ? parseFloat((monto / this.SMMLV_2026).toFixed(2)) : 0;
    this.form.get('valorSMMLV')?.setValue(valor, { emitEvent: false });
  }

  /** Valor SMMLV formateado para mostrar en el campo calculado. */
  get valorSMMLVFormateado(): string {
    const valor = this.form.get('valorSMMLV')?.value;
    if (!valor) return '0,00';
    return new Intl.NumberFormat('es-CO', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(valor);
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const formData = this.normalizarPayload();
    const estadoOriginal = this.item.cuadroDeObraEstado;
    const estadoNuevo = formData.cuadroDeObraEstado;

    // Intercepción: si transita a PRESENTADO desde otro estado, validar conformación.
    if (estadoNuevo === 'PRESENTADO' && estadoOriginal !== 'PRESENTADO') {
      this.pendingPayload = formData;
      this.verificarConformacionYConfirmar();
      return;
    }

    this.persistir(formData);
  }

  private normalizarPayload(): any {
    const data = { ...this.form.value };
    ['fechaCierre', 'fechaPublicacion'].forEach((field) => {
      if (data[field] && typeof data[field] === 'string' && data[field].length === 16) {
        data[field] += ':00';
      }
    });
    return data;
  }

  private verificarConformacionYConfirmar(): void {
    this.presentacionErrorMsg.set(null);
    this.presentacionLoading.set(true);
    this.conformacionService.obtenerPorCuadroDeObra(this.item.id).subscribe({
      next: (resp) => {
        this.conformacionEncontrada.set(resp);
        this.presentacionLoading.set(false);
        this.showConfirmPresentacion.set(true);
      },
      error: (err: HttpErrorResponse) => {
        this.presentacionLoading.set(false);
        if (err.status === 404) {
          this.conformacionEncontrada.set(null);
          this.showConfirmPresentacion.set(true);
        } else {
          this.alertService.error('No se pudo verificar la conformación del proponente.');
        }
      },
    });
  }

  confirmarPresentacion(): void {
    if (!this.pendingPayload) {
      this.showConfirmPresentacion.set(false);
      return;
    }
    this.presentacionLoading.set(true);
    this.cuadroService.actualizarCuadroDeObra(this.item.id, this.pendingPayload).subscribe({
      next: () => {
        this.presentacionLoading.set(false);
        this.showConfirmPresentacion.set(false);
        this.pendingPayload = null;
        this.alertService.success('El proceso fue marcado como Presentado.');
        this.saved.emit();
        this.close.emit();
      },
      error: (err: HttpErrorResponse) => {
        this.presentacionLoading.set(false);
        if (err.status === 400) {
          const msg =
            err.error?.message ||
            'El servidor rechazó la transición a PRESENTADO. Verifica la conformación del proponente.';
          this.presentacionErrorMsg.set(msg);
          // Si el back devolvió 400 por conformación ausente, forzar vista “sin conformación”.
          this.conformacionEncontrada.set(null);
        } else {
          this.alertService.error('No se pudo actualizar el estado del proceso.');
        }
      },
    });
  }

  cancelarPresentacion(): void {
    if (this.presentacionLoading()) return;
    this.showConfirmPresentacion.set(false);
    this.pendingPayload = null;
    this.presentacionErrorMsg.set(null);
  }

  irADefinirConformacion(): void {
    this.showConfirmPresentacion.set(false);
    this.pendingPayload = null;
    this.close.emit();
    this.router.navigate(['/evaluacion-viabilidad'], {
      queryParams: { cuadroId: this.item.id, conformacion: 1 },
    });
  }

  private persistir(formData: any): void {
    this.loading = true;
    this.cuadroService.actualizarCuadroDeObra(this.item.id, formData).subscribe({
      next: () => {
        this.loading = false;
        this.saved.emit();
        this.close.emit();
      },
      error: (err) => {
        this.manejarError(err, 'en la actualización de datos');
      },
    });
  }

  private manejarError(err: any, contexto: string): void {
    this.loading = false;
    console.error(`Error (${contexto}):`, err);
    let mensaje = 'Hubo un error al procesar la solicitud.';
    if (err.status === 400) {
      mensaje =
        err.error?.message ||
        'Error 400: Los datos enviados no son válidos para el servidor. Revisa los formatos de fecha y campos obligatorios.';
    }
    this.alertService.error(mensaje);
  }

  get cuadroLabel(): string {
    return `${this.item.numeroProceso} — ${this.item.entidadContratante}`;
  }
}
