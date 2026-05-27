import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  AbstractControl,
  FormArray,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { ConformacionProponenteService } from '../../pages/Conformacion/service/conformacion.service';
import {
  ConformacionRequest,
  ConformacionResponse,
  TipoParticipacion,
} from '../../pages/Conformacion/interface/conformacion';
import { Empresa } from '../../pages/Empresa/interface/empresa';
import { AlertService } from '../../services/alert.service';
import { HttpErrorResponse } from '@angular/common/http';

type ViewMode = 'loading' | 'empty' | 'summary' | 'edit';

interface TipoOption {
  id: TipoParticipacion;
  label: string;
  icon: string;
  description: string;
}

const TIPO_OPTIONS: TipoOption[] = [
  {
    id: 'INDIVIDUAL',
    label: 'Individual',
    icon: 'bx-user',
    description: 'Una sola empresa presenta la oferta al 100%.',
  },
  {
    id: 'CONSORCIO',
    label: 'Consorcio',
    icon: 'bx-buildings',
    description: 'Dos o más empresas unen capacidades para presentar oferta conjunta.',
  },
  {
    id: 'UNION_TEMPORAL',
    label: 'Unión Temporal',
    icon: 'bx-link',
    description: 'Alianza formal entre empresas con responsabilidades diferenciadas.',
  },
];

@Component({
  selector: 'app-conformacion-proponente',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './conformacion-proponente.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConformacionProponenteComponent implements OnChanges {
  private readonly fb = inject(FormBuilder);
  private readonly conformacionService = inject(ConformacionProponenteService);
  private readonly alertService = inject(AlertService);

  @Input({ required: true }) cuadroDeObraId!: number;
  @Input({ required: true }) empresas: Empresa[] = [];
  /** Si es true, se entra directamente al modo edición tras cargar (útil para enlaces profundos). */
  @Input() autoEdit = false;

  @Output() saved = new EventEmitter<ConformacionResponse>();

  readonly viewMode = signal<ViewMode>('loading');
  readonly saving = signal(false);
  readonly conformacion = signal<ConformacionResponse | null>(null);

  readonly tipoOptions = TIPO_OPTIONS;

  form: FormGroup = this.buildForm();

  /** Estado UI por fila para el “select buscable” de empresa. */
  readonly openSelectorIndex = signal<number | null>(null);
  readonly searchTerms = signal<string[]>([]);

  readonly sumaPorcentajes = signal(0);
  readonly tipoActual = signal<TipoParticipacion | null>(null);

  readonly sumaValida = computed(() => Math.abs(this.sumaPorcentajes() - 100) < 0.01);
  readonly esIndividual = computed(() => this.tipoActual() === 'INDIVIDUAL');
  readonly esConsorcio = computed(
    () => this.tipoActual() === 'CONSORCIO' || this.tipoActual() === 'UNION_TEMPORAL'
  );

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['cuadroDeObraId'] && this.cuadroDeObraId) {
      this.cargarConformacion();
    }
  }

  // ============ Form & validation ============
  private buildForm(): FormGroup {
    const group = this.fb.group({
      tipoParticipacion: this.fb.control<TipoParticipacion | null>(null, Validators.required),
      observaciones: this.fb.control<string>(''),
      integrantes: this.fb.array([], [this.empresasUnicasValidator, this.sumaPorcentajesValidator]),
    });

    group.get('tipoParticipacion')!.valueChanges.subscribe((tipo) => {
      this.tipoActual.set(tipo as TipoParticipacion);
      this.handleTipoChange(tipo as TipoParticipacion);
    });

    return group;
  }

  get integrantes(): FormArray {
    return this.form.get('integrantes') as FormArray;
  }

  private newIntegranteGroup(empresaId: number | null = null, porcentaje: number = 0): FormGroup {
    const group = this.fb.group({
      empresaId: this.fb.control<number | null>(empresaId, Validators.required),
      porcentajeParticipacion: this.fb.control<number>(porcentaje, [
        Validators.required,
        Validators.min(0.01),
        Validators.max(100),
      ]),
    });

    group.valueChanges.subscribe(() => this.recalcSuma());
    return group;
  }

  private recalcSuma(): void {
    const total = this.integrantes.controls.reduce((acc, ctrl) => {
      const val = Number(ctrl.get('porcentajeParticipacion')?.value || 0);
      return acc + (isNaN(val) ? 0 : val);
    }, 0);
    this.sumaPorcentajes.set(Number(total.toFixed(2)));
    this.integrantes.updateValueAndValidity({ emitEvent: false });
  }

  private handleTipoChange(tipo: TipoParticipacion): void {
    if (!tipo) return;

    if (tipo === 'INDIVIDUAL') {
      this.integrantes.clear();
      const ctrl = this.newIntegranteGroup(null, 100);
      ctrl.get('porcentajeParticipacion')!.disable({ emitEvent: false });
      this.integrantes.push(ctrl);
      this.searchTerms.set(['']);
    } else {
      // Si veníamos de individual, asegurar al menos dos filas y porcentajes editables.
      this.integrantes.controls.forEach((c) => c.get('porcentajeParticipacion')!.enable({ emitEvent: false }));
      while (this.integrantes.length < 2) {
        this.integrantes.push(this.newIntegranteGroup());
      }
      if (this.searchTerms().length < this.integrantes.length) {
        this.searchTerms.set(Array(this.integrantes.length).fill(''));
      }
    }
    this.recalcSuma();
  }

  private empresasUnicasValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
    const arr = control as FormArray;
    const ids = arr.controls
      .map((c) => c.get('empresaId')?.value)
      .filter((v): v is number => v !== null && v !== undefined);
    const unicas = new Set(ids);
    return ids.length !== unicas.size ? { empresasDuplicadas: true } : null;
  };

  private sumaPorcentajesValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
    const arr = control as FormArray;
    const total = arr.controls.reduce((acc, c) => {
      const raw = c.get('porcentajeParticipacion');
      const val = Number(raw?.value || 0);
      return acc + (isNaN(val) ? 0 : val);
    }, 0);
    return Math.abs(total - 100) < 0.01 ? null : { sumaInvalida: { total } };
  };

  // ============ UI actions ============
  agregarIntegrante(): void {
    if (this.esIndividual()) return;
    this.integrantes.push(this.newIntegranteGroup());
    this.searchTerms.set([...this.searchTerms(), '']);
    this.recalcSuma();
  }

  eliminarIntegrante(index: number): void {
    if (this.esIndividual()) return;
    this.integrantes.removeAt(index);
    const terms = [...this.searchTerms()];
    terms.splice(index, 1);
    this.searchTerms.set(terms);
    this.recalcSuma();
  }

  toggleSelector(index: number): void {
    this.openSelectorIndex.update((cur) => (cur === index ? null : index));
  }

  closeSelector(): void {
    this.openSelectorIndex.set(null);
  }

  setEmpresa(index: number, empresaId: number): void {
    const ctrl = this.integrantes.at(index);
    ctrl.get('empresaId')!.setValue(empresaId);
    this.closeSelector();
  }

  updateSearch(index: number, value: string): void {
    const terms = [...this.searchTerms()];
    terms[index] = value;
    this.searchTerms.set(terms);
  }

  empresasDisponibles(currentIndex: number): Empresa[] {
    const seleccionadas = new Set(
      this.integrantes.controls
        .map((c, i) => (i !== currentIndex ? c.get('empresaId')?.value : null))
        .filter((v): v is number => v !== null && v !== undefined)
    );
    const term = (this.searchTerms()[currentIndex] || '').toLowerCase().trim();
    return this.empresas.filter((e) => {
      if (e.id === undefined) return false;
      if (seleccionadas.has(e.id)) return false;
      if (!term) return true;
      return (
        e.razonSocial.toLowerCase().includes(term) ||
        e.nit.toLowerCase().includes(term)
      );
    });
  }

  empresaNombre(empresaId: number | null | undefined): string {
    if (empresaId == null) return 'Selecciona una empresa…';
    const empresa = this.empresas.find((e) => e.id === empresaId);
    return empresa ? `${empresa.razonSocial}` : 'Empresa no encontrada';
  }

  empresaNit(empresaId: number | null | undefined): string {
    if (empresaId == null) return '';
    const empresa = this.empresas.find((e) => e.id === empresaId);
    return empresa ? `NIT ${empresa.nit}` : '';
  }

  iniciales(razonSocial: string): string {
    if (!razonSocial) return '?';
    return razonSocial
      .split(/\s+/)
      .filter((w) => w.length > 0)
      .slice(0, 2)
      .map((w) => w[0].toUpperCase())
      .join('');
  }

  // ============ Data flow ============
  private cargarConformacion(): void {
    this.viewMode.set('loading');
    this.conformacionService.obtenerPorCuadroDeObra(this.cuadroDeObraId).subscribe({
      next: (data) => {
        this.conformacion.set(data);
        if (this.autoEdit) {
          this.entrarEdicion();
        } else {
          this.viewMode.set('summary');
        }
      },
      error: (err: HttpErrorResponse) => {
        if (err.status === 404) {
          this.conformacion.set(null);
          this.viewMode.set(this.autoEdit ? 'edit' : 'empty');
          if (this.autoEdit) this.resetForm();
        } else {
          this.viewMode.set('empty');
          this.alertService.error('No se pudo cargar la conformación del proponente.');
        }
      },
    });
  }

  empezar(): void {
    this.resetForm();
    this.viewMode.set('edit');
  }

  entrarEdicion(): void {
    const c = this.conformacion();
    if (c) {
      this.form = this.buildForm();
      this.form.patchValue({
        tipoParticipacion: c.tipoParticipacion,
        observaciones: c.observaciones ?? '',
      });
      this.tipoActual.set(c.tipoParticipacion);
      // Limpiar y poblar integrantes
      this.integrantes.clear();
      c.integrantes.forEach((i) => {
        const grp = this.newIntegranteGroup(i.empresaId, Number(i.porcentajeParticipacion));
        if (c.tipoParticipacion === 'INDIVIDUAL') {
          grp.get('porcentajeParticipacion')!.disable({ emitEvent: false });
        }
        this.integrantes.push(grp);
      });
      this.searchTerms.set(Array(this.integrantes.length).fill(''));
      this.recalcSuma();
    } else {
      this.resetForm();
    }
    this.viewMode.set('edit');
  }

  cancelar(): void {
    if (this.conformacion()) {
      this.viewMode.set('summary');
    } else {
      this.viewMode.set('empty');
    }
  }

  private resetForm(): void {
    this.form = this.buildForm();
    this.tipoActual.set(null);
    this.sumaPorcentajes.set(0);
    this.searchTerms.set([]);
  }

  guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const tipo = this.form.get('tipoParticipacion')!.value as TipoParticipacion;

    if (tipo === 'INDIVIDUAL' && this.integrantes.length !== 1) {
      this.alertService.error('La participación individual debe tener exactamente una empresa.');
      return;
    }
    if ((tipo === 'CONSORCIO' || tipo === 'UNION_TEMPORAL') && this.integrantes.length < 2) {
      this.alertService.error('Un consorcio o unión temporal debe tener al menos dos integrantes.');
      return;
    }

    const integrantesRaw = this.integrantes.getRawValue() as {
      empresaId: number;
      porcentajeParticipacion: number;
    }[];

    const request: ConformacionRequest = {
      cuadroDeObraId: this.cuadroDeObraId,
      tipoParticipacion: tipo,
      observaciones: this.form.get('observaciones')!.value || undefined,
      integrantes: integrantesRaw.map((i) => ({
        empresaId: i.empresaId,
        porcentajeParticipacion: Number(i.porcentajeParticipacion),
      })),
    };

    this.saving.set(true);
    this.conformacionService.guardarConformacion(request).subscribe({
      next: (resp) => {
        this.conformacion.set(resp);
        this.viewMode.set('summary');
        this.saving.set(false);
        this.alertService.success('Conformación del proponente guardada correctamente.');
        this.saved.emit(resp);
      },
      error: (err: HttpErrorResponse) => {
        this.saving.set(false);
        const mensaje = err.error?.message || 'No se pudo guardar la conformación.';
        this.alertService.error(mensaje);
      },
    });
  }

  // ============ Helpers para el template ============
  tipoLabel(tipo: TipoParticipacion | null | undefined): string {
    if (!tipo) return '';
    return TIPO_OPTIONS.find((o) => o.id === tipo)?.label ?? tipo;
  }

  tipoIcon(tipo: TipoParticipacion | null | undefined): string {
    if (!tipo) return 'bx-question-mark';
    return TIPO_OPTIONS.find((o) => o.id === tipo)?.icon ?? 'bx-question-mark';
  }

  isInvalid(controlPath: string | (string | number)[]): boolean {
    const ctrl = this.form.get(controlPath);
    return !!ctrl && ctrl.touched && ctrl.invalid;
  }

  /** Determina si la barra de suma debe pintarse en verde / ámbar / rojo. */
  colorSuma(): string {
    if (this.sumaValida()) return 'emerald';
    if (this.sumaPorcentajes() > 100) return 'red';
    return 'amber';
  }

  /** Para mostrar la barra de progreso de la suma. */
  porcentajeBarra(): number {
    return Math.min(100, this.sumaPorcentajes());
  }
}
