import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-confirm-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div class="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[90dvh] overflow-y-auto transform transition-all animate-in zoom-in-95 duration-200">
        <div class="p-4 sm:p-6">
          <div class="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full mb-4">
            <i class="bx bx-error text-2xl text-red-600"></i>
          </div>
          <h3 class="text-lg sm:text-xl font-bold text-center text-gray-900 mb-2">{{ title }}</h3>
          <p class="text-sm text-center text-gray-500 mb-6 break-words">{{ message }}</p>

          <div class="flex flex-col sm:flex-row gap-3">
            <button (click)="cancel.emit()"
              class="cursor-pointer flex-1 px-4 py-2.5 sm:py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
              {{ cancelText }}
            </button>
            <button (click)="confirm.emit()"
              class="cursor-pointer flex-1 px-4 py-2.5 sm:py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors shadow-md">
              {{ confirmText }}
            </button>
          </div>
        </div>
      </div>
    </div>
  `
})
export class ConfirmModal {
  @Input() title: string = '¿Estás seguro?';
  @Input() message: string = 'Esta acción no se puede deshacer.';
  @Input() confirmText: string = 'Eliminar';
  @Input() cancelText: string = 'Cancelar';

  @Output() confirm = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();
}
