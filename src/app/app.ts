import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from './components/sidebar/sidebar.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, SidebarComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('licitapp-frontend');
  isSidebarOpen: boolean = true; // Initialize to true, assuming sidebar is open by default

  onSidebarToggle(isOpen: boolean) {
    this.isSidebarOpen = isOpen;
  }
}
