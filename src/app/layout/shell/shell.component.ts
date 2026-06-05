import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from '../../components/sidebar/sidebar.component';
import { HeaderComponent } from '../../components/header/header.component';

/**
 * Layout de la aplicación autenticada: sidebar (role-aware) + header + contenido.
 * Las rutas internas se renderizan dentro de este shell mediante <router-outlet>.
 */
@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, SidebarComponent, HeaderComponent],
  templateUrl: './shell.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShellComponent {
  isSidebarOpen = signal(true);

  onSidebarToggle(isOpen: boolean): void {
    this.isSidebarOpen.set(isOpen);
  }
}
