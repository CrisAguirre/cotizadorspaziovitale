import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ProjectService } from '../../services/project.service';
import { QuotationService } from '../../services/quotation.service';
import { UserService } from '../../services/user.service';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';
import { Project, ProjectStage, ContactSource, StageStateStatus, Quotation } from '../../models/interfaces';

interface SubstepMeta {
  key: string;
  label: string;
  responsible: string;
  hint?: string;
}

interface StageMeta {
  key: ProjectStage;
  label: string;
  icon: string;
  actors: string;
  description: string;
  checklist: string[];
  substeps: SubstepMeta[];
  pending?: boolean;
}

@Component({
  selector: 'app-proyectos',
  templateUrl: './proyectos.component.html',
  styleUrls: ['./proyectos.component.css']
})
export class ProyectosComponent implements OnInit, OnDestroy {
  projects: Project[] = [];
  quotations: Quotation[] = [];
  users: { email: string; role: string }[] = [];
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
      checklist: ['Registrar medio de contacto', 'Definir requerimiento o necesidad', 'Asignar asesor comercial'],
      substeps: [
        { key: '1.1', label: 'Recepción del cliente', responsible: 'Asesor comercial' },
        { key: '1.2', label: 'Identificación de la necesidad (compra, fabricación, etc.)', responsible: 'Asesor comercial' },
        { key: '1.3', label: 'Obtención de información para presupuesto de diseño', responsible: 'Asesor comercial · Diseñador' },
        { key: '1.4', label: 'Presupuesto de diseño', responsible: 'Diseñador' },
        { key: '1.5', label: 'Pago de diseño (previa aprobación de 1.4)', responsible: 'Contadora' }
      ]
    },
    {
      key: 'analisis', label: '2. Análisis', icon: '🔍', actors: 'Comercial · Diseño',
      description: 'Se genera la cotización del proyecto.',
      checklist: ['Generar cotización en Cotizaciones', 'Vincular cotización al proyecto'],
      substeps: [
        { key: '2.1', label: 'Elaboración de diseño', responsible: 'Diseñador' },
        { key: '2.2', label: 'Presentación de diseño', responsible: 'Asesor comercial · Diseñador' },
        { key: '2.3', label: 'Confirmación de existencia de materiales y productos', responsible: 'Diseñador · Operarios' },
        { key: '2.4', label: 'Generación de cotización', responsible: 'Asesor comercial' }
      ]
    },
    {
      key: 'presentacion', label: '3. Presentación', icon: '🖥️', actors: 'Comercial · Cliente',
      description: 'Se socializa el proyecto con el cliente y se recibe retroalimentación.',
      checklist: ['Socializar propuesta', 'Registrar retroalimentación', 'Aprobar a Contratación o devolver a Análisis'],
      substeps: [
        { key: '3.1', label: 'Socialización de cotización', responsible: 'Asesor comercial' },
        { key: '3.2', label: 'Socialización de electrodomésticos', responsible: 'Asesor comercial' }
      ]
    },
    {
      key: 'contratacion', label: '4. Contratación', icon: '📝', actors: 'Contadora · Comercial',
      description: 'Se genera el contrato y los planos/diseños.',
      checklist: ['Generar contrato', 'Elaborar planos y diseños', 'Aprobar diseños', 'Confirmar abono 60%'],
      substeps: [
        { key: '4.1', label: 'Elaboración de contrato (jalar cotización guardada)', responsible: 'Contadora' },
        { key: '4.2', label: 'Elaboración de planos', responsible: 'Diseñador' },
        { key: '4.3', label: 'Firma de documentos (cliente y administración)', responsible: 'Contadora · Asesor comercial' },
        { key: '4.4', label: 'Confirmación abono 60%', responsible: 'Contadora' }
      ]
    },
    {
      key: 'preparacion', label: '5. Preparación', icon: '📐', actors: 'Diseñador · Operarios',
      description: 'Se solicitan los insumos y se hacen preparaciones varias antes de iniciar la obra.',
      checklist: ['Enviar documento a diseñador', 'Carga de pedido de materiales', 'Revisión y checklist de materiales'],
      substeps: [
        { key: '5.1', label: 'Envío de documento a diseñador', responsible: 'Asesor comercial' },
        { key: '5.2', label: 'Carga de pedido de materiales (cotización guardada)', responsible: 'Diseñador' },
        { key: '5.3', label: 'Revisión y checklist de materiales', responsible: 'Operarios' }
      ]
    },
    {
      key: 'produccion', label: '6. Producción', icon: '🏭', actors: 'Operarios',
      description: 'Módulo pendiente de definición por Spazio Vitale.',
      checklist: ['Pendiente de definición'],
      substeps: [
        { key: '6.1', label: 'Pendiente de definición por Spazio Vitale', responsible: 'Operarios' }
      ],
      pending: true
    },
    {
      key: 'instalacion', label: '7. Instalación', icon: '🔧', actors: 'Operarios',
      description: 'Módulo pendiente de definición por Spazio Vitale.',
      checklist: ['Pendiente de definición'],
      substeps: [
        { key: '7.1', label: 'Pendiente de definición por Spazio Vitale', responsible: 'Operarios' }
      ],
      pending: true
    }
  ];

  stageNotes = '';
  viewStage: ProjectStage | null = null;
  substepHints: Record<string, string> = {
    '1.1': 'Registrar medio de contacto y datos iniciales del cliente.',
    '1.2': 'Identificar si es compra, fabricación u otro. Definir requerimiento.',
    '1.3': 'Recopilar medidas, referencias y presupuesto preliminar de diseño.',
    '1.4': 'Elaborar y aprobar el presupuesto de diseño.',
    '1.5': 'Registrar pago del diseño tras aprobación.',
    '2.1': 'Elaborar el diseño técnico del proyecto.',
    '2.2': 'Presentar el diseño al cliente y registrar observaciones.',
    '2.3': 'Confirmar existencia de materiales y productos.',
    '2.4': 'Generar y vincular la cotización guardada (no temporal).',
    '3.1': 'Socializar la cotización con el cliente.',
    '3.2': 'Socializar electrodomésticos incluidos.',
    '4.1': 'Elaborar contrato jalonando la cotización guardada.',
    '4.2': 'Elaborar planos y diseños.',
    '4.3': 'Firmar documentos (cliente y administración).',
    '4.4': 'Confirmar abono del 60%.',
    '5.1': 'Enviar documento al diseñador.',
    '5.2': 'Cargar pedido de materiales desde la cotización guardada.',
    '5.3': 'Revisar y completar checklist de materiales.',
    '6.1': 'Pendiente de definición por Spazio Vitale.',
    '7.1': 'Pendiente de definición por Spazio Vitale.'
  };
  adjustmentReason = '';
  stepSubstep = '';
  stepStatus: 'pendiente' | 'en_curso' | 'completado' | 'bloqueado' = 'en_curso';
  stepResponsible = '';
  stepNotes = '';

  form: Partial<Project> = this.emptyForm();

  constructor(
    private projectService: ProjectService,
    private quotationService: QuotationService,
    private userService: UserService,
    private route: ActivatedRoute,
    public authService: AuthService,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    this.loadProjects();
    this.loadQuotations();
    this.loadUsers();
    // Tiempo real: re-consulta cada 15s para que todos los actores vean el estado actual
    this.refreshTimer = setInterval(() => {
      if (this.autoRefresh && !this.saving) this.loadProjects(true);
    }, 15000);
  }

  loadUsers(): void {
    this.userService.getUsers().subscribe({
      next: (res) => { if (res.success) this.users = res.data || []; },
      error: () => {}
    });
  }

  usersByRole(...roles: string[]): { email: string; role: string }[] {
    return this.users.filter((u) => roles.includes(u.role));
  }

  loadQuotations(): void {
    this.quotationService.getQuotations({ limit: 200 }).subscribe({
      next: (res) => { if (res.success) this.quotations = res.data || []; },
      error: () => {}
    });
  }

  linkQuotation(p: Project, q: Quotation): void {
    p.quotationId = q._id;
    p.quotationRef = String(q.number);
  }

  onQuotationSelect(p: Project, event: any): void {
    const id = event?.target?.value;
    const q = this.quotations.find((x) => x._id === id);
    if (q) this.linkQuotation(p, q);
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
           // Seleccionar proyecto por query param (desde panel de control)
           const qid = this.route.snapshot.queryParamMap.get('id');
           if (qid && !this.selected) {
             const found = data.find((x) => x._id === qid);
             if (found) this.selected = found;
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
    this.viewStage = (p.currentStage || 'inicio') as ProjectStage;
    this.stageNotes = '';
  }

  viewStageDetail(stage: ProjectStage): void {
    // Consulta: no cambia la etapa actual del proyecto
    this.viewStage = stage;
  }

  stageActors(stage?: string): string[] {
    const map: Record<string, string[]> = {
      inicio: ['asesor_comercial'],
      analisis: ['asesor_comercial', 'disenador', 'asesor_diseno'],
      presentacion: ['asesor_comercial', 'cliente'],
      contratacion: ['contadora', 'asesor_comercial'],
      preparacion: ['disenador', 'operarios'],
      produccion: ['operarios'],
      instalacion: ['operarios']
    };
    return map[stage || ''] || [];
  }

  roleActors(role?: string): string[] {
    const map: Record<string, string[]> = {
      admin: ['asesor_comercial', 'contadora', 'operarios', 'disenador', 'asesor_diseno', 'cliente'],
      comercial: ['asesor_comercial', 'cliente'],
      contabilidad: ['contadora'],
      diseno: ['disenador', 'asesor_diseno', 'operarios']
    };
    return map[role || ''] || [];
  }

  canEditStage(stage?: string): boolean {
    if (this.isAdmin()) return true;
    const role = this.authService.getUser()?.role;
    const allowed = this.roleActors(role);
    const responsibles = this.stageActors(stage);
    return responsibles.some((a) => allowed.includes(a));
  }

  isLockedField(p: Project, field: string): boolean {
    // Campos sensibles bloqueados una vez diligenciados
    if (field === 'designStatus') return p.designStatus === 'aprobado';
    const lockedFields = ['contractNumber', 'documentsSignedClient', 'documentsSignedAdmin', 'payment60Received', 'finalPaymentReceived', 'deliveryDate'];
    if (!lockedFields.includes(field)) return false;
    const val = (p as any)[field];
    if (typeof val === 'boolean') return val === true;
    return !!val;
  }

  requestAdjustment(p: Project, stage: ProjectStage): void {
    const reason = this.adjustmentReason.trim();
    if (!reason) {
      this.toast.warning('Falta justificación', 'Describe el motivo del ajuste solicitado.');
      return;
    }
    this.projectService.updateStep(p._id!, {
      stage,
      substep: '',
      status: this.getStageStatus(p, stage),
      responsible: '',
      notes: 'Solicitud de ajuste: ' + reason,
      kind: 'solicitud_ajuste',
      reason
    }).subscribe({
      next: (res) => {
        if (res.success) {
          this.toast.success('Solicitud enviada', 'El admin revisará el ajuste.');
          this.adjustmentReason = '';
          this.selected = res.data;
          this.loadProjects(true);
        }
      },
      error: (err) => this.toast.error('Error', err?.error?.message || 'No se pudo registrar la solicitud.')
    });
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

  updateStep(p: Project): void {
    const stage = p.currentStage || 'inicio';
    const substep = this.stepSubstep || '';
    this.projectService.updateStep(p._id!, {
      stage,
      substep,
      status: this.stepStatus,
      responsible: this.stepResponsible,
      notes: this.stepNotes
    }).subscribe({
      next: (res) => {
        if (res.success) {
          this.toast.success('Paso actualizado', `${stage}${substep ? ' · ' + substep : ''} → ${this.stepStatus}`);
          this.stepNotes = '';
          this.selected = res.data;
          this.loadProjects(true);
        }
      },
      error: (err) => this.toast.error('Error', err?.error?.message || 'No se pudo actualizar el paso.')
    });
  }

  stageDetailInfo(p: Project, stage: ProjectStage, substep: string): any {
    return p.stageDetails?.[stage]?.[substep || '_general'];
  }

  isSubstepCompleted(p: Project, substepKey: string): boolean {
    const stage = (p.currentStage || 'inicio') as ProjectStage;
    const info = p.stageDetails?.[stage]?.[substepKey];
    return info?.status === 'completado';
  }

  saveSubstep(p: Project, substepKey: string): void {
    const stage = (p.currentStage || 'inicio') as ProjectStage;
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
      notes: p.notes,
      needType: p.needType,
      designBudget: p.designBudget,
      designPaymentReceived: p.designPaymentReceived,
      receptionNotes: p.receptionNotes,
      designElaborationNotes: p.designElaborationNotes,
      designPresentationNotes: p.designPresentationNotes,
      materialsConfirmed: p.materialsConfirmed,
      quotationSocializationNotes: p.quotationSocializationNotes,
      appliancesSocializationNotes: p.appliancesSocializationNotes,
      contractElaborated: p.contractElaborated,
      plansElaborated: p.plansElaborated,
      documentsSignedClient: p.documentsSignedClient,
      documentsSignedAdmin: p.documentsSignedAdmin,
      payment60Received: p.payment60Received,
      designerDocumentSent: p.designerDocumentSent,
      materialsOrderReady: p.materialsOrderReady,
      materialsChecklistDone: p.materialsChecklistDone
    };
    if (typeof p.quotationId === 'string' && (p.quotationId as string).trim()) {
      (payload as any).quotationId = (p.quotationId as string).trim();
    }
    this.projectService.updateProject(p._id!, payload).subscribe({
      next: (res) => {
        if (res.success) {
          // actualizar estado del subpaso
          this.projectService.updateStep(p._id!, {
            stage,
            substep: substepKey,
            status: this.stepStatus,
            responsible: this.stepResponsible,
            notes: this.stepNotes,
            kind: 'normal'
          }).subscribe({
            next: (r2) => {
              if (r2.success) {
                this.toast.success('Subpaso guardado', `${substepKey} → ${this.stepStatus}`);
                this.stepNotes = '';
                this.selected = r2.data;
                this.loadProjects(true);
              }
            },
            error: (err) => this.toast.error('Error', err?.error?.message || 'No se pudo actualizar el paso.')
          });
        }
      },
      error: (err) => this.toast.error('Error', err?.error?.message || 'No se pudo guardar.')
    });
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
      notes: p.notes,
      needType: p.needType,
      designBudget: p.designBudget,
      designPaymentReceived: p.designPaymentReceived,
      receptionNotes: p.receptionNotes,
      designElaborationNotes: p.designElaborationNotes,
      designPresentationNotes: p.designPresentationNotes,
      materialsConfirmed: p.materialsConfirmed,
      quotationSocializationNotes: p.quotationSocializationNotes,
      appliancesSocializationNotes: p.appliancesSocializationNotes,
      contractElaborated: p.contractElaborated,
      plansElaborated: p.plansElaborated,
      documentsSignedClient: p.documentsSignedClient,
      documentsSignedAdmin: p.documentsSignedAdmin,
      payment60Received: p.payment60Received,
      designerDocumentSent: p.designerDocumentSent,
      materialsOrderReady: p.materialsOrderReady,
      materialsChecklistDone: p.materialsChecklistDone
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
