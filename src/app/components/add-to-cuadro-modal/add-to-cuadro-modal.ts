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

  private readonly SMMLV_2026 = 1750905; // Valor SMMLV 2026

  @Input({ required: true }) licitacion!: Licitacion;
  @Output() close = new EventEmitter<void>();
  @Output() saved = new EventEmitter<any>();

  form!: FormGroup;
  loading = false;

  ngOnInit(): void {
    this.initForm();
    this.setupMontoListener();
    this.calculateInitialSMMLV();
  }

  private initForm(): void {
    const ubicacionPartes = this.licitacion.ubicacion ? this.licitacion.ubicacion.split(' - ') : ['', ''];
    const depto = ubicacionPartes[0] || '';
    const muni = ubicacionPartes[1] || '';

    this.form = this.fb.group({
      numeroProceso: [this.licitacion.numero, Validators.required],
      entidadContratante: [this.licitacion.entidad, Validators.required],
      descripcionObjeto: [this.licitacion.objeto, Validators.required],
      estadoProceso: [this.licitacion.estado],
      fechaPublicacion: [this.licitacion.fechaPublicacion],
      departamento: [depto],
      municipio: [muni],
      monto: [this.licitacion.cuantia, [Validators.required, Validators.min(0)]],
      fechaCierre: ['', Validators.required],
      valorSMMLV: [{ value: null, disabled: false }, [Validators.required]],
      tipoProyecto: ['', Validators.required],
      experiencia: ['', Validators.required],
      plazo: ['', Validators.required],
      anticipo: ['', Validators.required],
      observacion: [''],
      cuadroDeObraEstado: ['POR_PRESENTAR']
    });
  }

  private setupMontoListener(): void {
    this.form.get('monto')?.valueChanges.subscribe(monto => {
      this.updateSMMLV(monto);
    });
  }

  private calculateInitialSMMLV(): void {
    const initialMonto = this.form.get('monto')?.value;
    if (initialMonto) {
      this.updateSMMLV(initialMonto);
    }
  }

  private updateSMMLV(monto: number): void {
    if (monto && monto > 0) {
      const calculo = monto / this.SMMLV_2026;
      // Redondeamos a 2 decimales para mayor limpieza
      this.form.get('valorSMMLV')?.patchValue(parseFloat(calculo.toFixed(2)), { emitEvent: false });
    } else {
      this.form.get('valorSMMLV')?.patchValue(0, { emitEvent: false });
    }
  }

  onSubmit(): void {
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
