import { Component, EventEmitter, Input, OnInit, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CuadroDeObraService } from '../../pages/CuadroDeObra/service/cuadro-de-obra.service';
import { RequisitoLicitacion } from '../../pages/CuadroDeObra/interface/cuadro-de-obra';

@Component({
  selector: 'app-requisito-licitacion-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './requisito-licitacion-modal.html',
})
export class RequisitoLicitacionModal implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly cuadroService = inject(CuadroDeObraService);

  @Input({ required: true }) cuadroObraId!: number;
  @Input() initialData?: RequisitoLicitacion; // Opcional, por si se quiere editar luego
  @Output() close = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  form!: FormGroup;
  loading = false;

  ngOnInit(): void {
    this.initForm();
  }

  private initForm(): void {
    this.form = this.fb.group({
      // Experiencia
      general: [this.initialData?.general || '', [Validators.required]],
      especifica1: [this.initialData?.especifica1 || '', [Validators.required]],
      especifica2: [this.initialData?.especifica2 || '', [Validators.required]],
      secundaria: [this.initialData?.secundaria || '', [Validators.required]],
      // Capacidad Técnica
      contrato: [this.initialData?.contrato || 1, [Validators.required, Validators.min(1)]],
      // Indicadores Financieros
      ctProceso: [this.initialData?.ctProceso || 0, [Validators.required, Validators.min(0)]],
      patrimonio: [this.initialData?.patrimonio || 0, [Validators.required, Validators.min(0)]],
      n: [this.initialData?.n || 1, [Validators.required, Validators.min(0.1)]],
      liquidez: [this.initialData?.liquidez || 0, [Validators.required, Validators.min(0)]],
      endeudamiento: [this.initialData?.endeudamiento || 0, [Validators.required, Validators.min(0)]],
      razonCoberturaInteres: [this.initialData?.razonCoberturaInteres || 0, [Validators.required, Validators.min(0)]],
      rentabilidadPatrimonio: [this.initialData?.rentabilidadPatrimonio || 0, [Validators.required, Validators.min(0)]],
      rentabilidadActivo: [this.initialData?.rentabilidadActivo || 0, [Validators.required, Validators.min(0)]],
      // Capacidad Residual
      kresidualProceso: [this.initialData?.kresidualProceso || 0, [Validators.required, Validators.min(0)]],
      poeAnticipo: [this.initialData?.poeAnticipo || 0, [Validators.required, Validators.min(0), Validators.max(100)]],
    });
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    const formData: RequisitoLicitacion = this.form.value;

    this.cuadroService.guardarRequisitos(this.cuadroObraId, formData).subscribe({
      next: () => {
        this.loading = false;
        this.saved.emit();
        this.close.emit();
      },
      error: (err) => {
        this.loading = false;
        console.error('Error al guardar requisitos:', err);
        alert('Hubo un error al guardar los requisitos de la licitación.');
      },
    });
  }
}
