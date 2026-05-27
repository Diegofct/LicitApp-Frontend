import { Component, EventEmitter, Input, OnInit, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CuadroDeObraService } from '../../pages/CuadroDeObra/service/cuadro-de-obra.service';
import { RequisitoLicitacion } from '../../pages/CuadroDeObra/interface/cuadro-de-obra';
import { AlertService } from '../../services/alert.service';

@Component({
  selector: 'app-analizar-pliego-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './analizar-pliego-modal.html',
})
export class AnalizarPliegoModal implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly cuadroService = inject(CuadroDeObraService);
  private readonly alertService = inject(AlertService);

  @Input() cuadroObraId!: number;
  @Output() close = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  form!: FormGroup;
  selectedFile: File | null = null;
  
  // Estados del proceso
  step = signal<'upload' | 'analyzing' | 'confirm'>('upload');
  loading = signal(false);

  ngOnInit(): void {
    this.initForm();
  }

  private initForm(data?: RequisitoLicitacion): void {
    this.form = this.fb.group({
      general: [data?.general || '', [Validators.required]],
      especifica1: [data?.especifica1 || '', [Validators.required]],
      especifica2: [data?.especifica2 || '', [Validators.required]],
      secundaria: [data?.secundaria || '', [Validators.required]],
      contrato: [data?.contrato || 1, [Validators.required, Validators.min(1)]],
      capitalTrabajo: [data?.capitalTrabajo || 0, [Validators.required, Validators.min(0)]],
      patrimonio: [data?.patrimonio || 0, [Validators.required, Validators.min(0)]],
      n: [data?.n || 1, [Validators.required, Validators.min(0.1)]],
      kresidualProceso: [data?.kresidualProceso || 0, [Validators.required, Validators.min(0)]],
      poeAnticipo: [data?.poeAnticipo || 0, [Validators.required, Validators.min(0), Validators.max(100)]],
    });
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file;
    }
  }

  onUpload(): void {
    if (!this.selectedFile) return;

    this.step.set('analyzing');
    this.loading.set(true);

    this.cuadroService.analizarPliego(this.cuadroObraId, this.selectedFile).subscribe({
      next: (requisitos) => {
        this.initForm(requisitos);
        this.step.set('confirm');
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error al analizar pliego:', err);
        this.alertService.error('Hubo un error al analizar el pliego con IA. Inténtalo de nuevo.');
        this.step.set('upload');
        this.loading.set(false);
      }
    });
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.cuadroService.guardarRequisitos(this.cuadroObraId, this.form.value).subscribe({
      next: () => {
        this.loading.set(false);
        this.saved.emit();
        this.close.emit();
      },
      error: (err) => {
        this.loading.set(false);
        console.error('Error al guardar requisitos:', err);
        this.alertService.error('Hubo un error al intentar guardar los requisitos.');
      }
    });
  }
}
