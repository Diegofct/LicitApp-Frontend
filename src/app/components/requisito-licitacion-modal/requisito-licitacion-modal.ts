import { Component, EventEmitter, Input, OnInit, Output, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Observable, catchError, finalize, of } from 'rxjs';
import { CuadroDeObraService } from '../../pages/CuadroDeObra/service/cuadro-de-obra.service';
import { CuadroDeObraItem, RequisitoLicitacion } from '../../pages/CuadroDeObra/interface/cuadro-de-obra';
import { LicitacionesService } from '../../pages/Licitaciones/service/licitaciones.service';
import { DocumentoProceso, formatTamanoDocumento } from '../../pages/Licitaciones/interface/licitaciones';
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
  private readonly licitacionesService = inject(LicitacionesService);
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

  /**
   * Valores que exigen las matrices de indicadores de los pliegos tipo (CCE-EICP-FM-12, -45,
   * -72, -98, -117). Alimentan los datalist como sugerencias, no como catálogo cerrado: una
   * entidad fuera de pliego tipo puede exigir otros.
   *
   * Sustituyen a los antiguos selects en pasos de 0.05, que dejaban fuera los valores reales:
   * ROE y ROA se exigen entre 0,01 y 0,05, y la cobertura de intereses llega a 1,5.
   */
  readonly sugerencias: Record<string, number[]> = {
    liquidez: [1.03, 1.1, 1.19, 1.2, 1.25, 1.3, 1.4],
    endeudamiento: [0.65, 0.7, 0.73, 0.74, 0.75],
    razonCoberturaInteres: [0, 0.5, 1, 1.5, 2, 3],
    rentabilidadPatrimonio: [0, 0.02, 0.03, 0.04, 0.05],
    rentabilidadActivo: [0, 0.01, 0.02, 0.03],
  };

  // Valor del proceso en SMMLV (RF4), tomado del Cuadro de Obra.
  readonly valorSmmlv = signal(0);
  /** (RF4) Rango de Presupuesto Oficial en SMMLV. `null` si no hay valor válido. */
  readonly rangoSmmlv = computed<'RANGO_1' | 'RANGO_2' | null>(() => {
    const v = this.valorSmmlv();
    if (v <= 0) return null;
    return v >= 40000 ? 'RANGO_2' : 'RANGO_1';
  });
  /**
   * Matrices de indicadores publicadas en el proceso. Son la fuente de los valores exigidos:
   * el Documento Base solo trae las fórmulas y remite a la Matriz 2.
   */
  readonly matrices = signal<DocumentoProceso[]>([]);
  readonly cargandoMatrices = signal(false);
  readonly formatTamano = formatTamanoDocumento;

  /** (RF5) Desglose del cálculo del Capital de Trabajo: rama aplicada y n usado. */
  readonly desgloseCapitalTrabajo = signal<{ rama: 'A' | 'B'; n: number | null } | null>(null);

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
      // Solo la experiencia general es obligatoria: se precarga con la que ya se escribió al
      // agregar el proceso al Cuadro de Obra. Las demás quedan para desglosar cuando el
      // pliego lo exija, en vez de forzar a repartir el mismo texto en cuatro campos.
      general: ['', [Validators.required]],
      especifica1: [''],
      especifica2: [''],
      secundaria: [''],
      contrato: [1, [Validators.required, Validators.min(1)]],
      plazo: [null, [Validators.required, Validators.min(0)]], // (RF5) meses, precargado desde el cuadro
      presupuesto: [0, [Validators.required, Validators.min(0)]],
      patrimonio: [0, [Validators.required, Validators.min(0)]],
      // (RF1) Calculado y de solo lectura, como la capacidad residual.
      capitalTrabajo: [{ value: 0, disabled: true }, [Validators.required, Validators.min(0)]],
      // Los topes acotan lo que es fracción por definición (endeudamiento y rentabilidades) y
      // así atrapan el error de digitar 70 en vez de 0,70. La razón de cobertura de intereses
      // no lleva tope: son veces, no fracción, y los pliegos exigen 1,5 o más.
      liquidez: [0, [Validators.required, Validators.min(0), Validators.max(5)]],
      endeudamiento: [0, [Validators.required, Validators.min(0), Validators.max(1)]],
      razonCoberturaInteres: [0, [Validators.required, Validators.min(0)]],
      rentabilidadPatrimonio: [0, [Validators.required, Validators.min(0), Validators.max(1)]],
      rentabilidadActivo: [0, [Validators.required, Validators.min(0), Validators.max(1)]],
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
          this.cargarDatosDesdeCuadro();
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
    this.calcularCapitalTrabajo();
    // (RF4) El valorSMMLV no viene con los requisitos: se toma del Cuadro de Obra.
    this.cargarValorSmmlv();
  }

  /** (RF4) Carga el valor del proceso en SMMLV para derivar el rango informativo. */
  private cargarValorSmmlv(): void {
    this.cuadroService.obtenerCuadroDeObraPorId(this.cuadroObraId).subscribe({
      next: (cuadro) => {
        this.valorSmmlv.set(cuadro.valorSMMLV ?? 0);
        this.cargarMatrices(cuadro);
      },
      error: (err) => console.error('Error al cargar el valor SMMLV del cuadro:', err),
    });
  }

  /**
   * (RF5) Al crear requisitos por primera vez, precarga desde el Cuadro de Obra el
   * presupuesto, el % de anticipo, el plazo (meses) y la experiencia ya digitados para el
   * proceso. La experiencia solo se copia si el campo está vacío, para no pisar lo que el
   * analista haya alcanzado a escribir mientras cargaba el cuadro.
   */
  private cargarDatosDesdeCuadro(): void {
    this.cuadroService.obtenerCuadroDeObraPorId(this.cuadroObraId).subscribe({
      next: (cuadro) => {
        this.valorSmmlv.set(cuadro.valorSMMLV ?? 0); // (RF4)
        this.cargarMatrices(cuadro);
        const generalActual = (this.form.get('general')?.value ?? '').trim();
        this.form.patchValue({
          presupuesto: this.monto ?? cuadro.monto,
          poeAnticipo: cuadro.anticipo ?? 0,
          plazo: cuadro.plazo ?? null,
          ...(generalActual ? {} : { general: cuadro.experiencia ?? '' }),
        });
        this.calcularCapacidadResidual();
        this.calcularCapitalTrabajo();
      },
      error: (err) => console.error('Error al cargar datos del cuadro:', err),
    });
  }

  /**
   * Trae del proceso las matrices de indicadores para tenerlas a un clic mientras se
   * transcriben los valores. Es información de apoyo: si falla, el formulario sigue usable.
   * Los cuadros dados de alta a mano no tienen identificador SECOP y no muestran el bloque.
   */
  private cargarMatrices(cuadro: CuadroDeObraItem): void {
    if (!cuadro.idDelProceso || this.matrices().length > 0) return;

    this.cargandoMatrices.set(true);
    this.licitacionesService.obtenerDocumentosPorProceso(cuadro.idDelProceso).subscribe({
      next: (docs) => {
        this.matrices.set(docs.filter((d) => d.esMatrizIndicadores));
        this.cargandoMatrices.set(false);
      },
      error: (err) => {
        console.error('Error al cargar las matrices de indicadores del proceso:', err);
        this.cargandoMatrices.set(false);
      },
    });
  }

  private setupCalculos(): void {
    // (RF3) El Capital de Trabajo se recalcula al cambiar plazo, presupuesto o % anticipo.
    const recalcular = () => {
      this.calcularCapacidadResidual();
      this.calcularCapitalTrabajo();
    };
    this.form.get('poeAnticipo')?.valueChanges.subscribe(recalcular);
    this.form.get('presupuesto')?.valueChanges.subscribe(recalcular);
    this.form.get('plazo')?.valueChanges.subscribe(() => this.calcularCapitalTrabajo());
  }

  /** (RF2) Meses de apalancamiento (n): 12–24→4, 24–36→8, … (0 si plazo < 12). */
  private mesesApalancamiento(plazo: number): number {
    return plazo < 12 ? 0 : Math.floor(plazo / 12) * 4;
  }

  /**
   * (RF1/RF2/RF5) Calcula el Capital de Trabajo requerido según el plazo del contrato:
   * - Rama A (plazo < 12): (POE − Anticipo) × 33%.
   * - Rama B (plazo ≥ 12): ((POE − Anticipo) / plazo) × n.
   * Escribe el resultado en el control read-only y publica el desglose (rama/n).
   */
  private calcularCapitalTrabajo(): void {
    const presupuesto = this.form.get('presupuesto')?.value || 0;
    const poeAnticipo = this.form.get('poeAnticipo')?.value || 0;
    const plazo = this.form.get('plazo')?.value || 0;
    const anticipo = presupuesto * (poeAnticipo / 100);
    const base = presupuesto - anticipo;

    if (presupuesto <= 0 || plazo <= 0) {
      this.form.get('capitalTrabajo')?.setValue(0, { emitEvent: false });
      this.desgloseCapitalTrabajo.set(null);
      return;
    }

    let ctd: number;
    let rama: 'A' | 'B';
    let n: number | null = null;

    if (plazo < 12) {
      rama = 'A';
      ctd = base * 0.33;
    } else {
      rama = 'B';
      n = this.mesesApalancamiento(plazo);
      ctd = (base / plazo) * n;
    }

    this.form.get('capitalTrabajo')?.setValue(ctd, { emitEvent: false });
    this.desgloseCapitalTrabajo.set({ rama, n });
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
   * el valor numérico sin redondear y reformateamos como moneda COP.
   */
  onCurrencyBlur(event: Event, controlName: string): void {
    const input = event.target as HTMLInputElement;
    const clean = input.value.replace(/[$\s.]/g, '').replace(',', '.');
    const num = parseFloat(clean);
    const value = isNaN(num) ? 0 : num;
    this.form.get(controlName)?.setValue(value, { emitEvent: false });
    input.value = this.formatCurrency(value);

    if (controlName === 'presupuesto') {
      this.calcularCapacidadResidual();
      this.calcularCapitalTrabajo();
    }
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
