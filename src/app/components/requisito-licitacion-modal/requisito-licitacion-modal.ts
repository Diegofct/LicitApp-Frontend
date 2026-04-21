import { Component, EventEmitter, Input, OnInit, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CuadroDeObraService } from '../../pages/CuadroDeObra/service/cuadro-de-obra.service';
import { RequisitoLicitacion } from '../../pages/CuadroDeObra/interface/cuadro-de-obra';

@Component({
  selector: 'app-requisito-licitacion-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './requisito-licitacion-modal.html',
})
export class RequisitoLicitacionModal implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly cuadroService = inject(CuadroDeObraService);

  @Input({ required: true }) cuadroObraId!: number;
  @Input() monto?: number; // Nuevo Input para carga instantánea
  @Input() initialData?: RequisitoLicitacion;
  @Output() close = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  form!: FormGroup;
  loading = false;

  ngOnInit(): void {
    this.initForm();
    this.cargarPresupuesto();
    this.setupCalculos();
  }

  private initForm(): void {
    this.form = this.fb.group({
      // Experiencia
      general: [this.initialData?.general || '', [Validators.required]],
      especifica1: [this.initialData?.especifica1 || '', [Validators.required]],
      especifica2: [this.initialData?.especifica2 || '', [Validators.required]],
      secundaria: [this.initialData?.secundaria || '', [Validators.required]],
      contrato: [this.initialData?.contrato || 1, [Validators.required, Validators.min(1)]],
      // Capital de Trabajo y Patrimonio
      presupuesto: [this.initialData?.presupuesto || 0, [Validators.required, Validators.min(0)]],
      patrimonio: [this.initialData?.patrimonio || 0, [Validators.required, Validators.min(0)]],
      // Indicadores Financieros
      capitalTrabajo: [this.initialData?.capitalTrabajo || 0, [Validators.required, Validators.min(0)]],
      n: [this.initialData?.n || 1, [Validators.required, Validators.min(0.1)]],
      liquidez: [this.initialData?.liquidez || 0, [Validators.required, Validators.min(0)]],
      endeudamiento: [this.initialData?.endeudamiento || 0, [Validators.required, Validators.min(0)]],
      razonCoberturaInteres: [this.initialData?.razonCoberturaInteres || 0, [Validators.required, Validators.min(0)]],
      rentabilidadPatrimonio: [this.initialData?.rentabilidadPatrimonio || 0, [Validators.required, Validators.min(0)]],
      rentabilidadActivo: [this.initialData?.rentabilidadActivo || 0, [Validators.required, Validators.min(0)]],
      // Capacidad Residual y Anticipo
      kresidualProceso: [{ value: this.initialData?.kresidualProceso || 0, disabled: true }, [Validators.required, Validators.min(0)]],
      poeAnticipo: [this.initialData?.poeAnticipo || 0, [Validators.required, Validators.min(0), Validators.max(100)]],
    });
  }

  private cargarPresupuesto(): void {
    if (this.initialData?.presupuesto) {
      this.calcularCapacidadResidual();
    } else if (this.monto) {
      this.form.patchValue({ presupuesto: this.monto });
      this.calcularCapacidadResidual();
    } else {
      this.cuadroService.obtenerCuadroDeObraPorId(this.cuadroObraId).subscribe({
        next: (cuadro) => {
          this.form.patchValue({ presupuesto: cuadro.monto });
          this.calcularCapacidadResidual();
        },
        error: (err) => console.error('Error al cargar presupuesto:', err)
      });
    }
  }

  private setupCalculos(): void {
    this.form.get('poeAnticipo')?.valueChanges.subscribe(() => {
      this.calcularCapacidadResidual();
    });
    // No necesitamos suscribirnos a presupuesto aquí si es readonly, 
    // pero lo mantenemos por si cambia externamente
    this.form.get('presupuesto')?.valueChanges.subscribe(() => {
      this.calcularCapacidadResidual();
    });
  }

  formatCurrency(value: number | string): string {
    if (value === null || value === undefined || value === '') return '';
    const num = typeof value === 'string' ? parseFloat(value.replace(/[^\d.-]/g, '')) : value;
    if (isNaN(num)) return '';
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(num);
  }

  onCurrencyInput(event: any, controlName: string): void {
    let value = event.target.value.replace(/[^\d]/g, '');
    const numValue = value ? parseInt(value, 10) : 0;
    this.form.get(controlName)?.setValue(numValue, { emitEvent: false });
    event.target.value = this.formatCurrency(numValue);
    
    if (controlName === 'presupuesto') this.calcularCapacidadResidual();
  }

  private calcularCapacidadResidual(): void {
    const presupuesto = this.form.get('presupuesto')?.value || 0;
    const poeAnticipo = this.form.get('poeAnticipo')?.value || 0;
    const anticipo = presupuesto * (poeAnticipo / 100);
    const crpc = presupuesto - anticipo;
    
    this.form.get('kresidualProceso')?.setValue(crpc, { emitEvent: false });
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    // Usamos getRawValue para incluir los campos deshabilitados (kresidualProceso)
    const formData: RequisitoLicitacion = this.form.getRawValue();

    this.cuadroService.guardarRequisitos(this.cuadroObraId, formData).subscribe({
      next: () => {
        this.loading = false;
        this.saved.emit();
        this.close.emit();
      },
      error: (err) => {
        this.loading = false;
        console.error('Error al guardar requisitos:', err);
        alert('Hubo un error al guardar los requisitos de la licitación.');
      },
    });
  }
}
