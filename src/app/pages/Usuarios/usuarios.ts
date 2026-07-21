import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { UsuarioService } from './service/usuario.service';
import { ROL_LABEL, Rol, Usuario } from '../../auth/interface/auth';
import { AlertService } from '../../services/alert.service';
import { AuthService } from '../../auth/service/auth.service';

/** Valida que los campos `contrasena` y `confirmar` del grupo coincidan. */
function contrasenasCoinciden(group: AbstractControl): ValidationErrors | null {
  const contrasena = group.get('contrasena')?.value;
  const confirmar = group.get('confirmar')?.value;
  return contrasena === confirmar ? null : { noCoincide: true };
}

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
  private readonly auth = inject(AuthService);

  readonly usuarios = signal<Usuario[]>([]);
  readonly loading = signal(false);
  readonly searchTerm = signal('');

  // --- ESTADO COMPARTIDO DE MODALES ---
  readonly saving = signal(false);
  readonly mostrarPassword = signal(false);
  readonly mostrarPasswordConfirmar = signal(false);
  readonly formError = signal<string | null>(null);

  // --- MODAL DE CREACIÓN ---
  readonly showModal = signal(false);

  // --- MODAL DE EDICIÓN ---
  readonly showEditModal = signal(false);
  readonly usuarioEditando = signal<Usuario | null>(null);

  // --- MODAL DE RESTABLECER CONTRASEÑA ---
  readonly showResetModal = signal(false);
  readonly usuarioReset = signal<Usuario | null>(null);

  // --- CONFIRMACIÓN DE CAMBIO DE ESTADO ---
  readonly usuarioConfirmEstado = signal<Usuario | null>(null);

  readonly roles: Rol[] = ['ANALISTA', 'ADMIN'];
  readonly rolLabel = ROL_LABEL;

  /** Id del usuario autenticado (para salvaguardas RF11 sobre la propia fila). */
  readonly usuarioActualId = computed(() => this.auth.getUsuarioActual()?.id ?? null);

  readonly form = this.fb.nonNullable.group({
    nombre: ['', [Validators.required, Validators.minLength(3)]],
    correo: ['', [Validators.required, Validators.email]],
    contrasena: ['', [Validators.required, Validators.minLength(8)]],
    rol: ['ANALISTA' as Rol, [Validators.required]],
  });

  readonly editForm = this.fb.nonNullable.group({
    nombre: ['', [Validators.required, Validators.minLength(3)]],
    correo: ['', [Validators.required, Validators.email]],
    rol: ['ANALISTA' as Rol, [Validators.required]],
  });

  readonly resetForm = this.fb.nonNullable.group(
    {
      contrasena: ['', [Validators.required, Validators.minLength(8)]],
      confirmar: ['', [Validators.required, Validators.minLength(8)]],
    },
    { validators: contrasenasCoinciden }
  );

  /**
   * Roles ofrecibles en el modal de edición. Si el usuario edita su propia cuenta
   * de ADMIN, no puede degradarse a ANALISTA (RF11): solo se ofrece ADMIN.
   */
  readonly rolesEdicion = computed<Rol[]>(() => {
    const editando = this.usuarioEditando();
    if (editando && editando.id === this.usuarioActualId() && editando.rol === 'ADMIN') {
      return ['ADMIN'];
    }
    return this.roles;
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

  /** true si la fila corresponde al usuario autenticado (para ocultar acciones peligrosas). */
  esFilaPropia(usuario: Usuario): boolean {
    return usuario.id === this.usuarioActualId();
  }

  togglePassword(): void {
    this.mostrarPassword.update((v) => !v);
  }

  togglePasswordConfirmar(): void {
    this.mostrarPasswordConfirmar.update((v) => !v);
  }

  // --- CREAR ---

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

  // --- EDITAR ---

  abrirEdicion(usuario: Usuario): void {
    this.usuarioEditando.set(usuario);
    this.editForm.reset({ nombre: usuario.nombre, correo: usuario.correo, rol: usuario.rol });
    this.formError.set(null);
    this.showEditModal.set(true);
  }

  cerrarEdicion(): void {
    if (this.saving()) return;
    this.showEditModal.set(false);
    this.usuarioEditando.set(null);
  }

  esInvalidoEdit(control: 'nombre' | 'correo' | 'rol'): boolean {
    const c = this.editForm.controls[control];
    return c.invalid && (c.touched || c.dirty);
  }

  actualizar(): void {
    const usuario = this.usuarioEditando();
    if (!usuario) return;

    this.formError.set(null);
    if (this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    this.usuarioService.actualizarUsuario(usuario.id, this.editForm.getRawValue()).subscribe({
      next: (actualizado) => {
        this.saving.set(false);
        this.showEditModal.set(false);
        this.usuarioEditando.set(null);
        this.usuarios.update((lista) =>
          lista.map((u) => (u.id === actualizado.id ? actualizado : u))
        );
        this.alerta.success('Los cambios se guardaron correctamente.', 'Usuario actualizado');
      },
      error: (err: HttpErrorResponse) => {
        this.saving.set(false);
        if (err.status === 409) {
          this.formError.set('Ese correo ya está registrado. Usa uno diferente.');
        } else if (err.status === 400) {
          this.formError.set(
            err.error?.message ?? 'No se pudo actualizar el usuario. Verifica los datos.'
          );
        } else {
          this.formError.set('No se pudo actualizar el usuario. Intenta de nuevo.');
        }
      },
    });
  }

  // --- RESTABLECER CONTRASEÑA ---

  abrirReset(usuario: Usuario): void {
    this.usuarioReset.set(usuario);
    this.resetForm.reset({ contrasena: '', confirmar: '' });
    this.formError.set(null);
    this.mostrarPassword.set(false);
    this.mostrarPasswordConfirmar.set(false);
    this.showResetModal.set(true);
  }

  cerrarReset(): void {
    if (this.saving()) return;
    this.showResetModal.set(false);
    this.usuarioReset.set(null);
  }

  esInvalidoReset(control: 'contrasena' | 'confirmar'): boolean {
    const c = this.resetForm.controls[control];
    return c.invalid && (c.touched || c.dirty);
  }

  restablecer(): void {
    const usuario = this.usuarioReset();
    if (!usuario) return;

    this.formError.set(null);
    if (this.resetForm.invalid) {
      this.resetForm.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    this.usuarioService
      .restablecerContrasena(usuario.id, this.resetForm.getRawValue().contrasena)
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.showResetModal.set(false);
          this.usuarioReset.set(null);
          this.alerta.success(
            `La contraseña de ${usuario.nombre} se actualizó correctamente.`,
            'Contraseña actualizada'
          );
        },
        error: (err: HttpErrorResponse) => {
          this.saving.set(false);
          if (err.status === 400) {
            this.formError.set(err.error?.message ?? 'La contraseña no cumple los requisitos.');
          } else {
            this.formError.set('No se pudo restablecer la contraseña. Intenta de nuevo.');
          }
        },
      });
  }

  // --- DESACTIVAR / REACTIVAR ---

  pedirConfirmacionEstado(usuario: Usuario): void {
    this.usuarioConfirmEstado.set(usuario);
  }

  cancelarConfirmacionEstado(): void {
    if (this.saving()) return;
    this.usuarioConfirmEstado.set(null);
  }

  confirmarCambioEstado(): void {
    const usuario = this.usuarioConfirmEstado();
    if (!usuario) return;

    const nuevoEstado = !usuario.activo;
    this.saving.set(true);
    this.usuarioService.cambiarEstado(usuario.id, nuevoEstado).subscribe({
      next: () => {
        this.saving.set(false);
        this.usuarioConfirmEstado.set(null);
        this.alerta.success(
          nuevoEstado
            ? `${usuario.nombre} fue reactivado correctamente.`
            : `${usuario.nombre} fue desactivado correctamente.`,
          nuevoEstado ? 'Usuario reactivado' : 'Usuario desactivado'
        );
        this.cargarUsuarios();
      },
      error: (err: HttpErrorResponse) => {
        this.saving.set(false);
        this.usuarioConfirmEstado.set(null);
        const mensaje =
          err.status === 400
            ? err.error?.message ?? 'No se puede realizar esta acción sobre el usuario.'
            : 'No se pudo cambiar el estado del usuario. Intenta de nuevo.';
        this.alerta.error(mensaje, 'Acción no permitida');
      },
    });
  }

  rolBadge(rol: Rol): string {
    switch (rol) {
      case 'ADMIN':
        return 'bg-indigo-100 text-indigo-700 border-indigo-200';
      case 'ANALISTA':
        return 'bg-emerald-100 text-emerald-700 border-emerald-200';
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
