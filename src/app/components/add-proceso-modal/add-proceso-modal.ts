import { Component, EventEmitter, OnInit, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CuadroDeObraService } from '../../pages/CuadroDeObra/service/cuadro-de-obra.service';
import { AlertService } from '../../services/alert.service';

@Component({
  selector: 'app-add-proceso-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './add-proceso-modal.html',
})
export class AddProcesoModal implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly cuadroService = inject(CuadroDeObraService);
  private readonly alertService = inject(AlertService);

  @Output() close = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  form!: FormGroup;
  loading = false;

  ngOnInit(): void {
    this.initForm();
  }

  private initForm(): void {
    this.form = this.fb.group({
      numeroProceso: ['', Validators.required],
      entidadContratante: ['', Validators.required],
      descripcionObjeto: ['', Validators.required],
      estadoProceso: ['', Validators.required],
      fechaPublicacion: ['', Validators.required],
      fechaCierre: ['', Validators.required],
      monto: [null, [Validators.required, Validators.min(0)]],
      valorSMMLV: [null, [Validators.required, Validators.min(0)]],
      tipoProyecto: ['', Validators.required],
      departamento: ['', Validators.required],
      municipio: ['', Validators.required],
      experiencia: ['', Validators.required],
      plazo: ['', Validators.required],
      anticipo: ['', Validators.required],
      observacion: [''],
      cuadroDeObraEstado: ['POR_PRESENTAR', Validators.required]
    });
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    const formData = { ...this.form.value };
    
    // Formatear fechas para el backend (ISO con segundos)
    if (formData.fechaCierre && formData.fechaCierre.length === 16) {
      formData.fechaCierre += ':00';
    }
    if (formData.fechaPublicacion && formData.fechaPublicacion.length === 16) {
      formData.fechaPublicacion += ':00';
    }

    this.cuadroService.agregarACuadroDeObra(formData).subscribe({
      next: () => {
        this.loading = false;
        this.saved.emit();
        this.close.emit();
      },
      error: (err) => {
        this.loading = false;
        console.error('Error al agregar proceso:', err);
        this.alertService.error('Hubo un error al intentar guardar el proceso. Revisa que todos los campos obligatorios estén llenos.');
      }
    });
  }
}
