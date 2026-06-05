import { Component, signal, ChangeDetectionStrategy } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AlertModal } from './components/alert-modal/alert-modal';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, AlertModal],
  templateUrl: './app.html',
  styleUrl: './app.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  protected readonly title = signal('licitapp-frontend');
}
