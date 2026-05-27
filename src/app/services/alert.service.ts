import { Injectable, signal } from '@angular/core';

export type AlertType = 'error' | 'success' | 'info' | 'warning';

export interface AlertMessage {
  type: AlertType;
  title: string;
  message: string;
}

@Injectable({ providedIn: 'root' })
export class AlertService {
  private readonly _current = signal<AlertMessage | null>(null);
  readonly current = this._current.asReadonly();

  error(message: string, title: string = 'Ocurrió un error'): void {
    this._current.set({ type: 'error', title, message });
  }

  success(message: string, title: string = 'Operación exitosa'): void {
    this._current.set({ type: 'success', title, message });
  }

  info(message: string, title: string = 'Información'): void {
    this._current.set({ type: 'info', title, message });
  }

  warning(message: string, title: string = 'Atención'): void {
    this._current.set({ type: 'warning', title, message });
  }

  dismiss(): void {
    this._current.set(null);
  }
}
