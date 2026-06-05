import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { UsuarioService } from './service/usuario.service';
import { ROL_LABEL, Rol, Usuario } from '../../auth/interface/auth';
import { AlertService } from '../../services/alert.service';

@Component({
  selector: 'app-usuarios',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './usuarios.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UsuariosComponent implements OnInit {
  private readonly usuarioService = inject(UsuarioService);
  private readonly alerta = inject(AlertService);
  private readonly fb = inject(FormBuilder);

  readonly usuarios = signal<Usuario[]>([]);
  readonly loading = signal(false);
  readonly searchTerm = signal('');

  // --- MODAL DE CREACIÓN ---
  readonly showModal = signal(false);
  readonly saving = signal(false);
  readonly mostrarPassword = signal(false);
  readonly formError = signal<string | null>(null);

  readonly roles: Rol[] = ['ANALISTA', 'PROPIETARIO', 'ADMIN'];
  readonly rolLabel = ROL_LABEL;

  readonly form = this.fb.nonNullable.group({
    nombre: ['', [Validators.required, Validators.minLength(3)]],
    correo: ['', [Validators.required, Validators.email]],
    contrasena: ['', [Validators.required, Validators.minLength(8)]],
    rol: ['ANALISTA' as Rol, [Validators.required]],
  });

  readonly filteredUsuarios = computed(() => {
    const term = this.searchTerm().toLowerCase().trim();
    const data = this.usuarios();
    if (!term) return data;
    return data.filter(
      (u) =>
        u.nombre.toLowerCase().includes(term) ||
        u.correo.toLowerCase().includes(term) ||
        ROL_LABEL[u.rol].toLowerCase().includes(term)
    );
  });

  ngOnInit(): void {
    this.cargarUsuarios();
  }

  cargarUsuarios(): void {
    this.loading.set(true);
    this.usuarioService.listarUsuarios().subscribe({
      next: (data) => {
        this.usuarios.set(data ?? []);
        this.loading.set(false);
      },
      error: () => {
        this.usuarios.set([]);
        this.loading.set(false);
      },
    });
  }

  abrirModal(): void {
    this.form.reset({ nombre: '', correo: '', contrasena: '', rol: 'ANALISTA' });
    this.formError.set(null);
    this.mostrarPassword.set(false);
    this.showModal.set(true);
  }

  cerrarModal(): void {
    if (this.saving()) return;
    this.showModal.set(false);
  }

  togglePassword(): void {
    this.mostrarPassword.update((v) => !v);
  }

  esInvalido(control: 'nombre' | 'correo' | 'contrasena' | 'rol'): boolean {
    const c = this.form.controls[control];
    return c.invalid && (c.touched || c.dirty);
  }

  guardar(): void {
    this.formError.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    this.usuarioService.crearUsuario(this.form.getRawValue()).subscribe({
      next: () => {
        this.saving.set(false);
        this.showModal.set(false);
        this.alerta.success('El usuario se creó correctamente.', 'Usuario creado');
        this.cargarUsuarios();
      },
      error: (err: HttpErrorResponse) => {
        this.saving.set(false);
        if (err.status === 409) {
          this.formError.set('Ese correo ya está registrado. Usa uno diferente.');
        } else {
          this.formError.set('No se pudo crear el usuario. Verifica los datos e intenta de nuevo.');
        }
      },
    });
  }

  rolBadge(rol: Rol): string {
    switch (rol) {
      case 'ADMIN':
        return 'bg-indigo-100 text-indigo-700 border-indigo-200';
      case 'ANALISTA':
        return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'PROPIETARIO':
        return 'bg-amber-100 text-amber-700 border-amber-200';
    }
  }

  iniciales(nombre: string): string {
    return (
      nombre
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((p) => p.charAt(0).toUpperCase())
        .join('') || '?'
    );
  }
}
