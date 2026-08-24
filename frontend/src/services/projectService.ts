import api from './api';
import { Project, ProjectStatus } from '../types';

export interface CreateProjectPayload {
  name: string;
  description?: string;
  status: ProjectStatus;
  start_date?: string;
  due_date?: string;
  project_lead_id?: number;
}

export const projectService = {
  async getAll(): Promise<Project[]> {
    const res = await api.get('/projects');
    return res.data.projects;
  },
  async create(payload: CreateProjectPayload): Promise<Project> {
    const res = await api.post('/projects', payload);
    return res.data.project;
  },
  async update(id: number, payload: CreateProjectPayload): Promise<Project> {
    const res = await api.put(`/projects/${id}`, payload);
    return res.data.project;
  },
};
