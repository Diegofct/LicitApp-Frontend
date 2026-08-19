import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import {
  COLORES_METODO,
  COLOR_CANDIDATO,
  COLOR_OFERTA,
  COLOR_OFERTA_INVALIDA,
  OferenteProceso,
  ResultadoMetodo,
} from '../interface/sobre-2';

/** Barra de densidad: un tramo del eje con las ofertas que caen dentro. */
interface BinOfertas {
  indice: number;
  x: number;
  ancho: number;
  y: number;
  alto: number;
  cantidad: number;
  desde: number;
  hasta: number;
  nombres: string[];
}

/** Marcador de un método de ponderación sobre la escala. */
interface MarcaMetodo {
  metodo: string;
  nombre: string;
  corto: string;
  rangoTrm: string;
  color: string;
  /** x del valor de referencia en coordenadas del viewBox. */
  x: number;
  /** x de la etiqueta, acotado para que el texto no se salga del lienzo. */
  labelX: number;
  labelY: number;
  /** Polilínea guía entre la etiqueta y el marcador. */
  guia: string;
  texto: string;
  valorReferencia: number;
  porcentajeReferencia: number;
  oferenteMasCercano: string | null;
  puntajeCandidato: number | null;
}

/** Marca de una oferta excluida del cálculo, bajo la línea base. */
interface MarcaExcluida {
  x: number;
  nombre: string;
  valor: number;
}

/** Rótulo del eje horizontal. */
interface TickEje {
  x: number;
  texto: string;
}

/** Contenido del tooltip (hover y foco de teclado muestran lo mismo). */
interface Tooltip {
  /** Posición horizontal en % del ancho del lienzo. */
  xPct: number;
  titulo: string;
  lineas: string[];
  color: string;
}

// --- Geometría del lienzo (coordenadas del viewBox) --------------------------
const ANCHO = 1000;
const ALTO = 224;
const X0 = 44;
const X1 = 956;
const CARRIL_ALTO = 20;
const CARRILES = 3;
const TOPE_FRANJA = 92;
const LINEA_BASE = 152;
const ALTO_MAX_BARRA = 56;
const ALTO_MIN_BARRA = 7;
const Y_TICKS = 178;
const Y_ROMBO = 190;

/**
 * Franja de distribución de las ofertas del Sobre 2.
 *
 * De un vistazo responde la pregunta del licitador: *¿dónde cae mi valor frente a
 * la competencia y frente a los valores que puede premiar cada método?*
 *
 * Decisiones de visualización (skill `dataviz`):
 * - **Densidad, no un punto por oferta.** El volumen real medido es de ~135 ofertas;
 *   una marca por oferta se solapa consigo misma y produce 135 zonas de hover
 *   encimadas. Las ofertas válidas se agrupan en bins y cada bin es una barra cuya
 *   altura es su cantidad, con una única zona de hover contigua.
 * - **Patrón de énfasis**: la competencia es contexto en gris; los métodos llevan el
 *   color (paleta categórica validada, ver `COLORES_METODO`) y el candidato va en
 *   tinta con forma propia (rombo), no como un quinto color de serie.
 * - **Identidad nunca solo por color**: cada método lleva etiqueta directa sobre su
 *   marcador, además de la leyenda; y todos los valores están también en la tabla de
 *   oferentes y en las tarjetas de método (el tooltip enriquece, nunca es la única vía).
 * - SVG inline: sin librerías de charting.
 */
@Component({
  selector: 'app-distribucion-ofertas',
  standalone: true,
  imports: [],
  templateUrl: './distribucion-ofertas.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DistribucionOfertas {
  /** Todos los oferentes del proceso (válidos y excluidos). */
  readonly oferentes = input.required<OferenteProceso[]>();
  /** Métodos calculados por el backend para el régimen activo. */
  readonly metodos = input<ResultadoMetodo[]>([]);
  /** Valor que el analista está simulando; `null` si aún no lo ha fijado. */
  readonly valorCandidato = input<number | null>(null);
  /** Presupuesto oficial: solo se usa para rotular el eje en %. */
  readonly presupuestoOficial = input<number>(0);

  // Geometría expuesta al template.
  readonly ancho = ANCHO;
  readonly alto = ALTO;
  readonly x0 = X0;
  readonly x1 = X1;
  readonly topeFranja = TOPE_FRANJA;
  readonly lineaBase = LINEA_BASE;
  readonly yTicks = Y_TICKS;
  readonly yRombo = Y_ROMBO;
  readonly colorOferta = COLOR_OFERTA;
  readonly colorOfertaInvalida = COLOR_OFERTA_INVALIDA;
  readonly colorCandidato = COLOR_CANDIDATO;

  /** Tooltip activo; lo escriben tanto `pointerenter` como `focus`. */
  readonly tooltip = signal<Tooltip | null>(null);

  private readonly validas = computed(() =>
    this.oferentes().filter((o) => o.valida),
  );

  private readonly excluidas = computed(() =>
    this.oferentes().filter((o) => !o.valida),
  );

  /** `true` cuando hay algo que dibujar. */
  readonly hayDatos = computed(() => this.validas().length > 0);

  /**
   * Dominio de la escala: cubre ofertas válidas, valores de referencia y candidato,
   * con un 3% de margen. Si todo vale lo mismo, se abre artificialmente ±2%.
   */
  private readonly dominio = computed<{ min: number; max: number }>(() => {
    const valores: number[] = this.validas().map((o) => o.valorOferta);
    for (const m of this.metodos()) {
      valores.push(m.valorReferencia);
    }
    const candidato = this.valorCandidato();
    if (candidato !== null && candidato > 0) valores.push(candidato);

    if (valores.length === 0) return { min: 0, max: 1 };

    let min = Math.min(...valores);
    let max = Math.max(...valores);

    if (max === min) {
      const delta = Math.abs(max) * 0.02 || 1;
      min -= delta;
      max += delta;
    } else {
      const margen = (max - min) * 0.03;
      min -= margen;
      max += margen;
    }
    return { min, max };
  });

  /** Proyecta un valor en COP a la coordenada x del viewBox. */
  private escalaX(valor: number): number {
    const { min, max } = this.dominio();
    const t = (valor - min) / (max - min);
    return X0 + Math.min(1, Math.max(0, t)) * (X1 - X0);
  }

  /**
   * Ofertas válidas agrupadas en bins. La cantidad de bins crece con la raíz del
   * número de ofertas: suficiente resolución con 135, sin astillar con 5.
   */
  readonly bins = computed<BinOfertas[]>(() => {
    const items = this.validas();
    if (items.length === 0) return [];

    const { min, max } = this.dominio();
    const n = Math.min(48, Math.max(10, Math.ceil(Math.sqrt(items.length) * 3)));
    const paso = (max - min) / n;
    const anchoBin = (X1 - X0) / n;

    const cuentas: number[] = new Array<number>(n).fill(0);
    const nombres: string[][] = Array.from({ length: n }, () => []);

    for (const o of items) {
      const idx = Math.min(n - 1, Math.max(0, Math.floor((o.valorOferta - min) / paso)));
      cuentas[idx] += 1;
      if (nombres[idx].length < 5) nombres[idx].push(o.nombreOferente);
    }

    const maxCuenta = Math.max(...cuentas);
    const resultado: BinOfertas[] = [];

    for (let i = 0; i < n; i++) {
      if (cuentas[i] === 0) continue;
      const alto = ALTO_MIN_BARRA + (cuentas[i] / maxCuenta) * (ALTO_MAX_BARRA - ALTO_MIN_BARRA);
      resultado.push({
        indice: i,
        // 1px a cada lado: el separador entre barras es hueco de superficie, no un borde.
        x: X0 + i * anchoBin + 1,
        ancho: Math.max(1, anchoBin - 2),
        y: LINEA_BASE - alto,
        alto,
        cantidad: cuentas[i],
        desde: min + i * paso,
        hasta: min + (i + 1) * paso,
        nombres: nombres[i],
      });
    }
    return resultado;
  });

  /** Cantidad de ofertas del bin más poblado (se rotula, el resto no). */
  readonly maxBin = computed(() => {
    const bins = this.bins();
    return bins.length === 0 ? 0 : Math.max(...bins.map((b) => b.cantidad));
  });

  /** Bin más poblado, para colgarle la única etiqueta directa de la densidad. */
  readonly binDestacado = computed<BinOfertas | null>(() => {
    const bins = this.bins();
    if (bins.length === 0) return null;
    return bins.reduce((a, b) => (b.cantidad > a.cantidad ? b : a));
  });

  /** Ofertas excluidas del cálculo: se dibujan bajo la línea base, atenuadas. */
  readonly marcasExcluidas = computed<MarcaExcluida[]>(() =>
    this.excluidas().map((o) => ({
      x: this.escalaX(o.valorOferta),
      nombre: o.nombreOferente,
      valor: o.valorOferta,
    })),
  );

  /**
   * Marcadores de método con sus etiquetas repartidas en carriles.
   *
   * El color se ancla al **rango TRM** (orden ascendente), que es una propiedad
   * intrínseca del método: filtrar o reordenar la respuesta nunca repinta una serie.
   */
  readonly marcasMetodo = computed<MarcaMetodo[]>(() => {
    const ordenados = [...this.metodos()].sort((a, b) =>
      (a.rangoTrm || a.metodo).localeCompare(b.rangoTrm || b.metodo),
    );

    const conColor = ordenados.map((m, i) => ({
      m,
      color: COLORES_METODO[i % COLORES_METODO.length],
    }));

    // Los carriles se asignan por posición horizontal para que dos etiquetas
    // vecinas nunca se pisen; nunca se recorta texto.
    const porX = [...conColor].sort(
      (a, b) => this.escalaX(a.m.valorReferencia) - this.escalaX(b.m.valorReferencia),
    );
    const finCarril: number[] = new Array<number>(CARRILES).fill(Number.NEGATIVE_INFINITY);
    const marcas: MarcaMetodo[] = [];

    for (const { m, color } of porX) {
      const corto = this.nombreCorto(m.nombre);
      const texto = `${corto} · ${this.formatoPorcentaje(m.porcentajeReferencia)}`;
      const ancho = texto.length * 5.6 + 10;
      const mitad = ancho / 2;
      const x = this.escalaX(m.valorReferencia);
      const labelX = Math.min(X1 - mitad, Math.max(X0 + mitad, x));

      let carril = CARRILES - 1;
      for (let i = 0; i < CARRILES; i++) {
        if (labelX - mitad >= finCarril[i] + 8) {
          carril = i;
          break;
        }
      }
      finCarril[carril] = labelX + mitad;

      const labelY = 16 + carril * CARRIL_ALTO;
      marcas.push({
        metodo: m.metodo,
        nombre: m.nombre,
        corto,
        rangoTrm: m.rangoTrm,
        color,
        x,
        labelX,
        labelY,
        guia: `${labelX},${labelY + 5} ${x},${labelY + 13} ${x},${TOPE_FRANJA}`,
        texto,
        valorReferencia: m.valorReferencia,
        porcentajeReferencia: m.porcentajeReferencia,
        oferenteMasCercano: m.oferenteMasCercano,
        puntajeCandidato: m.puntajeCandidato,
      });
    }
    return marcas;
  });

  /** x del candidato, o `null` si no hay valor simulado. */
  readonly xCandidato = computed<number | null>(() => {
    const v = this.valorCandidato();
    if (v === null || v <= 0) return null;
    return this.escalaX(v);
  });

  /** Etiqueta del candidato, acotada para no salirse del lienzo. */
  readonly labelXCandidato = computed<number>(() => {
    const x = this.xCandidato() ?? X0;
    return Math.min(X1 - 60, Math.max(X0 + 60, x));
  });

  /**
   * Cinco rótulos del eje. Se expresan en % del presupuesto oficial —así lo lee el
   * licitador— y solo caen a COP compacto si no hay presupuesto con el que comparar.
   */
  readonly ticks = computed<TickEje[]>(() => {
    if (!this.hayDatos()) return [];
    const { min, max } = this.dominio();
    const presupuesto = this.presupuestoOficial();
    const total = 5;
    const salida: TickEje[] = [];
    for (let i = 0; i < total; i++) {
      const valor = min + ((max - min) * i) / (total - 1);
      salida.push({
        x: this.escalaX(valor),
        texto:
          presupuesto > 0
            ? `${this.formatoPorcentaje((valor / presupuesto) * 100)}`
            : this.formatoCompacto(valor),
      });
    }
    return salida;
  });

  /** Leyenda: siempre presente porque hay más de una serie. */
  readonly leyenda = computed(() =>
    this.marcasMetodo().map((m) => ({ nombre: m.nombre, color: m.color, rangoTrm: m.rangoTrm })),
  );

  // --- Interacción -----------------------------------------------------------

  mostrarBin(bin: BinOfertas): void {
    const extra = bin.cantidad - bin.nombres.length;
    const lineas = [
      `${this.formatoCompacto(bin.desde)} – ${this.formatoCompacto(bin.hasta)}`,
      ...bin.nombres,
    ];
    if (extra > 0) lineas.push(`y ${extra} más…`);
    this.tooltip.set({
      xPct: (bin.x + bin.ancho / 2) / ANCHO * 100,
      titulo: `${bin.cantidad} ${bin.cantidad === 1 ? 'oferta' : 'ofertas'}`,
      lineas,
      color: COLOR_OFERTA,
    });
  }

  mostrarMetodo(marca: MarcaMetodo): void {
    const lineas = [
      `TRM ${marca.rangoTrm}`,
      `${this.formatoMoneda(marca.valorReferencia)} · ${this.formatoPorcentaje(marca.porcentajeReferencia)}`,
    ];
    if (marca.oferenteMasCercano) lineas.push(`Más cercano: ${marca.oferenteMasCercano}`);
    if (marca.puntajeCandidato !== null) {
      lineas.push(`Puntaje de tu oferta: ${marca.puntajeCandidato}`);
    }
    this.tooltip.set({
      xPct: (marca.x / ANCHO) * 100,
      titulo: marca.nombre,
      lineas,
      color: marca.color,
    });
  }

  mostrarExcluida(marca: MarcaExcluida): void {
    this.tooltip.set({
      xPct: (marca.x / ANCHO) * 100,
      titulo: 'Excluida del cálculo',
      lineas: [marca.nombre, this.formatoMoneda(marca.valor)],
      color: COLOR_OFERTA_INVALIDA,
    });
  }

  mostrarCandidato(): void {
    const x = this.xCandidato();
    const v = this.valorCandidato();
    if (x === null || v === null) return;
    this.tooltip.set({
      xPct: (x / ANCHO) * 100,
      titulo: 'Tu oferta',
      lineas: [this.formatoMoneda(v)],
      color: COLOR_CANDIDATO,
    });
  }

  ocultarTooltip(): void {
    this.tooltip.set(null);
  }

  // --- Formato ---------------------------------------------------------------

  /** `92.94` → `92.94 %`. Nunca multiplica: el backend ya envía el valor ×100. */
  formatoPorcentaje(valor: number | null): string {
    if (valor === null || valor === undefined) return '—';
    return `${valor.toFixed(2)} %`;
  }

  /** Notación compacta para ejes y rangos: `$1.858 M`. */
  formatoCompacto(valor: number): string {
    const abs = Math.abs(valor);
    if (abs >= 1_000_000_000) return `$${(valor / 1_000_000_000).toFixed(2)} MM`;
    if (abs >= 1_000_000) return `$${(valor / 1_000_000).toFixed(0)} M`;
    if (abs >= 1_000) return `$${(valor / 1_000).toFixed(0)} K`;
    return `$${valor.toFixed(0)}`;
  }

  /** Moneda completa con separadores de miles. */
  formatoMoneda(valor: number): string {
    return `$${Math.round(valor).toLocaleString('es-CO')}`;
  }

  /**
   * Nombre corto del método para la etiqueta directa (el completo va en la leyenda,
   * la tarjeta y el tooltip). Solo presentación.
   */
  private nombreCorto(nombre: string): string {
    const n = (nombre || '').toLowerCase();
    if (n.includes('mediana')) return 'Mediana';
    if (n.includes('geom')) return 'Geométrica';
    if (n.includes('aritm')) return 'Aritmética baja';
    if (n.includes('menor')) return 'Menor valor';
    const palabras = (nombre || 'Método').split(' ');
    return palabras.slice(0, 2).join(' ');
  }
}
