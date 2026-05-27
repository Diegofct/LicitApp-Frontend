import { Component, EventEmitter, Input, OnInit, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Observable, catchError, finalize, of } from 'rxjs';
import { CuadroDeObraService } from '../../pages/CuadroDeObra/service/cuadro-de-obra.service';
import { RequisitoLicitacion } from '../../pages/CuadroDeObra/interface/cuadro-de-obra';
import { AlertService } from '../../services/alert.service';

@Component({
  selector: 'app-requisito-licitacion-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './requisito-licitacion-modal.html',
})
export class RequisitoLicitacionModal implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly cuadroService = inject(CuadroDeObraService);
  private readonly alertService = inject(AlertService);

  @Input({ required: true }) cuadroObraId!: number;
  @Input() monto?: number;
  @Input() initialData?: RequisitoLicitacion;
  @Output() close = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  form!: FormGroup;
  saving = signal(false);
  loadingData = signal(true);
  isEditMode = signal(false);
  private requisitoId: number | null = null;

  ngOnInit(): void {
    this.initForm();
    this.setupCalculos();

    if (this.initialData) {
      this.applyExistingData(this.initialData);
      this.loadingData.set(false);
      return;
    }

    this.cargarRequisitosExistentes();
  }

  private initForm(): void {
    this.form = this.fb.group({
      general: ['', [Validators.required]],
      especifica1: ['', [Validators.required]],
      especifica2: ['', [Validators.required]],
      secundaria: ['', [Validators.required]],
      contrato: [1, [Validators.required, Validators.min(1)]],
      presupuesto: [0, [Validators.required, Validators.min(0)]],
      patrimonio: [0, [Validators.required, Validators.min(0)]],
      capitalTrabajo: [0, [Validators.required, Validators.min(0)]],
      n: [1, [Validators.required, Validators.min(0.1)]],
      liquidez: [0, [Validators.required, Validators.min(0)]],
      endeudamiento: [0, [Validators.required, Validators.min(0)]],
      razonCoberturaInteres: [0, [Validators.required, Validators.min(0)]],
      rentabilidadPatrimonio: [0, [Validators.required, Validators.min(0)]],
      rentabilidadActivo: [0, [Validators.required, Validators.min(0)]],
      kresidualProceso: [{ value: 0, disabled: true }, [Validators.required, Validators.min(0)]],
      poeAnticipo: [0, [Validators.required, Validators.min(0), Validators.max(100)]],
    });
  }

  private cargarRequisitosExistentes(): void {
    this.loadingData.set(true);

    this.cuadroService
      .obtenerRequisitos(this.cuadroObraId)
      .pipe(
        catchError(() => of(null)),
        finalize(() => this.loadingData.set(false)),
      )
      .subscribe((requisitos) => {
        if (requisitos && this.tieneRegistroValido(requisitos)) {
          this.applyExistingData(requisitos);
        } else {
          this.cargarPresupuestoDesdeCuadro();
        }
      });
  }

  private tieneRegistroValido(req: RequisitoLicitacion): boolean {
    return req.id != null;
  }

  private applyExistingData(data: RequisitoLicitacion): void {
    this.isEditMode.set(true);
    this.requisitoId = data.id ?? null;
    this.form.patchValue(data);
    this.calcularCapacidadResidual();
  }

  private cargarPresupuestoDesdeCuadro(): void {
    if (this.monto) {
      this.form.patchValue({ presupuesto: this.monto });
      this.calcularCapacidadResidual();
      return;
    }

    this.cuadroService.obtenerCuadroDeObraPorId(this.cuadroObraId).subscribe({
      next: (cuadro) => {
        this.form.patchValue({ presupuesto: cuadro.monto });
        this.calcularCapacidadResidual();
      },
      error: (err) => console.error('Error al cargar presupuesto:', err),
    });
  }

  private setupCalculos(): void {
    this.form.get('poeAnticipo')?.valueChanges.subscribe(() => this.calcularCapacidadResidual());
    this.form.get('presupuesto')?.valueChanges.subscribe(() => this.calcularCapacidadResidual());
  }

  formatCurrency(value: number | string): string {
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

    this.saving.set(true);
    const formData: RequisitoLicitacion = this.form.getRawValue();
    if (this.requisitoId != null) {
      formData.id = this.requisitoId;
    }

    const request$: Observable<RequisitoLicitacion> = this.isEditMode()
      ? this.cuadroService.actualizarRequisitos(this.cuadroObraId, formData)
      : this.cuadroService.guardarRequisitos(this.cuadroObraId, formData);

    request$.subscribe({
      next: () => {
        this.saving.set(false);
        this.saved.emit();
        this.close.emit();
      },
      error: (err) => {
        this.saving.set(false);
        console.error('Error al guardar requisitos:', err);
        this.alertService.error('Hubo un error al guardar los requisitos de la licitación.');
      },
    });
  }
}
