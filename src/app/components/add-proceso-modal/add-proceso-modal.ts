import { Component, EventEmitter, OnInit, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CuadroDeObraService } from '../../pages/CuadroDeObra/service/cuadro-de-obra.service';
import { AlertService } from '../../services/alert.service';

@Component({
  selector: 'app-add-proceso-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './add-proceso-modal.html',
})
export class AddProcesoModal implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly cuadroService = inject(CuadroDeObraService);
  private readonly alertService = inject(AlertService);

  /** Salario Mínimo Mensual Legal Vigente en Colombia (2026). */
  readonly SMMLV_2026 = 1750905;

  @Output() close = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  form!: FormGroup;
  loading = false;

  ngOnInit(): void {
    this.initForm();
  }

  private initForm(): void {
    this.form = this.fb.group({
      numeroProceso: ['', Validators.required],
      entidadContratante: ['', Validators.required],
      descripcionObjeto: ['', Validators.required],
      estadoProceso: ['', Validators.required],
      fechaPublicacion: ['', Validators.required],
      fechaCierre: ['', Validators.required],
      monto: [null, [Validators.required, Validators.min(0)]],
      valorSMMLV: [null, [Validators.required, Validators.min(0)]],
      tipoProyecto: ['', Validators.required],
      departamento: ['', Validators.required],
      municipio: ['', Validators.required],
      experiencia: ['', Validators.required],
      plazo: [null, [Validators.required, Validators.min(0)]],
      anticipo: [null, [Validators.required, Validators.min(0), Validators.max(100)]],
      observacion: [''],
      cuadroDeObraEstado: ['POR_PRESENTAR', Validators.required]
    });
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

    this.loading = true;
    const formData = { ...this.form.value };
    
    // Formatear fechas para el backend (ISO con segundos)
    if (formData.fechaCierre && formData.fechaCierre.length === 16) {
      formData.fechaCierre += ':00';
    }
    if (formData.fechaPublicacion && formData.fechaPublicacion.length === 16) {
      formData.fechaPublicacion += ':00';
    }

    this.cuadroService.agregarACuadroDeObra(formData).subscribe({
      next: () => {
        this.loading = false;
        this.saved.emit();
        this.close.emit();
      },
      error: (err) => {
        this.loading = false;
        console.error('Error al agregar proceso:', err);
        this.alertService.error('Hubo un error al intentar guardar el proceso. Revisa que todos los campos obligatorios estén llenos.');
      }
    });
  }
}
