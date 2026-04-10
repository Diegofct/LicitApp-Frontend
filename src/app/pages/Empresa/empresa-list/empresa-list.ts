import { Component, OnInit, inject, signal, ChangeDetectionStrategy, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EmpresaService } from '../service/empresa.service';
import { Router, RouterLink } from '@angular/router';
import { Empresa } from '../interface/empresa';
import { FormsModule } from '@angular/forms';
import { ConfirmModal } from '../../../components/confirm-modal/confirm-modal';

@Component({
  selector: 'app-empresa-list',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, ConfirmModal],
  templateUrl: './empresa-list.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmpresaListComponent implements OnInit {
  private readonly empresaService = inject(EmpresaService);
  private readonly router = inject(Router);

  // --- ESTADO CON SIGNALS ---
  empresas = signal<Empresa[]>([]);
  loading = signal(false);
  searchTerm = signal('');

  // --- MODAL DE ELIMINACIÓN ---
  showConfirmModal = signal(false);
  empresaToDelete = signal<Empresa | null>(null);

  // --- FILTRADO POR NIT O RAZÓN SOCIAL ---
  filteredEmpresas = computed(() => {
    const term = this.searchTerm().toLowerCase();
    const data = this.empresas();
    if (!term) return data;
    
    return data.filter(emp => 
      (emp.nit?.toLowerCase().includes(term)) || 
      (emp.razonSocial?.toLowerCase().includes(term))
    );
  });

  ngOnInit(): void {
    this.loadEmpresas();
  }

  loadEmpresas(): void {
    this.loading.set(true);
    this.empresaService.listarEmpresas().subscribe({
      next: (data) => {
        this.empresas.set(data || []);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error al cargar empresas:', err);
        this.loading.set(false);
        this.empresas.set([]);
      }
    });
  }

  editarEmpresa(nit: string): void {
    this.router.navigate(['/empresas/editar', nit]);
  }

  confirmarEliminacion(empresa: Empresa): void {
    this.empresaToDelete.set(empresa);
    this.showConfirmModal.set(true);
  }

  eliminarEmpresa(): void {
    const empresa = this.empresaToDelete();
    if (!empresa) return;

    this.loading.set(true);
    this.empresaService.eliminarEmpresa(empresa.nit).subscribe({
      next: () => {
        this.loadEmpresas();
        this.showConfirmModal.set(false);
        this.empresaToDelete.set(null);
      },
      error: (err) => {
        console.error('Error al eliminar empresa:', err);
        this.loading.set(false);
        this.showConfirmModal.set(false);
      }
    });
  }

  verAnalisis(empresa: Empresa): void {
    // Futura integración con módulo de Cuadro de Obra
    console.log('Ver análisis de cumplimiento para:', empresa.razonSocial);
    // Podrías navegar a una ruta de análisis o abrir un modal
  }

  getBadgeClass(tamano: string): string {
    switch (tamano) {
      case 'GRANDE': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'MEDIANA': return 'bg-green-100 text-green-800 border-green-200';
      case 'PEQUEÑA': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'MICROEMPRESA': return 'bg-purple-100 text-purple-800 border-purple-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  }
}
