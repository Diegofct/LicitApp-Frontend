import { Component, OnInit, HostListener, Inject, PLATFORM_ID, Output, EventEmitter, signal, computed, inject, ChangeDetectionStrategy } from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../auth/service/auth.service';
import { Rol } from '../../auth/interface/auth';

interface NavItem {
  label: string;
  route: string;
  icon: string;
  roles: Rol[];
}

/**
 * Navegación con los roles que pueden ver cada opción.
 *
 * El orden sigue el flujo real de trabajo del licitador, no un agrupamiento
 * temático: Empresas va primero porque sin proponentes cargados la Evaluación
 * de Viabilidad no tiene contra qué comparar, y Sobre 2 va después de
 * Seguimiento porque la oferta económica se decide una vez el proceso quedó
 * hábil. Usuarios queda al final por ser administración, ajena al flujo.
 */
const NAV_ITEMS: NavItem[] = [
  { label: 'Empresas', route: '/empresas', icon: 'bx-group', roles: ['ANALISTA', 'ADMIN'] },
  { label: 'Busqueda SECOP', route: '/busqueda-secop', icon: 'bx-search', roles: ['ANALISTA', 'ADMIN'] },
  { label: 'Cuadro de Obra', route: '/cuadro-de-obra', icon: 'bx-building-house', roles: ['ANALISTA', 'ADMIN'] },
  { label: 'Evaluación de Viabilidad', route: '/evaluacion-viabilidad', icon: 'bx-analyse', roles: ['ANALISTA', 'ADMIN'] },
  { label: 'Seguimiento', route: '/seguimiento', icon: 'bx-line-chart', roles: ['ANALISTA', 'ADMIN'] },
  { label: 'Sobre 2', route: '/sobre-2', icon: 'bx-calculator', roles: ['ANALISTA', 'ADMIN'] },
  { label: 'Resultados', route: '/resultados', icon: 'bx-trophy', roles: ['ANALISTA', 'ADMIN'] },
  { label: 'Usuarios', route: '/usuarios', icon: 'bx-user-circle', roles: ['ADMIN'] },
];

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SidebarComponent implements OnInit {
  @Output() sidebarToggled = new EventEmitter<boolean>();
  open = signal(true);
  private isBrowser: boolean;

  private readonly auth = inject(AuthService);

  /** Opciones de menú visibles según el rol del usuario autenticado. */
  readonly navItems = computed<NavItem[]>(() => {
    const rol = this.auth.rol();
    if (!rol) return [];
    return NAV_ITEMS.filter((item) => item.roles.includes(rol));
  });

  constructor(@Inject(PLATFORM_ID) private platformId: object) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  ngOnInit() {
    if (this.isBrowser) {
      this.checkScreenWidth();
      this.sidebarToggled.emit(this.open());
    }
  }

  @HostListener('window:resize', ['$event'])
  onResize(event?: Event) {
    const previousOpenState = this.open();
    this.checkScreenWidth();
    if (this.open() !== previousOpenState) {
      this.sidebarToggled.emit(this.open());
    }
  }

  private checkScreenWidth() {
    if (this.isBrowser) {
      this.open.set(window.innerWidth > 768);
    }
  }

  toggle() {
    this.open.update(v => !v);
    this.sidebarToggled.emit(this.open());
  }

  /**
   * Cierra el drawer después de navegar cuando está superpuesto (<= 768px).
   * En desktop no hace nada: allí el sidebar es una columna fija del layout.
   */
  onNavigate() {
    if (this.isBrowser && window.innerWidth <= 768 && this.open()) {
      this.open.set(false);
      this.sidebarToggled.emit(false);
    }
  }
}
