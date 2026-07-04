import { Component, OnInit, inject, signal, ChangeDetectionStrategy, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { EmpresaService } from '../service/empresa.service';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  Empresa,
  IndicadoresFinancieros,
  Experiencia,
  CapacidadResidual,
  RupExtraido,
  CierreFiscalExtraido,
} from '../interface/empresa';
import { Tabs, Tab } from '../../../components/tabs/tabs';
import { IndicadorValorComponent } from '../../../components/indicador-valor/indicador-valor';
import { debounceTime, distinctUntilChanged, switchMap, catchError } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { of } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';

type TamanoEmpresa = Empresa['tamanoEmpresa'];
const TAMANOS_VALIDOS: TamanoEmpresa[] = ['GRANDE', 'MEDIANA', 'PEQUEÑA', 'MICROEMPRESA'];
type RupUploadEstado = 'idle' | 'extracting' | 'error';

@Component({
  selector: 'app-empresa-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, Tabs, RouterLink, IndicadorValorComponent],
  templateUrl: './empresa-form.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmpresaFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly empresaService = inject(EmpresaService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  // --- CONFIGURACIÓN DE PESTAÑAS ---
  tabs: Tab[] = [
    { id: 'general', label: 'Información General', icon: 'bx bx-info-circle' },
    { id: 'financiero', label: 'Datos Financieros (RUP)', icon: 'bx bx-stats' },
    { id: 'experiencia', label: 'Experiencia (Contratos)', icon: 'bx bx-briefcase' },
    { id: 'capacidad', label: 'Capacidad Residual Proponente', icon: 'bx bx-calculator' },
  ];
  activeTabId = signal('general');

  // --- ESTADO ---
  isEditMode = signal(false);
  loading = signal(false);
  calculatingIndicadores = signal(false);
  calculatingCapacidad = signal(false);
  empresaNit = signal<string | null>(null);
  empresaId = signal<number | null>(null);

  // --- EXTRACCIÓN POR IA (RUP) ---
  rupEstado = signal<RupUploadEstado>('idle');
  isDragging = signal(false);
  archivoNombre = signal<string | null>(null);
  rupCargado = signal(false);
  rupError = signal<{ mensaje: string; reintentable: boolean } | null>(null);
  advertenciasIA = signal<string[]>([]);
  cierresExtraidos = signal<CierreFiscalExtraido[]>([]);
  cierreCargado = signal<number | null>(null);
  /** Rutas de controles precargados por la IA y aún sin validar por el usuario. */
  private camposIA = signal<Set<string>>(new Set());
  /** Último archivo subido, para permitir reintentar tras un error 500. */
  private ultimoArchivo: File | null = null;

  // --- FORMULARIO ---
  empresaForm: FormGroup = this.fb.group({
    nit: ['', [Validators.required, Validators.pattern('^[0-9]+$')]],
    razonSocial: ['', Validators.required],
    direccion: ['', Validators.required],
    telefono: ['', Validators.required],
    correo: ['', [Validators.required, Validators.email]],
    numeroProponenteCcb: ['', Validators.required],
    tamanoEmpresa: ['MICROEMPRESA', Validators.required],
    mipyme: [false],
    proponenteMujer: [false],
    representanteLegal: ['', Validators.required],
    identificacionRepresentanteLegal: ['', Validators.required],
    fechaInscripcion: ['', Validators.required],
    fechaUltimaRenovacion: ['', Validators.required],
    
    // Grupo de Indicadores Financieros
    indicadores: this.fb.group({
      anioCierre: [new Date().getFullYear() - 1, [Validators.required, Validators.min(2000)]],
      activoCorriente: [0, [Validators.required, Validators.min(0)]],
      pasivoCorriente: [0, [Validators.required, Validators.min(0)]],
      activoTotal: [0, [Validators.required, Validators.min(0)]],
      pasivoTotal: [0, [Validators.required, Validators.min(0)]],
      patrimonio: [0, [Validators.required]],
      utilidadOperacional: [0, [Validators.required]],
      gastosInteres: [0, [Validators.required, Validators.min(0)]],
    }),

    // Grupo de Capacidad Residual
    capacidadResidual: this.fb.group({
      capacidadOrganizacion: [0, [Validators.required, Validators.min(0)]],
      experiencia: [0, [Validators.required, Validators.min(0)]],
      capacidadTecnica: [0, [Validators.required, Validators.min(0)]],
      capacidadFinanciera: [0, [Validators.required, Validators.min(0)]],
      saldosContratosEjecucion: [0, [Validators.required, Validators.min(0)]],
      resultadoCapacidadResidualProponente: [0]
    }),

    // Arreglo de Experiencias
    experiencias: this.fb.array([])
  });

  // --- GETTERS PARA FORM ARRAY ---
  get experiencias() {
    return this.empresaForm.get('experiencias') as FormArray;
  }

  // --- INDICADORES CALCULADOS (SIGNALS) ---
  indicadoresCalculados = signal<IndicadoresFinancieros | null>(null);
  capacidadCalculada = signal<CapacidadResidual | null>(null);

  ngOnInit(): void {
    this.setupIndicadoresListener();
    this.setupCapacidadListener();
    
    const nit = this.route.snapshot.paramMap.get('nit');
    if (nit) {
      this.isEditMode.set(true);
      this.empresaNit.set(nit);
      this.cargarEmpresa(nit);
    } else {
      // Agregar una fila inicial de experiencia
      this.agregarExperiencia();
    }
  }

  private setupIndicadoresListener(): void {
    this.empresaForm
      .get('indicadores')
      ?.valueChanges.pipe(
        debounceTime(500),
        distinctUntilChanged((prev, curr) => JSON.stringify(prev) === JSON.stringify(curr)),
        switchMap((values) => {
          this.calculatingIndicadores.set(true);
          return this.empresaService.calcularIndicadores(values).pipe(
            catchError((err) => {
              console.error('Error al calcular indicadores:', err);
              this.calculatingIndicadores.set(false);
              return of(null);
            })
          );
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (res) => {
          if (res) {
            this.indicadoresCalculados.set(res);
          }
          this.calculatingIndicadores.set(false);
        },
      });
  }

  private setupCapacidadListener(): void {
    this.empresaForm
      .get('capacidadResidual')
      ?.valueChanges.pipe(
        debounceTime(500),
        distinctUntilChanged((prev, curr) => {
          // Comparamos solo los valores de entrada, ignorando el resultado calculado
          const { resultadoCapacidadResidualProponente: pRes, ...pRest } = prev;
          const { resultadoCapacidadResidualProponente: cRes, ...cRest } = curr;
          return JSON.stringify(pRest) === JSON.stringify(cRest);
        }),
        switchMap((values) => {
          this.calculatingCapacidad.set(true);
          // Quitamos el resultado para el envío al backend
          const { resultadoCapacidadResidualProponente, ...data } = values;
          // Preview en vivo: no depende del id de la empresa, sirve igual en creación y edición
          return this.empresaService.previewCapacidadResidual(data).pipe(
            catchError((err) => {
              console.error('Error al calcular capacidad residual:', err);
              this.calculatingCapacidad.set(false);
              return of(null);
            })
          );
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (res) => {
          if (res) {
            this.capacidadCalculada.set(res);
            // Actualizar el campo resultado en el form sin disparar un nuevo evento
            this.empresaForm
              .get('capacidadResidual.resultadoCapacidadResidualProponente')
              ?.setValue(res.resultadoCapacidadResidualProponente, { emitEvent: false });
          }
          this.calculatingCapacidad.set(false);
        },
      });
  }

  cargarEmpresa(nit: string): void {
    this.loading.set(true);
    this.empresaService.obtenerEmpresaPorNit(nit).subscribe({
      next: (empresa) => {
        // Guardamos el id para poder llamar a endpoints anidados como /empresas/{id}/capacidad-residual
        if (empresa.id != null) {
          this.empresaId.set(empresa.id);
        }
        this.empresaForm.patchValue({
          nit: empresa.nit,
          razonSocial: empresa.razonSocial,
          direccion: empresa.direccion,
          telefono: empresa.telefono,
          correo: empresa.correo,
          numeroProponenteCcb: empresa.numeroProponenteCcb,
          tamanoEmpresa: empresa.tamanoEmpresa,
          mipyme: empresa.mipyme ?? false,
          proponenteMujer: empresa.proponenteMujer ?? false,
          representanteLegal: empresa.representanteLegal,
          identificacionRepresentanteLegal: empresa.identificacionRepresentanteLegal,
          fechaInscripcion: empresa.fechaInscripcion,
          fechaUltimaRenovacion: empresa.fechaUltimaRenovacion,
          indicadores: empresa.indicadores || {},
          capacidadResidual: empresa.capacidadResidual || {},
        });

        if (empresa.indicadores) {
          this.indicadoresCalculados.set(empresa.indicadores);
        }

        if (empresa.capacidadResidual) {
          this.capacidadCalculada.set(empresa.capacidadResidual);
        }

        // Limpiar y cargar experiencias
        this.experiencias.clear();
        empresa.experiencias?.forEach((exp) => this.agregarExperiencia(exp));

        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error al cargar empresa:', err);
        this.loading.set(false);
      },
    });
  }

  agregarExperiencia(data?: Experiencia): void {
    const expGroup = this.fb.group({
      contratista: [data?.contratista || '', Validators.required],
      entidadContratante: [data?.entidadContratante || '', Validators.required],
      valorSMMLV: [data?.valorSMMLV || 0, [Validators.required, Validators.min(0)]],
      porcentajeParticipacion: [
        data?.porcentajeParticipacion || 100,
        [Validators.required, Validators.min(0), Validators.max(100)],
      ],
      codigosUNSPSC: [data?.codigosUNSPSC?.join(', ') || '', [Validators.required]],
    });
    this.experiencias.push(expGroup);
  }

  eliminarExperiencia(index: number): void {
    this.experiencias.removeAt(index);
  }

  onTabChange(tabId: string): void {
    this.activeTabId.set(tabId);
  }

  // --- CURRENCY FORMATTING ---
  formatCurrencyInput(event: any, controlPath: string): void {
    const input = event.target as HTMLInputElement;
    let value = input.value;

    if (!value) {
      this.empresaForm.get(controlPath)?.setValue(0);
      return;
    }

    // 1. Limpiar el string: quitar símbolo $, espacios y puntos de miles
    // 2. Cambiar la coma decimal por punto para que parseFloat lo entienda
    const cleanValue = value.replace(/[$\s.]/g, '').replace(',', '.');
    const num = parseFloat(cleanValue);

    if (!isNaN(num)) {
      // Formatear para visualización con 2 decimales según estándar es-CO
      input.value = new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(num);

      this.empresaForm.get(controlPath)?.setValue(num);
    }
  }

  unformatCurrencyInput(event: any, controlPath: string): void {
    const input = event.target as HTMLInputElement;
    const value = this.empresaForm.get(controlPath)?.value;
    if (value !== null && value !== undefined && !isNaN(value)) {
      // Al editar, mostramos el número con coma decimal si tiene decimales, o limpio
      input.value = value.toLocaleString('es-CO', {
        useGrouping: false,
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      });
    }
  }

  // Helper para inicializar los inputs de moneda al cargar
  getFormattedValue(controlPath: string): string {
    const value = this.empresaForm.get(controlPath)?.value;
    if (value === null || value === undefined || isNaN(value)) return '';
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  }

  // --- NUMBER FORMATTING (SMMLV: separador de miles con punto y decimales con coma, sin símbolo $) ---
  getFormattedNumber(controlPath: string): string {
    const value = this.empresaForm.get(controlPath)?.value;
    if (value === null || value === undefined || isNaN(value)) return '';
    return new Intl.NumberFormat('es-CO', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  }

  formatNumberInput(event: Event, controlPath: string): void {
    const input = event.target as HTMLInputElement;
    const value = input.value;

    if (!value) {
      this.empresaForm.get(controlPath)?.setValue(0);
      input.value = '';
      return;
    }

    // Quitar puntos de miles y cambiar la coma decimal por punto para parseFloat
    const cleanValue = value.replace(/[$\s.]/g, '').replace(',', '.');
    const num = parseFloat(cleanValue);

    if (!isNaN(num)) {
      input.value = new Intl.NumberFormat('es-CO', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(num);
      this.empresaForm.get(controlPath)?.setValue(num);
    }
  }

  // --- TOTAL DE EXPERIENCIA EN SMMLV ---
  getTotalSMMLV(): number {
    return this.experiencias.controls.reduce((sum, ctrl) => {
      const v = ctrl.get('valorSMMLV')?.value;
      return sum + (typeof v === 'number' && !isNaN(v) ? v : 0);
    }, 0);
  }

  getFormattedTotalSMMLV(): string {
    return new Intl.NumberFormat('es-CO', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(this.getTotalSMMLV());
  }

  onSubmit(): void {
    if (this.empresaForm.invalid) {
      this.empresaForm.markAllAsTouched();
      return;
    }

    const formData = { ...this.empresaForm.value };
    
    // Mapear codigosUNSPSC de string a array
    if (formData.experiencias) {
      formData.experiencias = formData.experiencias.map((exp: any) => ({
        ...exp,
        codigosUNSPSC: typeof exp.codigosUNSPSC === 'string' 
          ? exp.codigosUNSPSC.split(',').map((c: string) => c.trim()).filter((c: string) => c !== '')
          : exp.codigosUNSPSC
      }));
    }

    this.loading.set(true);

    const request = this.isEditMode() 
      ? this.empresaService.actualizarEmpresa(this.empresaNit()!, formData)
      : this.empresaService.crearEmpresa(formData);

    request.subscribe({
      next: () => {
        this.router.navigate(['/empresas']);
      },
      error: (err) => {
        console.error('Error al guardar empresa:', err);
        this.loading.set(false);
      }
    });
  }

  // ============================================================
  //  EXTRACCIÓN POR IA DEL RUP (drag & drop + precarga)
  // ============================================================

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    if (this.rupEstado() === 'extracting') return;
    this.isDragging.set(true);
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.isDragging.set(false);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragging.set(false);
    if (this.rupEstado() === 'extracting') return;
    const file = event.dataTransfer?.files?.[0];
    if (file) this.procesarArchivo(file);
  }

  onArchivoSeleccionado(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) this.procesarArchivo(file);
    // Permitir volver a seleccionar el mismo archivo
    input.value = '';
  }

  reintentarExtraccion(): void {
    if (this.ultimoArchivo) this.extraerRup(this.ultimoArchivo);
  }

  private procesarArchivo(file: File): void {
    const esPdf =
      file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    if (!esPdf) {
      this.rupEstado.set('error');
      this.rupError.set({
        mensaje: 'El archivo debe ser un PDF del RUP. Selecciona un archivo .pdf válido.',
        reintentable: false,
      });
      return;
    }
    this.archivoNombre.set(file.name);
    this.extraerRup(file);
  }

  private extraerRup(file: File): void {
    this.ultimoArchivo = file;
    this.rupError.set(null);
    this.rupEstado.set('extracting');

    this.empresaService.extraerRup(file).subscribe({
      next: (borrador) => {
        this.aplicarBorrador(borrador);
        this.rupCargado.set(true);
        this.rupEstado.set('idle');
      },
      error: (err: HttpErrorResponse) => {
        console.error('Error al extraer RUP con IA:', err);
        if (err.status === 422) {
          this.rupError.set({
            mensaje:
              'No pudimos leer este documento como un RUP. Asegúrate de subir el PDF del RUP completo y legible.',
            reintentable: false,
          });
        } else if (err.status === 500) {
          this.rupError.set({
            mensaje:
              'El servicio de IA no está disponible en este momento. Puedes reintentar la extracción.',
            reintentable: true,
          });
        } else {
          this.rupError.set({
            mensaje: 'Ocurrió un error al procesar el RUP. Inténtalo de nuevo.',
            reintentable: true,
          });
        }
        this.rupEstado.set('error');
      },
    });
  }

  /** Precarga el formulario con el borrador devuelto por la IA. */
  private aplicarBorrador(d: RupExtraido): void {
    const ia = new Set<string>();
    const set = (path: string, valor: unknown): void => {
      if (valor === null || valor === undefined || valor === '') return;
      const control = this.empresaForm.get(path);
      if (!control) return;
      control.setValue(valor, { emitEvent: false });
      control.markAsPristine();
      ia.add(path);
    };

    set('nit', d.nit);
    set('razonSocial', d.razonSocial);
    set('direccion', d.direccion);
    set('telefono', d.telefono);
    set('correo', d.correo);
    set('numeroProponenteCcb', d.numeroProponenteCcb);
    set('representanteLegal', d.representanteLegal);
    set('identificacionRepresentanteLegal', d.identificacionRepresentanteLegal);
    set('fechaInscripcion', this.normalizarFecha(d.fechaInscripcion));
    set('fechaUltimaRenovacion', this.normalizarFecha(d.fechaUltimaRenovacion));

    // tamañoEmpresa: solo aceptamos un valor válido del enum
    const tamano = (d.tamanoEmpresa || '').toUpperCase() as TamanoEmpresa;
    if (TAMANOS_VALIDOS.includes(tamano)) set('tamanoEmpresa', tamano);

    // Experiencias: reemplazamos las filas por las extraídas
    const exps = (d.experiencias || []).filter((e) => e !== null);
    if (exps.length) {
      this.experiencias.clear();
      exps.forEach((exp, i) => {
        this.agregarExperiencia({
          contratista: exp.contratista || '',
          entidadContratante: exp.entidadContratante || '',
          valorSMMLV: exp.valorSMMLV ?? 0,
          porcentajeParticipacion: exp.porcentajeParticipacion ?? 100,
          codigosUNSPSC: exp.codigosUNSPSC || [],
        });
        // Marcamos como sugeridos por IA los campos que realmente trajeron dato
        if (exp.contratista) ia.add(`experiencias.${i}.contratista`);
        if (exp.entidadContratante) ia.add(`experiencias.${i}.entidadContratante`);
        if (exp.valorSMMLV != null) ia.add(`experiencias.${i}.valorSMMLV`);
        if (exp.porcentajeParticipacion != null) ia.add(`experiencias.${i}.porcentajeParticipacion`);
        if (exp.codigosUNSPSC?.length) ia.add(`experiencias.${i}.codigosUNSPSC`);
      });
      this.experiencias.markAsPristine();
    }

    this.camposIA.set(ia);

    // Cierres fiscales: se ofrecen para que el usuario elija cuál cargar
    const cierres = (d.cierresFiscales || []).filter((c) => c !== null);
    this.cierresExtraidos.set(cierres);
    this.cierreCargado.set(null);

    // Si solo hay un cierre, lo cargamos automáticamente
    if (cierres.length === 1) {
      this.cargarCierre(cierres[0]);
    }

    this.advertenciasIA.set(d.advertencias || []);
  }

  /** Carga un cierre fiscal extraído en la pestaña de Datos Financieros. */
  cargarCierre(cierre: CierreFiscalExtraido): void {
    const grupo = this.empresaForm.get('indicadores');
    if (!grupo) return;

    const ia = new Set(this.camposIA());
    const setI = (key: string, valor: number | null): void => {
      if (valor === null || valor === undefined) return;
      const control = grupo.get(key);
      if (!control) return;
      control.setValue(valor, { emitEvent: false });
      control.markAsPristine();
      ia.add(`indicadores.${key}`);
    };

    setI('anioCierre', cierre.anioCierre);
    setI('activoCorriente', cierre.activoCorriente);
    setI('pasivoCorriente', cierre.pasivoCorriente);
    setI('activoTotal', cierre.activoTotal);
    setI('pasivoTotal', cierre.pasivoTotal);
    setI('utilidadOperacional', cierre.utilidadOperacional);
    setI('gastosInteres', cierre.gastosInteres);

    this.camposIA.set(ia);
    this.cierreCargado.set(cierre.anioCierre);

    // Disparamos el cálculo de indicadores con los nuevos valores
    this.calculatingIndicadores.set(true);
    this.empresaService.calcularIndicadores(grupo.value).subscribe({
      next: (res) => {
        this.indicadoresCalculados.set(res);
        this.calculatingIndicadores.set(false);
      },
      error: () => this.calculatingIndicadores.set(false),
    });

    this.activeTabId.set('financiero');
  }

  descartarBorradorIA(): void {
    this.rupCargado.set(false);
    this.rupEstado.set('idle');
    this.rupError.set(null);
    this.archivoNombre.set(null);
    this.advertenciasIA.set([]);
    this.cierresExtraidos.set([]);
    this.cierreCargado.set(null);
    this.camposIA.set(new Set());
    this.ultimoArchivo = null;
  }

  descartarAdvertencias(): void {
    this.advertenciasIA.set([]);
  }

  /**
   * Indica si un campo fue precargado por la IA y el usuario aún no lo ha editado.
   * Al editarlo (control `dirty`) el indicador desaparece automáticamente.
   */
  esSugeridoIA(path: string): boolean {
    if (!this.camposIA().has(path)) return false;
    const control = this.empresaForm.get(path);
    return !!control && control.pristine;
  }

  /** Normaliza una fecha a YYYY-MM-DD para inputs type="date". */
  private normalizarFecha(fecha: string | null): string | null {
    if (!fecha) return null;
    const match = /^\d{4}-\d{2}-\d{2}/.exec(fecha);
    return match ? match[0] : fecha;
  }
}
