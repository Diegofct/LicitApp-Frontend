import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { CuadroDeObraService } from '../../CuadroDeObra/service/cuadro-de-obra.service';
import { CuadroDeObraItem } from '../../CuadroDeObra/interface/cuadro-de-obra';
import { Sobre2Service } from '../service/sobre-2.service';
import {
  AnalisisSobre2,
  COLORES_METODO,
  ImportacionOferentes,
  OferenteProceso,
  ResultadoMetodo,
  ResumenCompetidor,
} from '../interface/sobre-2';
import { DistribucionOfertas } from '../distribucion-ofertas/distribucion-ofertas';
import { OferenteModal } from '../../../components/oferente-modal/oferente-modal';
import { ConfirmModal } from '../../../components/confirm-modal/confirm-modal';
import { Pagination } from '../../../components/pagination/pagination';
import { AlertService } from '../../../services/alert.service';

/** Campos por los que se puede ordenar la tabla de oferentes. */
type CampoOrden = 'nombre' | 'valor' | 'porcentaje';
/** Filtro rápido de la tabla. */
type FiltroTabla = 'TODAS' | 'VALIDAS' | 'EXCLUIDAS' | 'SOSPECHOSAS';

/** Medida de tendencia enriquecida con el color de su serie en la franja. */
interface MetodoVista extends ResultadoMetodo {
  color: string;
  /** Es la tendencia de la que sale el valor sugerido: la que se está apuntando. */
  esSugerido: boolean;
}

/**
 * Señales de que el Sobre 2 todavía no se ha abierto y los valores publicados por
 * SECOP no son ofertas económicas reales, sino datos de registro.
 */
interface DiagnosticoMuestra {
  activa: boolean;
  totalValidos: number;
  ceros: number;
  igualesPresupuesto: number;
  valorRepetido: number | null;
  repeticiones: number;
}

/**
 * En qué momento del proceso estamos y con cuánta certeza lo sabemos.
 *
 * `SEGUIMIENTO` es dato duro: el backend lo lee de los eventos registrados.
 * `HEURISTICA` es el respaldo de antes (inferir por la forma de la muestra) y solo
 * aplica mientras el análisis todavía no ha respondido.
 */
interface AvisoMomento {
  fuente: 'SEGUIMIENTO' | 'HEURISTICA';
  estadoCuadro: string | null;
  /** El Sobre 2 ya se abrió en audiencia: los valores son definitivos. */
  valoresDefinitivos: boolean;
  /** Falta el informe de evaluación definitivo: el análisis es exploratorio. */
  exploratorio: boolean;
  /** Anomalías en la muestra (ceros, placeholders), al margen del momento. */
  anomalias: boolean;
}

const TAM_PAGINA = 20;

/**
 * Sobre 2 — oferentes de un proceso, medidas de tendencia y valor sugerido.
 *
 * Reemplaza el Excel donde el licitador digitaba a mano decenas de oferentes para
 * estudiar con qué valores se presentó la competencia: importa las ofertas de SECOP,
 * las mantiene editables y acumula el histórico de cada competidor.
 *
 * Sobre esa muestra el backend calcula las cuatro medidas de tendencia del régimen
 * vigente y el valor de compromiso frente a todas ellas, que es lo que se pinta aquí.
 *
 * **Retirada por decisión de negocio la tarjeta de controles de ponderación**
 * económica: selector de régimen, simulación de un valor candidato, puntaje máximo y
 * botón de recalcular. Como consecuencia el análisis se pide **sin parámetros** (el
 * backend aplica Documentos Tipo) y se refresca solo con cada cambio de la muestra; y
 * como ya no hay valor candidato, tampoco se muestran puntaje ni posición propios.
 */
@Component({
  selector: 'app-sobre-2',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DistribucionOfertas,
    OferenteModal,
    ConfirmModal,
    Pagination,
  ],
  templateUrl: './sobre-2.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Sobre2 implements OnInit {
  private readonly cuadroService = inject(CuadroDeObraService);
  private readonly sobre2Service = inject(Sobre2Service);
  private readonly alertService = inject(AlertService);
  private readonly route = inject(ActivatedRoute);

  readonly tamPagina = TAM_PAGINA;

  // --- Selección e importación ----------------------------------------------
  readonly procesos = signal<CuadroDeObraItem[]>([]);
  readonly loadingProcesos = signal(false);
  readonly cuadroId = signal<number | null>(null);
  readonly nitEntidad = signal('');
  readonly historico = signal(false);
  readonly importando = signal(false);
  readonly importacion = signal<ImportacionOferentes | null>(null);

  // --- Oferentes -------------------------------------------------------------
  readonly oferentes = signal<OferenteProceso[]>([]);
  readonly loadingOferentes = signal(false);
  readonly guardandoId = signal<number | null>(null);
  readonly saneando = signal(false);

  /**
   * Análisis del backend: de aquí salen las medidas de tendencia, el valor sugerido,
   * el presupuesto oficial real, las advertencias, el momento del proceso y las
   * referencias que la franja dibuja sobre la escala. Se pide sin parámetros, así que
   * el backend aplica su régimen por defecto (Documentos Tipo).
   */
  readonly analisis = signal<AnalisisSobre2 | null>(null);
  readonly loadingAnalisis = signal(false);

  // --- Tabla -----------------------------------------------------------------
  readonly campoOrden = signal<CampoOrden>('valor');
  readonly ordenAsc = signal(true);
  readonly filtro = signal<FiltroTabla>('TODAS');
  readonly busqueda = signal('');
  readonly pagina = signal(1);

  // --- Modales ---------------------------------------------------------------
  readonly modalAbierto = signal(false);
  readonly oferenteEnEdicion = signal<OferenteProceso | null>(null);
  readonly oferenteAEliminar = signal<OferenteProceso | null>(null);
  readonly competidor = signal<ResumenCompetidor | null>(null);
  readonly competidorNombre = signal<string | null>(null);
  readonly loadingCompetidor = signal(false);

  // --- Derivados -------------------------------------------------------------

  readonly procesoSeleccionado = computed<CuadroDeObraItem | null>(() => {
    const id = this.cuadroId();
    return id === null ? null : (this.procesos().find((p) => p.id === id) ?? null);
  });

  /**
   * Presupuesto de referencia. Preferimos el que devuelve el análisis (es el que el
   * backend usó de verdad) y caemos al monto del cuadro de obra mientras carga.
   */
  readonly presupuestoOficial = computed<number>(
    () => this.analisis()?.presupuestoOficial ?? this.procesoSeleccionado()?.monto ?? 0,
  );

  /**
   * Si la importación va a cruzar por identificador de proceso (exacta) o va a
   * degradar a búsqueda por referencia (aproximada).
   *
   * El backend resuelve el `idDelProceso` del cuadro contra SECOP para obtener el
   * identificador con el que se buscan las ofertas. Los cuadros cargados a mano no
   * existen en SECOP y lo tienen `null`: solo en ese caso el NIT sirve para algo.
   */
  readonly cruzaPorIdentificador = computed<boolean>(() => {
    const id = this.procesoSeleccionado()?.idDelProceso;
    return typeof id === 'string' && id.trim() !== '';
  });

  readonly oferentesValidos = computed(() => this.oferentes().filter((o) => o.valida));

  /**
   * Ofertas que superan el presupuesto oficial. El backend las deja **fuera de la
   * muestra** (superarlo es causal de rechazo) aunque sigan marcadas como válidas,
   * así que la tabla debe decirlo o la fila parecerá contar cuando no cuenta.
   */
  readonly idsSobrePresupuesto = computed<ReadonlySet<number>>(() => {
    const presupuesto = this.presupuestoOficial();
    const ids = new Set<number>();
    if (presupuesto <= 0) return ids;
    for (const o of this.oferentes()) {
      if (o.valida && o.valorOferta > presupuesto) ids.add(o.id);
    }
    return ids;
  });

  /**
   * IDs de ofertas que no huelen a oferta económica real: valor en cero (típico de
   * las marcadas "Confidencial"), valor exactamente igual al presupuesto oficial
   * (placeholder de registro) o por debajo del 10% del presupuesto.
   *
   * Es una heurística de cliente: **resalta y sugiere, nunca excluye por su cuenta.**
   */
  readonly idsSospechosos = computed<ReadonlySet<number>>(() => {
    const presupuesto = this.presupuestoOficial();
    const ids = new Set<number>();
    for (const o of this.oferentes()) {
      if (o.valorOferta === 0) {
        ids.add(o.id);
      } else if (presupuesto > 0 && o.valorOferta === presupuesto) {
        ids.add(o.id);
      } else if (presupuesto > 0 && o.valorOferta < presupuesto * 0.1) {
        ids.add(o.id);
      }
    }
    return ids;
  });

  /** Sospechosas que aún pesan en las fórmulas. */
  readonly sospechosasValidas = computed(() =>
    this.oferentes().filter((o) => o.valida && this.idsSospechosos().has(o.id)),
  );

  readonly excluidas = computed(() => this.oferentes().filter((o) => !o.valida));

  /**
   * Diagnóstico de la muestra: si buena parte de las ofertas coincide con el
   * presupuesto oficial o se repite, lo más probable es que el Sobre 2 aún no se
   * haya abierto y SECOP esté publicando valores de registro.
   */
  readonly diagnostico = computed<DiagnosticoMuestra>(() => {
    const validos = this.oferentesValidos();
    const presupuesto = this.presupuestoOficial();
    const total = validos.length;

    let ceros = 0;
    let igualesPresupuesto = 0;
    const conteo = new Map<number, number>();

    for (const o of validos) {
      if (o.valorOferta === 0) ceros++;
      if (presupuesto > 0 && o.valorOferta === presupuesto) igualesPresupuesto++;
      conteo.set(o.valorOferta, (conteo.get(o.valorOferta) ?? 0) + 1);
    }

    let valorRepetido: number | null = null;
    let repeticiones = 0;
    for (const [valor, veces] of conteo) {
      if (veces > repeticiones) {
        repeticiones = veces;
        valorRepetido = valor;
      }
    }

    const proporcionRepetida = total > 0 ? repeticiones / total : 0;
    const activa =
      total > 0 && (igualesPresupuesto > 0 || ceros > 0 || (repeticiones > 1 && proporcionRepetida >= 0.3));

    return { activa, totalValidos: total, ceros, igualesPresupuesto, valorRepetido, repeticiones };
  });

  /**
   * Momento del proceso. Manda el dato duro del seguimiento que envía el backend
   * (`listoParaDecidir` / `valoresDefinitivos`); la heurística de la muestra queda
   * como respaldo únicamente mientras el análisis no ha respondido.
   *
   * Por qué importa: la heurística producía falsos negativos: un proceso con Sobre 2
   * sin abrir cuyas ofertas casualmente no se repetían pasaba sin aviso, y el analista
   * podía tomar por definitivas unas cifras que no lo eran.
   */
  readonly momento = computed<AvisoMomento>(() => {
    const analisis = this.analisis();
    const anomalias = this.diagnostico().activa;

    if (!analisis) {
      return {
        fuente: 'HEURISTICA',
        estadoCuadro: null,
        valoresDefinitivos: !anomalias,
        exploratorio: false,
        anomalias,
      };
    }

    return {
      fuente: 'SEGUIMIENTO',
      estadoCuadro: analisis.estadoCuadro,
      valoresDefinitivos: analisis.valoresDefinitivos,
      exploratorio: !analisis.listoParaDecidir,
      anomalias,
    };
  });

  /** El banner se muestra si algo compromete la lectura de los métodos. */
  readonly hayAvisoMomento = computed<boolean>(() => {
    const m = this.momento();
    return !m.valoresDefinitivos || m.exploratorio || m.anomalias;
  });

  /**
   * Medidas de tendencia con su color de serie. El color se ancla al **rango TRM**
   * (orden ascendente), propiedad intrínseca del método, no al orden del array:
   * filtrar o reordenar nunca repinta una serie.
   */
  readonly metodosVista = computed<MetodoVista[]>(() => {
    const metodos = this.analisis()?.metodos ?? [];
    const sugerido = this.analisis()?.metodoSugerido ?? null;
    return [...metodos]
      .sort((a, b) => (a.rangoTrm || a.metodo).localeCompare(b.rangoTrm || b.metodo))
      .map((m, i) => ({
        ...m,
        color: COLORES_METODO[i % COLORES_METODO.length],
        esSugerido: sugerido !== null && m.metodo === sugerido,
      }));
  });

  /**
   * Métodos para la franja. Va como `computed` y no como expresión en el template
   * para no crear un array nuevo en cada ciclo de detección de cambios.
   */
  readonly metodosGrafica = computed<ResultadoMetodo[]>(() => this.analisis()?.metodos ?? []);

  /** Filtro rápido + búsqueda por nombre. No afecta al análisis, solo a la tabla. */
  private readonly oferentesFiltrados = computed<OferenteProceso[]>(() => {
    const filtro = this.filtro();
    const termino = this.busqueda().trim().toLowerCase();
    const sospechosos = this.idsSospechosos();

    return this.oferentes().filter((o) => {
      if (filtro === 'VALIDAS' && !o.valida) return false;
      if (filtro === 'EXCLUIDAS' && o.valida) return false;
      if (filtro === 'SOSPECHOSAS' && !sospechosos.has(o.id)) return false;
      if (termino && !o.nombreOferente.toLowerCase().includes(termino)) return false;
      return true;
    });
  });

  /** Orden sobre el total filtrado, nunca sobre la página visible. */
  readonly oferentesOrdenados = computed<OferenteProceso[]>(() => {
    const campo = this.campoOrden();
    const signo = this.ordenAsc() ? 1 : -1;
    return [...this.oferentesFiltrados()].sort((a, b) => {
      if (campo === 'nombre') return signo * a.nombreOferente.localeCompare(b.nombreOferente);
      if (campo === 'porcentaje') return signo * ((a.porcentaje ?? 0) - (b.porcentaje ?? 0));
      return signo * (a.valorOferta - b.valorOferta);
    });
  });

  readonly totalPaginas = computed(() =>
    Math.max(1, Math.ceil(this.oferentesOrdenados().length / TAM_PAGINA)),
  );

  readonly paginaActual = computed(() => Math.min(this.pagina(), this.totalPaginas()));

  readonly oferentesPagina = computed<OferenteProceso[]>(() => {
    const inicio = (this.paginaActual() - 1) * TAM_PAGINA;
    return this.oferentesOrdenados().slice(inicio, inicio + TAM_PAGINA);
  });

  // --- Ciclo de vida ---------------------------------------------------------

  ngOnInit(): void {
    this.cargarProcesos();

    // Deep-link /sobre-2?cuadroId=123
    const param = this.route.snapshot.queryParamMap.get('cuadroId');
    if (param) {
      const id = Number(param);
      if (!Number.isNaN(id)) this.seleccionarProceso(id);
    }
  }

  /**
   * El Sobre 2 se trabaja tanto antes de presentar como después, así que el selector
   * mezcla ambas vistas del cuadro de obra.
   */
  private cargarProcesos(): void {
    this.loadingProcesos.set(true);
    forkJoin({
      porPresentar: this.cuadroService
        .obtenerCuadroDeObra(0, 200, 'por-presentar')
        .pipe(catchError(() => of(null))),
      presentadas: this.cuadroService
        .obtenerCuadroDeObra(0, 200, 'presentadas')
        .pipe(catchError(() => of(null))),
    }).subscribe({
      next: ({ porPresentar, presentadas }) => {
        const todos = [...(porPresentar?.content ?? []), ...(presentadas?.content ?? [])];
        const unicos = new Map<number, CuadroDeObraItem>();
        for (const p of todos) unicos.set(p.id, p);
        this.procesos.set([...unicos.values()]);
        this.loadingProcesos.set(false);
      },
      error: () => {
        this.loadingProcesos.set(false);
        this.alertService.error('No se pudieron cargar los procesos del cuadro de obra.');
      },
    });
  }

  // --- Selección -------------------------------------------------------------

  /** El `<option>` vacío emite `null`; el resto, el id del cuadro de obra. */
  onProcesoChange(valor: number | null): void {
    if (valor === null || Number.isNaN(valor)) {
      this.limpiarProceso();
      return;
    }
    this.seleccionarProceso(valor);
  }

  private seleccionarProceso(id: number): void {
    this.cuadroId.set(id);
    this.importacion.set(null);
    this.competidor.set(null);
    this.competidorNombre.set(null);
    this.filtro.set('TODAS');
    this.busqueda.set('');
    this.pagina.set(1);
    this.cargarOferentes();
  }

  private limpiarProceso(): void {
    this.cuadroId.set(null);
    this.oferentes.set([]);
    this.analisis.set(null);
    this.importacion.set(null);
    this.competidor.set(null);
    this.competidorNombre.set(null);
    this.pagina.set(1);
  }

  // --- Importación -----------------------------------------------------------

  importar(): void {
    const id = this.cuadroId();
    if (id === null || this.importando()) return;

    this.importando.set(true);
    this.sobre2Service.importarOferentes(id, this.nitEntidad(), this.historico()).subscribe({
      next: (res) => {
        this.importando.set(false);
        this.importacion.set(res);
        // La respuesta ya trae la lista completa: la usamos sin volver a pedirla.
        this.oferentes.set([...res.oferentes]);
        this.pagina.set(1);
        this.recargarAnalisis();
        if (res.encontrados === 0) {
          // Que haya proponentes sin valores no es un fallo: es el Sobre 2 todavía
          // sellado. Decirlo como "sin ofertas" haría buscar un problema inexistente.
          if (res.proponentesRegistrados && res.proponentesRegistrados > 0) {
            this.alertService.info(
              `SECOP reporta ${res.proponentesRegistrados} proponentes, pero aún no publica sus ` +
                'valores: el Sobre 2 no se ha abierto. Vuelve a importar después de la audiencia.',
              'Sobre 2 todavía sellado',
            );
          } else {
            this.alertService.info(
              'SECOP no publicó ofertas para este proceso. Puedes agregarlas manualmente.',
              'Sin ofertas publicadas',
            );
          }
        } else {
          this.alertService.success(
            `${res.encontrados} oferentes encontrados · ${res.creados} nuevos · ${res.actualizados} actualizados.`,
          );
        }
      },
      error: (err: HttpErrorResponse) => {
        this.importando.set(false);
        this.alertService.error(
          err.error?.message || 'No se pudieron importar los oferentes desde SECOP.',
        );
      },
    });
  }

  // --- Oferentes -------------------------------------------------------------

  cargarOferentes(): void {
    const id = this.cuadroId();
    if (id === null) return;

    this.loadingOferentes.set(true);
    this.sobre2Service.listarOferentes(id).subscribe({
      next: (res) => {
        this.oferentes.set([...res]);
        this.loadingOferentes.set(false);
        this.recargarAnalisis();
      },
      error: (err: HttpErrorResponse) => {
        this.loadingOferentes.set(false);
        this.alertService.error(err.error?.message || 'No se pudieron cargar los oferentes.');
      },
    });
  }

  /** Alterna si la oferta entra o no en las fórmulas y recalcula el análisis. */
  toggleValida(oferente: OferenteProceso): void {
    if (this.guardandoId() !== null) return;
    this.guardandoId.set(oferente.id);

    this.sobre2Service
      .actualizarOferente(oferente.id, {
        nombreOferente: oferente.nombreOferente,
        nitOferente: oferente.nitOferente,
        valorOferta: oferente.valorOferta,
        moneda: oferente.moneda,
        valida: !oferente.valida,
      })
      .subscribe({
        next: (actualizado) => {
          this.guardandoId.set(null);
          this.reemplazarOferente(actualizado);
          this.recargarAnalisis();
        },
        error: (err: HttpErrorResponse) => {
          this.guardandoId.set(null);
          this.alertService.error(err.error?.message || 'No se pudo cambiar la validez.');
        },
      });
  }

  /** Excluye de una vez todas las sospechosas que aún ponderan. */
  excluirSospechosas(): void {
    const objetivo = this.sospechosasValidas();
    if (objetivo.length === 0 || this.saneando()) return;

    this.saneando.set(true);
    forkJoin(
      objetivo.map((o) =>
        this.sobre2Service.actualizarOferente(o.id, {
          nombreOferente: o.nombreOferente,
          nitOferente: o.nitOferente,
          valorOferta: o.valorOferta,
          moneda: o.moneda,
          valida: false,
        }),
      ),
    ).subscribe({
      next: (actualizados) => {
        this.saneando.set(false);
        this.fusionarOferentes(actualizados);
        this.recargarAnalisis();
        this.alertService.success(
          `${actualizados.length} ofertas quedaron fuera del cálculo. Puedes revertirlo cuando quieras.`,
        );
      },
      error: (err: HttpErrorResponse) => {
        this.saneando.set(false);
        this.alertService.error(err.error?.message || 'No se pudieron excluir las ofertas.');
        this.cargarOferentes();
      },
    });
  }

  /** Devuelve al cálculo todas las ofertas excluidas. */
  restablecerTodas(): void {
    const objetivo = this.excluidas();
    if (objetivo.length === 0 || this.saneando()) return;

    this.saneando.set(true);
    forkJoin(
      objetivo.map((o) =>
        this.sobre2Service.actualizarOferente(o.id, {
          nombreOferente: o.nombreOferente,
          nitOferente: o.nitOferente,
          valorOferta: o.valorOferta,
          moneda: o.moneda,
          valida: true,
        }),
      ),
    ).subscribe({
      next: (actualizados) => {
        this.saneando.set(false);
        this.fusionarOferentes(actualizados);
        this.recargarAnalisis();
        this.alertService.success(`${actualizados.length} ofertas volvieron al cálculo.`);
      },
      error: (err: HttpErrorResponse) => {
        this.saneando.set(false);
        this.alertService.error(err.error?.message || 'No se pudieron restablecer las ofertas.');
        this.cargarOferentes();
      },
    });
  }

  /** Nueva referencia de array: mutar dentro del signal rompería OnPush. */
  private reemplazarOferente(actualizado: OferenteProceso): void {
    this.oferentes.set(
      this.oferentes().map((o) => (o.id === actualizado.id ? actualizado : o)),
    );
  }

  private fusionarOferentes(actualizados: OferenteProceso[]): void {
    const porId = new Map(actualizados.map((o) => [o.id, o]));
    this.oferentes.set(this.oferentes().map((o) => porId.get(o.id) ?? o));
  }

  // --- Modal de alta/edición -------------------------------------------------

  abrirNuevo(): void {
    this.oferenteEnEdicion.set(null);
    this.modalAbierto.set(true);
  }

  abrirEdicion(oferente: OferenteProceso): void {
    this.oferenteEnEdicion.set(oferente);
    this.modalAbierto.set(true);
  }

  cerrarModal(): void {
    this.modalAbierto.set(false);
    this.oferenteEnEdicion.set(null);
  }

  onOferenteGuardado(oferente: OferenteProceso): void {
    const existe = this.oferentes().some((o) => o.id === oferente.id);
    if (existe) {
      this.reemplazarOferente(oferente);
    } else {
      this.oferentes.set([...this.oferentes(), oferente]);
    }
    this.recargarAnalisis();
  }

  pedirEliminar(oferente: OferenteProceso): void {
    this.oferenteAEliminar.set(oferente);
  }

  confirmarEliminar(): void {
    const oferente = this.oferenteAEliminar();
    if (!oferente) return;

    this.sobre2Service.eliminarOferente(oferente.id).subscribe({
      next: () => {
        this.oferenteAEliminar.set(null);
        this.oferentes.set(this.oferentes().filter((o) => o.id !== oferente.id));
        this.recargarAnalisis();
        this.alertService.success('Oferente eliminado.');
      },
      error: (err: HttpErrorResponse) => {
        this.oferenteAEliminar.set(null);
        this.alertService.error(err.error?.message || 'No se pudo eliminar el oferente.');
      },
    });
  }

  /** Aviso al borrar algo que la próxima importación va a devolver. */
  mensajeEliminar(): string {
    const oferente = this.oferenteAEliminar();
    if (!oferente) return '';
    const base = `Se eliminará "${oferente.nombreOferente}" de este proceso.`;
    return oferente.origen === 'SECOP'
      ? `${base} Como vino de SECOP, volverá a aparecer en la próxima importación.`
      : base;
  }

  // --- Análisis --------------------------------------------------------------

  /**
   * Refresca el análisis tras cualquier cambio en la muestra. Ya no hay controles que
   * lo disparen a mano: lo llaman la importación y cada alta, edición, exclusión o
   * borrado de oferentes.
   */
  recargarAnalisis(): void {
    const id = this.cuadroId();
    if (id === null) return;

    // Sin oferentes cargados no hay muestra que analizar y el backend responde 400.
    // Pedirlo igual levantaría un error rojo encima del aviso que ya explica por qué no
    // hay datos —el Sobre 2 todavía sellado, por ejemplo—, que es el caso normal y no
    // un fallo.
    if (this.oferentes().length === 0) {
      this.analisis.set(null);
      this.loadingAnalisis.set(false);
      return;
    }

    this.loadingAnalisis.set(true);
    this.sobre2Service
      .analizar(id)
      .subscribe({
        next: (res) => {
          this.analisis.set(res);
          this.loadingAnalisis.set(false);
        },
        error: (err: HttpErrorResponse) => {
          this.loadingAnalisis.set(false);
          // Sin esto el encabezado seguiría mostrando el resumen del análisis anterior
          // ("138 de 177 válidas") aunque esos oferentes ya no existan.
          this.analisis.set(null);
          this.alertService.error(err.error?.message || 'No se pudo calcular el análisis.');
        },
      });
  }

  // --- Competidor ------------------------------------------------------------

  verCompetidor(nombre: string): void {
    this.competidorNombre.set(nombre);
    this.competidor.set(null);
    this.loadingCompetidor.set(true);
    this.sobre2Service.resumenCompetidor(nombre).subscribe({
      next: (res) => {
        this.competidor.set(res);
        this.loadingCompetidor.set(false);
      },
      error: () => {
        this.loadingCompetidor.set(false);
      },
    });
  }

  cerrarCompetidor(): void {
    this.competidorNombre.set(null);
    this.competidor.set(null);
  }

  // --- Tabla -----------------------------------------------------------------

  ordenarPor(campo: CampoOrden): void {
    if (this.campoOrden() === campo) {
      this.ordenAsc.update((v) => !v);
    } else {
      this.campoOrden.set(campo);
      this.ordenAsc.set(true);
    }
    this.pagina.set(1);
  }

  iconoOrden(campo: CampoOrden): string {
    if (this.campoOrden() !== campo) return 'bx-sort-alt-2 text-gray-300';
    return this.ordenAsc() ? 'bx-sort-up text-indigo-600' : 'bx-sort-down text-indigo-600';
  }

  cambiarFiltro(valor: FiltroTabla): void {
    this.filtro.set(valor);
    this.pagina.set(1);
  }

  setBusqueda(valor: string): void {
    this.busqueda.set(valor);
    this.pagina.set(1);
  }

  irAPagina(pagina: number): void {
    this.pagina.set(pagina);
  }

  esSospechoso(oferente: OferenteProceso): boolean {
    return this.idsSospechosos().has(oferente.id);
  }

  /** Marcada como válida pero fuera de la muestra por superar el presupuesto oficial. */
  superaPresupuesto(oferente: OferenteProceso): boolean {
    return this.idsSobrePresupuesto().has(oferente.id);
  }

  /** Por qué una fila está marcada como sospechosa (va en el `title` del ícono). */
  motivoSospecha(oferente: OferenteProceso): string {
    const presupuesto = this.presupuestoOficial();
    if (oferente.valorOferta === 0) {
      return 'Valor en cero: suele corresponder a ofertas marcadas como "Confidencial" en SECOP.';
    }
    if (presupuesto > 0 && oferente.valorOferta === presupuesto) {
      return 'Coincide exactamente con el presupuesto oficial: parece un valor de registro, no una oferta.';
    }
    return 'Muy por debajo del presupuesto oficial (menos del 10%): revisa si es un dato de registro.';
  }

  // --- Formato ---------------------------------------------------------------

  /** `92.94` → `92.94 %`. El backend ya envía el valor ×100: nunca se recalcula. */
  porcentaje(valor: number | null | undefined): string {
    if (valor === null || valor === undefined) return '—';
    return `${valor.toFixed(2)} %`;
  }

  /** El NIT llega `null` o "No Definido" en consorcios/UT: no es un dato faltante. */
  nitVisible(nit: string | null): string {
    if (!nit || nit.trim() === '' || nit.trim().toLowerCase() === 'no definido') return '—';
    return nit;
  }
}
