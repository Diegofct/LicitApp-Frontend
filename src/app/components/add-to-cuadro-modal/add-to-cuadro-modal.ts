import { Component, EventEmitter, Input, OnInit, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Licitacion } from '../../pages/Licitaciones/interface/licitaciones';
import { CuadroDeObraService } from '../../pages/CuadroDeObra/service/cuadro-de-obra.service';

@Component({
  selector: 'app-add-to-cuadro-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './add-to-cuadro-modal.html',
})
export class AddToCuadroModal implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly cuadroService = inject(CuadroDeObraService);

  @Input({ required: true }) licitacion!: Licitacion;
  @Output() close = new EventEmitter<void>();
  @Output() saved = new EventEmitter<any>();

  form!: FormGroup;
  loading = false;

  ngOnInit(): void {
    this.initForm();
  }

      private initForm(): void {
        // Dividir la ubicación (ej: "ANTIOQUIA - MEDELLIN") si es posible
        const ubicacionPartes = this.licitacion.ubicacion ? this.licitacion.ubicacion.split(' - ') : ['', ''];
        const depto = ubicacionPartes[0] || '';
        const muni = ubicacionPartes[1] || '';
    
        this.form = this.fb.group({
          // --- CAMPOS AUTOMÁTICOS (De SECOP) ---
          numeroProceso: [this.licitacion.idDelProceso, Validators.required],
          entidadContratante: [this.licitacion.entidad, Validators.required],
          descripcionObjeto: [this.licitacion.objeto, Validators.required],
          estadoProceso: [this.licitacion.estado],
          fechaPublicacion: [this.licitacion.fechaPublicacion],
          departamento: [depto],
          municipio: [muni],
          monto: [this.licitacion.cuantia, [Validators.required, Validators.min(0)]],
          
          // --- CAMPOS MANUALES (Requeridos para Cuadro de Obra) ---
          fechaCierre: ['', Validators.required],
          valorSMMLV: [null, [Validators.required]],
          tipoProyecto: ['', Validators.required],
          experiencia: ['', Validators.required],
          plazo: ['', Validators.required],
          anticipo: ['', Validators.required],
          observacion: [''],
          cuadroDeObraEstado: ['POR_PRESENTAR']
        });
      }  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    const rawData = this.form.value;

    this.cuadroService.agregarACuadroDeObra(rawData).subscribe({
      next: (response) => {
        this.loading = false;
        this.saved.emit(response);
        this.close.emit();
      },
      error: (err) => {
        this.loading = false;
        console.error('Error al guardar en Cuadro de Obra:', err);
        // Aquí podrías añadir una notificación visual de error (Toast)
      }
    });
  }
}
