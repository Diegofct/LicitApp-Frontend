import { Component, HostListener, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AlertService, AlertType } from '../../services/alert.service';

interface AlertStyle {
  iconBg: string;
  iconColor: string;
  icon: string;
  button: string;
  ring: string;
}

const STYLES: Record<AlertType, AlertStyle> = {
  error: {
    iconBg: 'bg-red-100',
    iconColor: 'text-red-600',
    icon: 'bx-error-circle',
    button: 'bg-red-600 hover:bg-red-700 shadow-red-200',
    ring: 'focus:ring-red-500',
  },
  success: {
    iconBg: 'bg-emerald-100',
    iconColor: 'text-emerald-600',
    icon: 'bx-check-circle',
    button: 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200',
    ring: 'focus:ring-emerald-500',
  },
  info: {
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
    icon: 'bx-info-circle',
    button: 'bg-blue-600 hover:bg-blue-700 shadow-blue-200',
    ring: 'focus:ring-blue-500',
  },
  warning: {
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-600',
    icon: 'bx-error',
    button: 'bg-amber-600 hover:bg-amber-700 shadow-amber-200',
    ring: 'focus:ring-amber-500',
  },
};

@Component({
  selector: 'app-alert-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (alert(); as a) {
      <div class="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
           (click)="onBackdrop($event)">
        <div role="alertdialog" aria-modal="true"
             class="bg-white rounded-xl shadow-2xl w-full max-w-md transform transition-all animate-in zoom-in-95 duration-200"
             (click)="$event.stopPropagation()">
          <div class="p-6">
            <div class="flex items-center justify-center w-14 h-14 mx-auto rounded-full mb-4"
                 [ngClass]="styles().iconBg">
              <i class="bx text-3xl"
                 [ngClass]="[styles().iconColor, styles().icon]"></i>
            </div>
            <h3 class="text-xl font-bold text-center text-gray-900 mb-2">{{ a.title }}</h3>
            <p class="text-sm text-center text-gray-600 mb-6 whitespace-pre-line">{{ a.message }}</p>

            <button (click)="dismiss()"
                    class="cursor-pointer w-full px-4 py-2.5 text-sm font-medium text-white rounded-lg shadow-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2"
                    [ngClass]="[styles().button, styles().ring]">
              Entendido
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class AlertModal {
  private readonly alertService = inject(AlertService);

  readonly alert = this.alertService.current;
  readonly styles = computed<AlertStyle>(() => STYLES[this.alert()?.type ?? 'info']);

  dismiss(): void {
    this.alertService.dismiss();
  }

  onBackdrop(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.dismiss();
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.alert()) this.dismiss();
  }
}
