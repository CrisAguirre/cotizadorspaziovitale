import { Component, OnInit, OnDestroy } from '@angular/core';
import { ProjectService } from '../../services/project.service';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';
import { Project, ProjectStage, ContactSource, StageStateStatus } from '../../models/interfaces';

interface StageMeta {
  key: ProjectStage;
  label: string;
  icon: string;
  actors: string;
  description: string;
  checklist: string[];
}

@Component({
  selector: 'app-proyectos',
  templateUrl: './proyectos.component.html',
  styleUrls: ['./proyectos.component.css']
})
export class ProyectosComponent implements OnInit, OnDestroy {
  projects: Project[] = [];
  isLoading = true;
  search = '';
  filterStage = '';
  filterSource = '';
  filterState = '';
  showForm = false;
  selected: Project | null = null;
  saving = false;
  lastRefresh: Date | null = null;
  autoRefresh = true;
  private refreshTimer: any = null;

  stages: StageMeta[] = [
    {
      key: 'inicio', label: '1. Inicio', icon: '🟢', actors: 'Asesor comercial',
      description: 'Contacto con el cliente y definición del requerimiento o necesidad.',
      checklist: ['Registrar medio de contacto', 'Definir requerimiento o necesidad', 'Asignar asesor comercial']
    },
    {
      key: 'analisis', label: '2. Análisis', icon: '🔍', actors: 'Comercial · Diseño',
      description: 'Se genera la cotización del proyecto.',
      checklist: ['Generar cotización en Cotizaciones', 'Vincular cotización al proyecto']
    },
    {
      key: 'presentacion', label: '3. Presentación', icon: '🖥️', actors: 'Comercial · Cliente',
      description: 'Se socializa el proyecto con el cliente y se recibe retroalimentación. Si aprueba avanza a Contratación; si pide ajustes vuelve a Análisis a regenerar la cotización.',
      checklist: ['Socializar propuesta', 'Registrar retroalimentación', 'Aprobar a Contratación o devolver a Análisis']
    },
    {
      key: 'contratacion', label: '4. Contratación', icon: '📝', actors: 'Contadora',
      description: 'Se genera el contrato y los planos/diseños.',
      checklist: ['Generar contrato', 'Elaborar planos y diseños', 'Aprobar diseños']
    },
    {
      key: 'preparacion', label: '5. Preparación', icon: '📐', actors: 'Diseñador · Operarios',
      description: 'Se solicitan los insumos y se hacen preparaciones varias antes de iniciar la obra.',
      checklist: ['Solicitar insumos', 'Preparaciones varias', 'Verificar medidas/stock']
    },
    {
      key: 'produccion', label: '6. Producción', icon: '🏭', actors: 'Operarios',
      description: 'Se procede a la fabricación.',
      checklist: ['Fabricar', 'Control de calidad', 'Registrar notas de producción']
    },
    {
      key: 'instalacion', label: '7. Instalación', icon: '🔧', actors: 'Operarios',
      description: 'Paso final: se entrega la obra y se recibe el pago final.',
      checklist: ['Instalar y entregar obra', 'Registrar entrega', 'Recibir pago final']
    }
  ];

  stageNotes = '';

  form: Partial<Project> = this.emptyForm();

  constructor(
    private projectService: ProjectService,
    public authService: AuthService,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    this.loadProjects();
    // Tiempo real: re-consulta cada 15s para que todos los actores vean el estado actual
    this.refreshTimer = setInterval(() => {
      if (this.autoRefresh && !this.saving) this.loadProjects(true);
    }, 15000);
  }

  ngOnDestroy(): void {
    if (this.refreshTimer) clearInterval(this.refreshTimer);
  }

  emptyForm(): Partial<Project> {
    return {
      title: '',
      clientName: '',
      clientPhone: '',
      clientEmail: '',
      contactSource: 'almacen' as ContactSource,
      priority: 'media',
      notes: '',
      actors: { asesorComercial: '', contadora: '', operarios: '', disenador: '', asesorDiseno: '' }
    };
  }

  isAdmin(): boolean {
    return this.authService.getUser()?.role === 'admin';
  }

  stageIndex(s?: string): number {
    return this.stages.findIndex((x) => x.key === s);
  }

  stageLabel(s?: string): string {
    return this.stages.find((x) => x.key === s)?.label || (s || '');
  }

  sourceLabel(s?: string): string {
    const m: Record<string, string> = { redes: 'Redes', almacen: 'Almacén', recomendacion: 'Recomendación', recurrente: 'Cliente antiguo', otro: 'Otro' };
    return m[s || ''] || (s || '—');
  }

  loadProjects(silent = false): void {
    if (!silent) this.isLoading = true;
    const params: any = { limit: 200 };
    if (this.search) params.search = this.search;
    if (this.filterStage) params.stage = this.filterStage;
    if (this.filterSource) params.contactSource = this.filterSource;
    this.projectService.getProjects(params).subscribe({
      next: (res) => {
        if (res.success) {
          // Tablero global en tiempo real: todos los actores ven todos los proyectos
          let data = res.data || [];
          if (this.filterState) {
            data = data.filter((p) => this.getStageStatus(p, (p.currentStage || 'inicio') as ProjectStage) === this.filterState);
          }
          this.projects = data;
          this.lastRefresh = new Date();
          // Mantener seleccionado actualizado en tiempo real
          if (this.selected?._id) {
            const fresh = data.find((x) => x._id === this.selected!._id);
            if (fresh) this.selected = fresh;
          }
        }
        this.isLoading = false;
      },
      error: (err) => {
        if (!silent) {
          console.error('Error proyectos:', err);
          this.toast.error('Error', err?.error?.message || 'No se pudieron cargar los proyectos.');
        }
        this.isLoading = false;
      }
    });
  }

  refreshNow(): void {
    this.loadProjects();
  }

  getStageStatus(p: Project, stageKey: ProjectStage): StageStateStatus {
    const s = p.stageStates?.[stageKey]?.status;
    if (s) return s;
    // Fallback para proyectos legacy sin stageStates: deriva de currentStage
    const i = this.stageIndex(p.currentStage);
    const j = this.stageIndex(stageKey);
    if (j < i) return 'completado';
    if (j === i) return 'en_curso';
    return 'pendiente';
  }

  stateLabel(s?: string): string {
    const m: Record<string, string> = {
      pendiente: 'Pendiente', en_curso: 'En curso', completado: 'Completado',
      devuelto: 'Devuelto', bloqueado: 'Bloqueado'
    };
    return m[s || ''] || (s || '—');
  }

  progress(p: Project): number {
    if (!p.stageStates) return Math.round(((this.stageIndex(p.currentStage) + 1) / 7) * 100);
    const done = this.stages.filter((s) => this.getStageStatus(p, s.key) === 'completado').length;
    return Math.round((done / 7) * 100);
  }

  toggleBlock(p: Project, stageKey: ProjectStage): void {
    const current = this.getStageStatus(p, stageKey);
    const next = current === 'bloqueado' ? 'en_curso' : 'bloqueado';
    if (next === 'bloqueado' && !this.isAdmin()) {
      this.toast.warning('Solo admin', 'Solo el administrador puede bloquear etapas.');
      return;
    }
    this.projectService.updateStageState(p._id!, stageKey, next, next === 'bloqueado' ? 'Bloqueado manualmente' : 'Desbloqueado').subscribe({
      next: (res) => {
        if (res.success) {
          this.toast.success('Estado actualizado', `${this.stageLabel(stageKey)} → ${this.stateLabel(next)}`);
          this.selected = res.data;
          this.loadProjects(true);
        }
      },
      error: (err) => this.toast.error('Error', err?.error?.message || 'No se pudo actualizar el estado.')
    });
  }

  onSearch(): void {
    this.loadProjects();
  }

  selectProject(p: Project): void {
    this.selected = p;
    this.stageNotes = '';
  }

  getStageDetail(key?: string): StageMeta | undefined {
    return this.stages.find((x) => x.key === key);
  }

  // Puertas de salida en espejo del backend (para guiar al usuario antes del 400)
  missingFor(p: Project): string[] {
    const missing: string[] = [];
    switch (p.currentStage) {
      case 'inicio':
        if (!p.requirement?.trim()) missing.push('Define el requerimiento o necesidad (etapa 1).');
        break;
      case 'analisis':
        if (!(p.quotationId || p.quotationRef?.trim())) missing.push('Genera y vincula la cotización (etapa 2).');
        break;
      case 'presentacion':
        if (!(this.stageNotes.trim() || p.feedback?.trim())) missing.push('Registra la retroalimentación del cliente (etapa 3).');
        break;
      case 'contratacion':
        if (!p.contractNumber?.trim()) missing.push('Genera el contrato (etapa 4).');
        if (p.designStatus !== 'aprobado') missing.push('Aprueba planos/diseños (etapa 4).');
        break;
      case 'preparacion':
        if (!p.insumosRequested) missing.push('Solicita los insumos (etapa 5).');
        break;
      case 'produccion':
        if (!p.productionNotes?.trim()) missing.push('Registra la fabricación (etapa 6).');
        break;
    }
    return missing;
  }

  // Solo secuencial +/-1 salvo admin (espejo del backend)
  canMove(p: Project, target: ProjectStage): boolean {
    const i = this.stageIndex(p.currentStage);
    const j = this.stageIndex(target);
    if (i === j) return false;
    if (this.isAdmin()) return true;
    return Math.abs(j - i) === 1;
  }

  moveStage(p: Project, target: ProjectStage, notes?: string): void {
    if (!this.canMove(p, target)) {
      this.toast.warning('Movimiento no secuencial', 'Avanza o retrocede de a 1 etapa. Solo admin puede saltar.');
      return;
    }
    const motionNotes = (notes ?? this.stageNotes ?? '').trim();
    const missing = this.missingFor(p);
    if (missing.length > 0) {
      this.toast.warning('Faltan requisitos', missing.join(' '));
      return;
    }
    this.projectService.advanceStage(p._id!, target, motionNotes).subscribe({
      next: (res) => {
        if (res.success) {
          const verb = this.stageIndex(target) > this.stageIndex(p.currentStage) ? 'avanzó' : 'volvió';
          this.toast.success('Etapa actualizada', `${p.title} ${verb} → ${this.stageLabel(target)}`);
          this.stageNotes = '';
          this.loadProjects();
          this.selected = res.data;
        }
      },
      error: (err) => this.toast.error('Error', err?.error?.message || 'No se pudo mover la etapa.')
    });
  }

  nextStage(p: Project): ProjectStage | null {
    const i = this.stageIndex(p.currentStage);
    return i >= 0 && i < this.stages.length - 1 ? this.stages[i + 1].key : null;
  }

  prevStage(p: Project): ProjectStage | null {
    const i = this.stageIndex(p.currentStage);
    return i > 0 ? this.stages[i - 1].key : null;
  }

  advanceSelected(): void {
    if (!this.selected) return;
    const next = this.nextStage(this.selected);
    if (next) this.moveStage(this.selected, next);
  }

  sendBackToAnalisis(): void {
    if (!this.selected) return;
    // Flujo 3 → 2: retroalimentación obligatoria para regenerar cotización
    this.moveStage(this.selected, 'analisis');
  }

  saveStageData(p: Project): void {
    const payload: Partial<Project> = {
      title: p.title,
      clientName: p.clientName,
      requirement: p.requirement,
      quotationRef: p.quotationRef,
      feedback: p.feedback,
      contractNumber: p.contractNumber,
      designStatus: p.designStatus,
      insumosRequested: p.insumosRequested,
      insumosNotes: p.insumosNotes,
      productionNotes: p.productionNotes,
      deliveryDate: p.deliveryDate,
      finalAmount: p.finalAmount,
      finalPaymentReceived: p.finalPaymentReceived,
      deliveryNotes: p.deliveryNotes,
      notes: p.notes
    };
    // No enviar quotationId vacío (el back lo ignora, pero evitamos cast-error)
    if (typeof p.quotationId === 'string' && p.quotationId.trim()) {
      (payload as any).quotationId = p.quotationId.trim();
    }
    this.projectService.updateProject(p._id!, payload).subscribe({
      next: (res) => {
        if (res.success) {
          this.toast.success('Datos guardados', 'Información de la etapa actualizada.');
          this.selected = res.data;
          this.loadProjects();
        }
      },
      error: (err) => this.toast.error('Error', err?.error?.message || 'No se pudo guardar.')
    });
  }

  saveNew(): void {
    if (!this.form.title?.trim() || !this.form.clientName?.trim()) {
      this.toast.warning('Faltan datos', 'Título y cliente son obligatorios.');
      return;
    }
    this.saving = true;
    this.projectService.createProject(this.form).subscribe({
      next: (res) => {
        if (res.success) {
          this.toast.success('Proyecto creado', res.data.title);
          this.showForm = false;
          this.form = this.emptyForm();
          this.loadProjects();
        }
        this.saving = false;
      },
      error: (err) => {
        this.toast.error('Error', err?.error?.message || 'No se pudo crear.');
        this.saving = false;
      }
    });
  }

  deleteProject(p: Project): void {
    this.toast.confirm({
      title: 'Eliminar proyecto',
      message: `¿Eliminar "${p.title}"? Solo admin.`,
      confirmText: 'Sí, eliminar',
      type: 'danger'
    }).then((ok) => {
      if (!ok) return;
      this.projectService.deleteProject(p._id!).subscribe({
        next: () => {
          this.toast.success('Eliminado', p.title);
          if (this.selected?._id === p._id) this.selected = null;
          this.loadProjects();
        },
        error: (err) => this.toast.error('Error', err?.error?.message || 'No se pudo eliminar.')
      });
    });
  }
}
