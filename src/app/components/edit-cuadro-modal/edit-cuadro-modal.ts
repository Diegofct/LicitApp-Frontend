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
    // Si la fechaCierre viene del backend, suele ser un string ISO. 
    // Para datetime-local necesitamos formato "YYYY-MM-DDTHH:MM"
    let formattedDate = '';
    if (this.item.fechaCierre) {
      const date = new Date(this.item.fechaCierre);
      if (!isNaN(date.getTime())) {
         formattedDate = date.toISOString().slice(0, 16);
      }
    }

    this.form = this.fb.group({
      id: [this.item.id],
      numeroProceso: [this.item.numeroProceso, Validators.required],
      entidadContratante: [this.item.entidadContratante, Validators.required],
      descripcionObjeto: [this.item.descripcionObjeto, Validators.required],
      estadoProceso: [this.item.estadoProceso],
      fechaPublicacion: [this.item.fechaPublicacion],
      departamento: [this.item.departamento],
      municipio: [this.item.municipio],
      monto: [this.item.monto, [Validators.required, Validators.min(0)]],
      fechaCierre: [formattedDate, Validators.required],
      valorSMMLV: [this.item.valorSMMLV, [Validators.required]],
      tipoProyecto: [this.item.tipoProyecto, Validators.required],
      experiencia: [this.item.experiencia, Validators.required],
      plazo: [this.item.plazo, Validators.required],
      anticipo: [this.item.anticipo, Validators.required],
      observacion: [this.item.observacion || ''],
      cuadroDeObraEstado: [this.item.cuadroDeObraEstado, Validators.required]
    });
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    // 1. Clonamos los datos para no afectar al formulario
    const formData = { ...this.form.value };
    
    // 2. Aseguramos que la fechaCierre tenga segundos (:00) si le falta para que el backend la acepte
    if (formData.fechaCierre && formData.fechaCierre.length === 16) {
      formData.fechaCierre += ':00';
    }

    // 3. Verificar si el estado ha cambiado para usar el nuevo endpoint de PATCH
    const estadoHaCambiado = formData.cuadroDeObraEstado !== this.item.cuadroDeObraEstado;

    // Preparamos los datos para el PUT (eliminamos el ID del body para evitar conflictos con la URL en el backend)
    const { id, ...dataToUpdate } = formData;

    // Si el estado cambió, primero actualizamos el estado y luego el resto de datos
    if (estadoHaCambiado) {
      this.cuadroService.actualizarEstado(this.item.id, formData.cuadroDeObraEstado).subscribe({
        next: () => {
          this.procederConActualizacionGeneral(dataToUpdate);
        },
        error: (err) => {
          this.manejarError(err, 'error al cambiar el estado');
        }
      });
    } else {
      this.procederConActualizacionGeneral(dataToUpdate);
    }
  }

  private procederConActualizacionGeneral(data: any): void {
    this.cuadroService.actualizarCuadroDeObra(this.item.id, data).subscribe({
      next: (response) => {
        console.log('Actualización completa exitosa:', response);
        this.loading = false;
        this.saved.emit();
        this.close.emit();
      },
      error: (err) => {
        this.manejarError(err, 'error en la actualización general');
      }
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
