import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Project, PaginatedResponse, ApiResponse } from '../models/interfaces';

@Injectable({
  providedIn: 'root'
})
export class ProjectService {
  private apiUrl = `${environment.apiUrl}/projects`;

  constructor(private http: HttpClient) {}

  getProjects(params?: any): Observable<PaginatedResponse<Project>> {
    return this.http.get<PaginatedResponse<Project>>(this.apiUrl, { params });
  }

  getProjectById(id: string): Observable<ApiResponse<Project>> {
    return this.http.get<ApiResponse<Project>>(`${this.apiUrl}/${id}`);
  }

  createProject(project: Partial<Project>): Observable<ApiResponse<Project>> {
    return this.http.post<ApiResponse<Project>>(this.apiUrl, project);
  }

  updateProject(id: string, project: Partial<Project>): Observable<ApiResponse<Project>> {
    return this.http.put<ApiResponse<Project>>(`${this.apiUrl}/${id}`, project);
  }

  advanceStage(id: string, stage: string, notes?: string): Observable<ApiResponse<Project>> {
    return this.http.patch<ApiResponse<Project>>(`${this.apiUrl}/${id}/stage`, { stage, notes });
  }

  updateStageState(id: string, stage: string, status: string, notes?: string): Observable<ApiResponse<Project>> {
    return this.http.patch<ApiResponse<Project>>(`${this.apiUrl}/${id}/stage-state`, { stage, status, notes });
  }

  updateStep(id: string, payload: { stage: string; substep?: string; status?: string; responsible?: string; notes?: string; kind?: string; reason?: string }): Observable<ApiResponse<Project>> {
    return this.http.patch<ApiResponse<Project>>(`${this.apiUrl}/${id}/step`, payload);
  }

  deleteProject(id: string): Observable<ApiResponse<null>> {
    return this.http.delete<ApiResponse<null>>(`${this.apiUrl}/${id}`);
  }
}
