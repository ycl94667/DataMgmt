import axios from 'axios';
import type {
  ApiResponse,
  PaginatedResponse,
  Category,
  Region,
  Project,
  Batch,
  Document,
  Tag,
  TagGroupMap,
  Video,
  Admin,
  AuthorizationCode,
  AuditLog,
  StatsOverview,
  TrendItem,
  HotDoc,
  HotTag,
} from '@/types';

// ---------------------------------------------------------------------------
// Axios instance
// ---------------------------------------------------------------------------

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? '',
  timeout: 30_000,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor – attach JWT token
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Response interceptor – unwrap { code, message, data } envelope
api.interceptors.response.use(
  (response) => {
    const body = response.data as ApiResponse<unknown>;
    // The backend wraps every response in { code, message, data }
    if (body && typeof body === 'object' && 'code' in body) {
      return body.data as any;
    }
    return response.data;
  },
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        localStorage.removeItem('admin');
        window.location.href = '/admin/login';
      }
    }
    // Attempt to surface the backend error message
    const msg =
      error.response?.data?.message ||
      error.response?.data?.error ||
      error.message ||
      'Network Error';
    return Promise.reject(new Error(msg));
  },
);

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export const authApi = {
  login(username: string, password: string) {
    return api.post<any, { access_token: string }>('/api/admin/login', {
      username,
      password,
    });
  },

  logout() {
    return api.post<any, void>('/api/admin/logout');
  },

  getProfile() {
    return api.get<any, Admin>('/api/admin/profile');
  },
};

// ---------------------------------------------------------------------------
// Front (public)
// ---------------------------------------------------------------------------

export const frontApi = {
  getCategories() {
    return api.get<any, Category[]>('/api/front/categories');
  },

  getRegions() {
    return api.get<any, Region[]>('/api/front/regions');
  },

  getProjects(params?: Record<string, any>) {
    return api.get<any, PaginatedResponse<Project>>('/api/front/projects', {
      params,
    });
  },

  getProjectDetail(id: number) {
    return api.get<any, Project>(`/api/front/projects/${id}`);
  },

  getDocuments(params?: Record<string, any>) {
    return api.get<any, PaginatedResponse<Document>>('/api/front/documents', {
      params,
    });
  },

  getDocumentDetail(id: number) {
    return api.get<any, Document>(`/api/front/documents/${id}`);
  },

  searchDocuments(params: { keyword?: string; page?: number; pageSize?: number }) {
    return api.get<any, PaginatedResponse<Document>>('/api/front/documents/search', {
      params,
    });
  },

  getVideos(params?: Record<string, any>) {
    return api.get<any, PaginatedResponse<Video>>('/api/front/videos', {
      params,
    });
  },

  verifyCode(code: string) {
    return api.post<any, { valid: boolean }>('/api/front/download/verify', { code });
  },

  downloadDocument(id: number, code: string) {
    return api.get(`/api/front/download/${id}`, {
      params: { code },
      responseType: 'blob',
    });
  },
};

// ---------------------------------------------------------------------------
// Admin – Projects
// ---------------------------------------------------------------------------

export const adminProjectApi = {
  list(params?: Record<string, any>) {
    return api.get<any, PaginatedResponse<Project>>('/api/admin/projects', {
      params,
    });
  },

  create(data: Partial<Project>) {
    return api.post<any, Project>('/api/admin/projects', data);
  },

  update(id: number, data: Partial<Project>) {
    return api.put<any, Project>(`/api/admin/projects/${id}`, data);
  },

  delete(id: number) {
    return api.delete<any, void>(`/api/admin/projects/${id}`);
  },
};

// ---------------------------------------------------------------------------
// Admin – Batches
// ---------------------------------------------------------------------------

export const adminBatchApi = {
  list(projectId: number) {
    return api.get<any, Batch[]>(`/api/admin/projects/${projectId}/batches`);
  },

  create(projectId: number, data: Partial<Batch>) {
    return api.post<any, Batch>(`/api/admin/projects/${projectId}/batches`, data);
  },

  update(id: number, data: Partial<Batch>) {
    return api.put<any, Batch>(`/api/admin/batches/${id}`, data);
  },

  delete(id: number) {
    return api.delete<any, void>(`/api/admin/batches/${id}`);
  },
};

// ---------------------------------------------------------------------------
// Admin – Documents
// ---------------------------------------------------------------------------

export const adminDocumentApi = {
  list(params?: Record<string, any>) {
    return api.get<any, PaginatedResponse<Document>>('/api/admin/documents', {
      params,
    });
  },

  create(data: Partial<Document> & { projectIds?: number[]; tagIds?: number[] }) {
    return api.post<any, Document>('/api/admin/documents', data);
  },

  batchCreate(items: (Partial<Document> & { projectIds?: number[]; tagIds?: number[] })[]) {
    return api.post<any, Document[]>('/api/admin/documents/batch', items);
  },

  update(id: number, data: Partial<Document> & { projectIds?: number[]; tagIds?: number[] }) {
    return api.put<any, Document>(`/api/admin/documents/${id}`, data);
  },

  replaceFile(
    id: number,
    data: { filePath: string; fileName: string; fileSize: number; fileExt: string },
  ) {
    return api.put<any, Document>(`/api/admin/documents/${id}/replace`, data);
  },

  delete(id: number) {
    return api.delete<any, void>(`/api/admin/documents/${id}`);
  },

  getVersions(id: number) {
    return api.get<any, Document[]>(`/api/admin/documents/${id}/versions`);
  },
};

// ---------------------------------------------------------------------------
// Admin – Tags
// ---------------------------------------------------------------------------

export const adminTagApi = {
  list(groupType?: string) {
    return api.get<any, TagGroupMap>('/api/admin/tags', {
      params: groupType ? { groupType } : undefined,
    });
  },

  create(data: Partial<Tag>) {
    return api.post<any, Tag>('/api/admin/tags', data);
  },

  update(id: number, data: Partial<Tag>) {
    return api.put<any, Tag>(`/api/admin/tags/${id}`, data);
  },

  delete(id: number) {
    return api.delete<any, void>(`/api/admin/tags/${id}`);
  },

  suggest(keyword: string) {
    return api.get<any, Tag[]>('/api/admin/tags/suggest', {
      params: { keyword },
    });
  },
};

// ---------------------------------------------------------------------------
// Admin – Videos
// ---------------------------------------------------------------------------

export const adminVideoApi = {
  list(params?: Record<string, any>) {
    return api.get<any, PaginatedResponse<Video>>('/api/admin/videos', {
      params,
    });
  },

  create(data: Partial<Video>) {
    return api.post<any, Video>('/api/admin/videos', data);
  },

  update(id: number, data: Partial<Video>) {
    return api.put<any, Video>(`/api/admin/videos/${id}`, data);
  },

  delete(id: number) {
    return api.delete<any, void>(`/api/admin/videos/${id}`);
  },
};

// ---------------------------------------------------------------------------
// Admin – Regions
// ---------------------------------------------------------------------------

export const adminRegionApi = {
  getTree() {
    return api.get<any, Region[]>('/api/admin/regions');
  },

  create(data: Partial<Region>) {
    return api.post<any, Region>('/api/admin/regions', data);
  },

  update(id: number, data: Partial<Region>) {
    return api.put<any, Region>(`/api/admin/regions/${id}`, data);
  },

  delete(id: number) {
    return api.delete<any, void>(`/api/admin/regions/${id}`);
  },
};

// ---------------------------------------------------------------------------
// Admin – Authorization Codes
// ---------------------------------------------------------------------------

export const adminAuthCodeApi = {
  list(params?: { page?: number; pageSize?: number; status?: string }) {
    return api.get<any, PaginatedResponse<AuthorizationCode>>(
      '/api/admin/auth-codes',
      { params },
    );
  },

  create(data: Partial<AuthorizationCode>) {
    return api.post<any, AuthorizationCode>('/api/admin/auth-codes', data);
  },

  update(id: number, data: Partial<AuthorizationCode>) {
    return api.put<any, AuthorizationCode>(`/api/admin/auth-codes/${id}`, data);
  },

  delete(id: number) {
    return api.delete<any, void>(`/api/admin/auth-codes/${id}`);
  },

  disable(id: number) {
    return api.put<any, AuthorizationCode>(`/api/admin/auth-codes/${id}/disable`);
  },

  enable(id: number) {
    return api.put<any, AuthorizationCode>(`/api/admin/auth-codes/${id}/enable`);
  },

  getLogs(id: number) {
    return api.get<any, any[]>(`/api/admin/auth-codes/${id}/logs`);
  },

  batchGenerate(data: {
    count: number;
    name?: string;
    maxDownloads?: number;
    expiresAt?: string;
  }) {
    return api.post<any, AuthorizationCode[]>(
      '/api/admin/auth-codes/generate',
      data,
    );
  },
};

// ---------------------------------------------------------------------------
// Admin – Recycle Bin
// ---------------------------------------------------------------------------

export const adminRecycleApi = {
  list(params?: { page?: number; pageSize?: number }) {
    return api.get<any, PaginatedResponse<Document>>(
      '/api/admin/recycle/documents',
      { params },
    );
  },

  restore(id: number) {
    return api.post<any, void>(`/api/admin/recycle/documents/${id}/restore`);
  },

  permanentDelete(id: number) {
    return api.delete<any, void>(`/api/admin/recycle/documents/${id}`);
  },
};

// ---------------------------------------------------------------------------
// Admin – Audit Logs
// ---------------------------------------------------------------------------

export const adminAuditApi = {
  list(params?: Record<string, any>) {
    return api.get<any, PaginatedResponse<AuditLog>>('/api/admin/audit-logs', {
      params,
    });
  },

  export(params?: Record<string, any>) {
    return api.get('/api/admin/audit-logs/export', {
      params,
      responseType: 'blob',
    });
  },
};

// ---------------------------------------------------------------------------
// Admin – Stats / Dashboard
// ---------------------------------------------------------------------------

export const adminStatsApi = {
  overview() {
    return api.get<any, StatsOverview>('/api/admin/stats/overview');
  },

  trend() {
    return api.get<any, TrendItem[]>('/api/admin/stats/trend');
  },

  hotDocs() {
    return api.get<any, HotDoc[]>('/api/admin/stats/hot-docs');
  },

  hotTags() {
    return api.get<any, HotTag[]>('/api/admin/stats/hot-tags');
  },
};

// ---------------------------------------------------------------------------
// Admin – Admins (user management)
// ---------------------------------------------------------------------------

export const adminAdminApi = {
  list(params?: { page?: number; pageSize?: number }) {
    return api.get<any, PaginatedResponse<Admin>>('/api/admin/admins', {
      params,
    });
  },

  create(data: Partial<Admin> & { password: string }) {
    return api.post<any, Admin>('/api/admin/admins', data);
  },

  update(id: number, data: Partial<Admin> & { password?: string }) {
    return api.put<any, Admin>(`/api/admin/admins/${id}`, data);
  },

  delete(id: number) {
    return api.delete<any, void>(`/api/admin/admins/${id}`);
  },
};

// ---------------------------------------------------------------------------
// Upload
// ---------------------------------------------------------------------------

export const uploadApi = {
  uploadFile(file: File, year: string, category: string) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('year', year);
    formData.append('category', category);
    return api.post<any, { filePath: string; fileName: string; fileSize: number; fileExt: string }>(
      '/api/admin/upload',
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
  },

  uploadBatch(files: File[], year: string, category: string) {
    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));
    formData.append('year', year);
    formData.append('category', category);
    return api.post<
      any,
      { filePath: string; fileName: string; fileSize: number; fileExt: string }[]
    >('/api/admin/upload/batch', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

export default api;
