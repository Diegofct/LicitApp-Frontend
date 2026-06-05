import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../auth/service/auth.service';
import { ROL_LABEL, Rol } from '../../auth/interface/auth';

/** Estilos de badge por rol, en tonos translúcidos para el header oscuro. */
const ROL_BADGE: Record<Rol, string> = {
  ADMIN: 'bg-indigo-500/20 text-indigo-300',
  ANALISTA: 'bg-emerald-500/20 text-emerald-300',
  PROPIETARIO: 'bg-amber-500/20 text-amber-300',
};

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './header.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeaderComponent {
  private readonly auth = inject(AuthService);
  private readonly host = inject(ElementRef<HTMLElement>);

  readonly usuario = this.auth.usuario;
  readonly menuAbierto = signal(false);

  readonly rolLabel = computed(() => {
    const rol = this.usuario()?.rol;
    return rol ? ROL_LABEL[rol] : '';
  });

  readonly rolBadge = computed(() => {
    const rol = this.usuario()?.rol;
    return rol ? ROL_BADGE[rol] : 'bg-gray-100 text-gray-700';
  });

  /** Iniciales para el avatar (máx. 2). */
  readonly iniciales = computed(() => {
    const nombre = this.usuario()?.nombre?.trim() ?? '';
    if (!nombre) return '?';
    return nombre
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p.charAt(0).toUpperCase())
      .join('');
  });

  toggleMenu(): void {
    this.menuAbierto.update((v) => !v);
  }

  logout(): void {
    this.menuAbierto.set(false);
    this.auth.logout();
  }

  /** Cierra el menú al hacer clic fuera del header. */
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.menuAbierto() && !this.host.nativeElement.contains(event.target)) {
      this.menuAbierto.set(false);
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.menuAbierto.set(false);
  }
}
