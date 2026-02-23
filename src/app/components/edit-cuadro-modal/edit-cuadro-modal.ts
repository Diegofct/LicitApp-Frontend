import { Component, EventEmitter, Input, OnInit, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CuadroDeObraService } from '../../pages/CuadroDeObra/service/cuadro-de-obra.service';
import { CuadroDeObraItem } from '../../pages/CuadroDeObra/interface/cuadro-de-obra';

@Component({
  selector: 'app-edit-cuadro-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './edit-cuadro-modal.html',
})
export class EditCuadroModal implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly cuadroService = inject(CuadroDeObraService);

  @Input({ required: true }) item!: CuadroDeObraItem;
  @Output() close = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  form!: FormGroup;
  loading = false;

  ngOnInit(): void {
    this.initForm();
  }

  private initForm(): void {
    const formattedCierre = this.formatDateForInput(this.item.fechaCierre);
    const formattedPublicacion = this.formatDateForInput(this.item.fechaPublicacion);

    this.form = this.fb.group({
      id: [this.item.id],
      numeroProceso: [this.item.numeroProceso, Validators.required],
      entidadContratante: [this.item.entidadContratante, Validators.required],
      descripcionObjeto: [this.item.descripcionObjeto, Validators.required],
      estadoProceso: [this.item.estadoProceso, Validators.required],
      fechaPublicacion: [formattedPublicacion, Validators.required],
      departamento: [this.item.departamento, Validators.required],
      municipio: [this.item.municipio, Validators.required],
      monto: [this.item.monto, [Validators.required, Validators.min(0)]],
      fechaCierre: [formattedCierre, Validators.required],
      valorSMMLV: [this.item.valorSMMLV, [Validators.required]],
      tipoProyecto: [this.item.tipoProyecto, Validators.required],
      experiencia: [this.item.experiencia, Validators.required],
      plazo: [this.item.plazo, Validators.required],
      anticipo: [this.item.anticipo, Validators.required],
      observacion: [this.item.observacion || ''],
      cuadroDeObraEstado: [this.item.cuadroDeObraEstado, Validators.required]
    });
  }

  private formatDateForInput(dateStr: string | undefined): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return !isNaN(date.getTime()) ? date.toISOString().slice(0, 16) : '';
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    const formData = { ...this.form.value };

    // Asegurar formato ISO con segundos para ambas fechas
    ['fechaCierre', 'fechaPublicacion'].forEach((field) => {
      if (formData[field] && typeof formData[field] === 'string' && formData[field].length === 16) {
        formData[field] += ':00';
      }
    });

    // Realizamos una única actualización atómica con todos los datos.
    // Esto evita problemas de campos obligatorios faltantes y es más eficiente.
    this.cuadroService.actualizarCuadroDeObra(this.item.id, formData).subscribe({
      next: () => {
        this.loading = false;
        this.saved.emit();
        this.close.emit();
      },
      error: (err) => {
        this.manejarError(err, 'en la actualización de datos');
      },
    });
  }

  private manejarError(err: any, contexto: string): void {
    this.loading = false;
    console.error(`Error (${contexto}):`, err);
    let mensaje = 'Hubo un error al procesar la solicitud.';
    if (err.status === 400) {
      mensaje = 'Error 400: Los datos enviados no son válidos para el servidor. Revisa los formatos de fecha y campos obligatorios.';
    }
    alert(mensaje);
  }
}
