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
      plazo: [this.item.plazo, Validators.required],
      anticipo: [this.item.anticipo, Validators.required],
      observacion: [this.item.observacion || ''],
      cuadroDeObraEstado: [this.item.cuadroDeObraEstado, Validators.required],
    });
  }

  private formatDateForInput(dateStr: string | undefined): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return !isNaN(date.getTime()) ? date.toISOString().slice(0, 16) : '';
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
    this.router.navigate(['/analisis-cumplimiento'], {
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
