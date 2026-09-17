import api from './api';
import { Project, ProjectStatus } from '../types';

export interface CreateProjectPayload {
  name: string;
  description?: string | null;
  image?: string | null;
  status: ProjectStatus;
  start_date?: string | null;
  due_date?: string | null;
  project_lead_id?: number;
  lead_ids?: number[];
  member_ids?: number[];
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
  async remove(id: number): Promise<void> {
    await api.delete(`/projects/${id}`);
  },
};
