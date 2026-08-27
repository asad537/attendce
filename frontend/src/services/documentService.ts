import api from './api';

export interface UserDocument {
  id: number;
  user_id: number;
  type: string;
  name: string;
  created_at: string;
}

export const documentService = {
  getDocuments: async (userId: number) => {
    const response = await api.get(`/users/${userId}/documents`);
    return response.data;
  },

  uploadDocument: async (userId: number, type: string, file: File) => {
    const formData = new FormData();
    formData.append('type', type);
    formData.append('document', file);

    const response = await api.post(`/users/${userId}/documents`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  downloadDocument: async (documentId: number, filename: string) => {
    const response = await api.get(`/documents/${documentId}/download`, {
      responseType: 'blob',
    });
    
    // Create download link
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.parentNode?.removeChild(link);
  },

  deleteDocument: async (documentId: number) => {
    const response = await api.delete(`/documents/${documentId}`);
    return response.data;
  },
};
