import { Component, OnInit, inject, signal, ChangeDetectionStrategy, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { EmpresaService } from '../service/empresa.service';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Empresa, IndicadoresFinancieros, Experiencia } from '../interface/empresa';
import { Tabs, Tab } from '../../../components/tabs/tabs';
import { debounceTime, distinctUntilChanged, switchMap, catchError } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { of } from 'rxjs';

@Component({
  selector: 'app-empresa-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, Tabs, RouterLink],
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
  ];
  activeTabId = signal('general');

  // --- ESTADO ---
  isEditMode = signal(false);
  loading = signal(false);
  calculatingIndicadores = signal(false);
  empresaNit = signal<string | null>(null);

  // --- FORMULARIO ---
  empresaForm: FormGroup = this.fb.group({
    nit: ['', [Validators.required, Validators.pattern('^[0-9]+$')]],
    razonSocial: ['', Validators.required],
    direccion: ['', Validators.required],
    telefono: ['', Validators.required],
    correo: ['', [Validators.required, Validators.email]],
    numeroProponenteCcb: ['', Validators.required],
    tamanoEmpresa: ['MICROEMPRESA', Validators.required],
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

    // Arreglo de Experiencias
    experiencias: this.fb.array([])
  });

  // --- GETTERS PARA FORM ARRAY ---
  get experiencias() {
    return this.empresaForm.get('experiencias') as FormArray;
  }

  // --- INDICADORES CALCULADOS (SIGNALS) ---
  indicadoresCalculados = signal<IndicadoresFinancieros | null>(null);

  ngOnInit(): void {
    this.setupIndicadoresListener();
    
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
    this.empresaForm.get('indicadores')?.valueChanges.pipe(
      debounceTime(500),
      distinctUntilChanged((prev, curr) => JSON.stringify(prev) === JSON.stringify(curr)),
      switchMap(values => {
        this.calculatingIndicadores.set(true);
        return this.empresaService.calcularIndicadores(values);
      }),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: (res) => {
        this.indicadoresCalculados.set(res);
        this.calculatingIndicadores.set(false);
      },
      error: (err) => {
        console.error('Error al calcular indicadores:', err);
        this.calculatingIndicadores.set(false);
      }
    });
  }

  cargarEmpresa(nit: string): void {
    this.loading.set(true);
    this.empresaService.obtenerEmpresaPorNit(nit).subscribe({
      next: (empresa) => {
        this.empresaForm.patchValue({
          nit: empresa.nit,
          razonSocial: empresa.razonSocial,
          direccion: empresa.direccion,
          telefono: empresa.telefono,
          correo: empresa.correo,
          numeroProponenteCcb: empresa.numeroProponenteCcb,
          tamanoEmpresa: empresa.tamanoEmpresa,
          representanteLegal: empresa.representanteLegal,
          identificacionRepresentanteLegal: empresa.identificacionRepresentanteLegal,
          fechaInscripcion: empresa.fechaInscripcion,
          fechaUltimaRenovacion: empresa.fechaUltimaRenovacion,
          indicadores: empresa.indicadores || {}
        });

        if (empresa.indicadores) {
          this.indicadoresCalculados.set(empresa.indicadores);
        }

        // Limpiar y cargar experiencias
        this.experiencias.clear();
        empresa.experiencias?.forEach(exp => this.agregarExperiencia(exp));
        
        // Inicializar indicadores calculados con los datos existentes
        if (empresa.indicadores) {
          this.indicadoresCalculados.set(empresa.indicadores);
        }

        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error al cargar empresa:', err);
        this.loading.set(false);
      }
    });
  }

  agregarExperiencia(data?: Experiencia): void {
    const expGroup = this.fb.group({
      contratista: [data?.contratista || '', Validators.required],
      entidadContratante: [data?.entidadContratante || '', Validators.required],
      valorSMMLV: [data?.valorSMMLV || 0, [Validators.required, Validators.min(0)]],
      porcentajeParticipacion: [data?.porcentajeParticipacion || 100, [Validators.required, Validators.min(0), Validators.max(100)]],
      codigosUNSPSC: [data?.codigosUNSPSC?.join(', ') || '', [Validators.required]]
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
    
    if (!value) return;

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
        maximumFractionDigits: 2
      }).format(num);
      
      // ALERTA: Quitamos { emitEvent: false } para que el listener de indicadores 
      // se active y llame al backend para recalcular.
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
        maximumFractionDigits: 2 
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
}
