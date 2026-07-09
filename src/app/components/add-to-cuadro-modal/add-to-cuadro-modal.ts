import { Component, EventEmitter, Input, OnInit, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Licitacion } from '../../pages/Licitaciones/interface/licitaciones';
import { CuadroDeObraService } from '../../pages/CuadroDeObra/service/cuadro-de-obra.service';
import { CuadroDeObraItem } from '../../pages/CuadroDeObra/interface/cuadro-de-obra';
import { AlertService } from '../../services/alert.service';

@Component({
  selector: 'app-add-to-cuadro-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './add-to-cuadro-modal.html',
})
export class AddToCuadroModal implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly cuadroService = inject(CuadroDeObraService);
  private readonly alertService = inject(AlertService);

  private readonly SMMLV_2026 = 1750905; // Valor SMMLV 2026

  @Input({ required: true }) licitacion!: Licitacion;
  /**
   * Cuando la licitación ya está en el Cuadro de Obra, se recibe el registro guardado
   * para mostrarlo en modo solo lectura (sin permitir agregarlo de nuevo).
   */
  @Input() existente: CuadroDeObraItem | null = null;
  @Input() readonly = false;
  @Output() close = new EventEmitter<void>();
  @Output() saved = new EventEmitter<any>();

  form!: FormGroup;
  loading = false;

  ngOnInit(): void {
    this.initForm();
    this.setupMontoListener();
    this.calculateInitialSMMLV();

    // Modo lectura: precargamos los datos guardados y deshabilitamos el formulario.
    if (this.readonly && this.existente) {
      this.form.patchValue(this.existente, { emitEvent: false });
      this.form.disable({ emitEvent: false });
    }
  }

  private initForm(): void {
    const ubicacionPartes = this.licitacion.ubicacion ? this.licitacion.ubicacion.split(' - ') : ['', ''];
    const depto = ubicacionPartes[0] || '';
    const muni = ubicacionPartes[1] || '';

    this.form = this.fb.group({
      numeroProceso: [this.licitacion.numero, Validators.required],
      entidadContratante: [this.licitacion.entidad, Validators.required],
      descripcionObjeto: [this.licitacion.objeto, Validators.required],
      estadoProceso: [this.licitacion.estado],
      fechaPublicacion: [this.licitacion.fechaPublicacion],
      departamento: [depto],
      municipio: [muni],
      monto: [this.licitacion.cuantia, [Validators.required, Validators.min(0)]],
      fechaCierre: ['', Validators.required],
      valorSMMLV: [{ value: null, disabled: false }, [Validators.required]],
      tipoProyecto: ['', Validators.required],
      experiencia: ['', Validators.required],
      plazo: [null, [Validators.required, Validators.min(0)]],
      anticipo: [null, [Validators.required, Validators.min(0), Validators.max(100)]],
      observacion: [''],
      cuadroDeObraEstado: ['POR_PRESENTAR']
    });
  }

  private setupMontoListener(): void {
    this.form.get('monto')?.valueChanges.subscribe(monto => {
      this.updateSMMLV(monto);
    });
  }

  private calculateInitialSMMLV(): void {
    const initialMonto = this.form.get('monto')?.value;
    if (initialMonto) {
      this.updateSMMLV(initialMonto);
    }
  }

  private updateSMMLV(monto: number): void {
    if (monto && monto > 0) {
      const calculo = monto / this.SMMLV_2026;
      // Redondeamos a 2 decimales para mayor limpieza
      this.form.get('valorSMMLV')?.patchValue(parseFloat(calculo.toFixed(2)), { emitEvent: false });
    } else {
      this.form.get('valorSMMLV')?.patchValue(0, { emitEvent: false });
    }
  }

  /** Formatea un monto como moneda COP con 2 decimales (los montos son decimales). */
  formatCurrency(value: number | string): string {
    if (value === null || value === undefined || value === '') return '';
    const num = typeof value === 'string' ? parseFloat(value.replace(/[^\d.-]/g, '')) : value;
    if (isNaN(num)) return '';
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  }

  /**
   * Al enfocar un monto mostramos el número crudo (sin símbolo ni miles) para que
   * el usuario pueda editar decimales cómodamente. No se toca el modelo mientras
   * escribe: así el binding [value] no sobrescribe lo tecleado.
   */
  onCurrencyFocus(event: Event, controlName: string): void {
    const input = event.target as HTMLInputElement;
    const value = this.form.get(controlName)?.value;
    if (value === null || value === undefined || isNaN(value) || value === 0) {
      input.value = '';
      return;
    }
    input.value = Number(value).toLocaleString('es-CO', {
      useGrouping: false,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
  }

  /**
   * Al salir del campo parseamos permitiendo decimales (coma o punto), guardamos
   * el valor numérico sin redondear y reformateamos como moneda COP. Como el
   * setValue usa emitEvent:false, el listener de SMMLV no se dispara, por eso
   * recalculamos el SMMLV explícitamente al editar el monto.
   */
  onCurrencyBlur(event: Event, controlName: string): void {
    const input = event.target as HTMLInputElement;
    const clean = input.value.replace(/[$\s.]/g, '').replace(',', '.');
    const num = parseFloat(clean);
    const value = isNaN(num) ? 0 : num;
    this.form.get(controlName)?.setValue(value, { emitEvent: false });
    input.value = this.formatCurrency(value);

    if (controlName === 'monto') {
      this.updateSMMLV(value);
    }
  }

  onSubmit(): void {
    // En modo lectura no se permite guardar.
    if (this.readonly) {
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    const rawData = this.form.value;

    this.cuadroService.agregarACuadroDeObra(rawData).subscribe({
      next: (response) => {
        this.loading = false;
        this.saved.emit(response);
        this.close.emit();
      },
      error: (err) => {
        this.loading = false;
        // El backend rechaza duplicados con 409: es el respaldo por si el resaltado
        // no alcanzó a bloquear el clic sobre una licitación ya agregada.
        if (err?.status === 409) {
          this.alertService.warning(
            'Esta licitación ya está registrada en el Cuadro de Obra.',
            'Proceso duplicado',
          );
          this.close.emit();
          return;
        }
        console.error('Error al guardar en Cuadro de Obra:', err);
        this.alertService.error('No se pudo guardar en el Cuadro de Obra. Intenta de nuevo.');
      }
    });
  }
}
