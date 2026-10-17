import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { ProjectService } from '../../services/project.service';
import { Project, ProjectStage } from '../../models/interfaces';

interface StageCount { key: ProjectStage; label: string; count: number; }

@Component({
  selector: 'app-control',
  templateUrl: './control.component.html',
  styleUrls: ['./control.component.css']
})
export class ControlComponent implements OnInit, OnDestroy {
  projects: Project[] = [];
  isLoading = true;
  lastRefresh: Date | null = null;
  autoRefresh = true;
  private timer: any = null;
  stalledDays = 7;

  stages: { key: ProjectStage; label: string; icon: string }[] = [
    { key: 'inicio', label: 'Inicio', icon: '🟢' },
    { key: 'analisis', label: 'Análisis', icon: '🔍' },
    { key: 'presentacion', label: 'Presentación', icon: '🖥️' },
    { key: 'contratacion', label: 'Contratación', icon: '📝' },
    { key: 'preparacion', label: 'Preparación', icon: '📐' },
    { key: 'produccion', label: 'Producción', icon: '🏭' },
    { key: 'instalacion', label: 'Instalación', icon: '🔧' }
  ];

  constructor(private projectService: ProjectService, private router: Router) {}

  ngOnInit(): void {
    this.load();
    this.timer = setInterval(() => { if (this.autoRefresh) this.load(true); }, 15000);
  }

  ngOnDestroy(): void { if (this.timer) clearInterval(this.timer); }

  load(silent = false): void {
    if (!silent) this.isLoading = true;
    this.projectService.getProjects({ limit: 500 }).subscribe({
      next: (res) => {
        if (res.success) {
          this.projects = res.data || [];
          this.lastRefresh = new Date();
        }
        this.isLoading = false;
      },
      error: () => { this.isLoading = false; }
    });
  }

  refreshNow(): void { this.load(); }

  get total(): number { return this.projects.length; }
  get active(): number { return this.projects.filter(p => p.active !== false).length; }
  get completed(): number { return this.projects.filter(p => this.progress(p) === 100).length; }
  get blocked(): number { return this.projects.filter(p => this.hasBlocked(p)).length; }
  get stalled(): Project[] {
    const cutoff = Date.now() - this.stalledDays * 86400000;
    return this.projects.filter(p => {
      if (this.progress(p) === 100) return false;
      const u = p.updatedAt ? new Date(p.updatedAt).getTime() : 0;
      return u > 0 && u < cutoff;
    });
  }
  get returned(): Project[] {
    return this.projects.filter(p => Object.values(p.stageStates || {}).some((s: any) => s?.status === 'devuelto'));
  }

  progress(p: Project): number {
    if (!p.stageStates) return Math.round(((this.stageIndex(p.currentStage) + 1) / 7) * 100);
    const done = this.stages.filter(s => (p.stageStates as any)?.[s.key]?.status === 'completado').length;
    return Math.round((done / 7) * 100);
  }

  stageIndex(s?: string): number { return this.stages.findIndex(x => x.key === s); }

  hasBlocked(p: Project): boolean {
    return Object.values(p.stageStates || {}).some((s: any) => s?.status === 'bloqueado');
  }

  stageCounts(): StageCount[] {
    return this.stages.map(s => ({
      key: s.key,
      label: s.label,
      count: this.projects.filter(p => p.currentStage === s.key).length
    }));
  }

  maxStageCount(): number {
    return Math.max(1, ...this.stageCounts().map(c => c.count));
  }

  stageState(p: Project, key: ProjectStage): string {
    return (p.stageStates as any)?.[key]?.status || 'pendiente';
  }

  stageLabel(s?: string): string {
    return this.stages.find(x => x.key === s)?.label || (s || '');
  }

  stateLabel(s?: string): string {
    const m: Record<string, string> = { pendiente: 'Pendiente', en_curso: 'En curso', completado: 'Completado', devuelto: 'Devuelto', bloqueado: 'Bloqueado' };
    return m[s || ''] || (s || '—');
  }

  hasAlert(p: Project): boolean {
    return this.hasBlocked(p) || this.isReturned(p) || this.isStalled(p);
  }

  isReturned(p: Project): boolean {
    return Object.values(p.stageStates || {}).some((s: any) => s?.status === 'devuelto');
  }

  isStalled(p: Project): boolean {
    if (this.progress(p) === 100) return false;
    const u = p.updatedAt ? new Date(p.updatedAt).getTime() : 0;
    const cutoff = Date.now() - this.stalledDays * 86400000;
    return u > 0 && u < cutoff;
  }

  openProject(p: Project): void {
    this.router.navigate(['/proyectos'], { queryParams: { id: p._id } });
  }

  inExecution(): Project[] {
    return this.projects.filter(p => this.progress(p) < 100 && p.active !== false);
  }
}
