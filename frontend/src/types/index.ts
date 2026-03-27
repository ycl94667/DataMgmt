// Category
export interface Category {
  id: number;
  name: string;
  sortOrder: number;
}

export type ProjectType = 'written_exam' | 'interview';

export type TagGroupType =
  | 'category'
  | 'year'
  | 'region'
  | 'doc_type'
  | 'project'
  | 'video'
  | 'custom';

// Region
export interface Region {
  id: number;
  name: string;
  level: number;
  parentId: number;
  sortOrder: number;
  children?: Region[];
}

// Project
export interface Project {
  id: number;
  name: string;
  categoryId: number;
  category?: Category;
  year: string;
  provinceId: number;
  cityId: number;
  districtId: number;
  type: ProjectType;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  batches?: Batch[];
  documents?: Document[];
  videos?: Video[];
  documentCount?: number;
  videoCount?: number;
  _count?: { documentProjects: number; videoProjects: number };
}

// Batch
export interface Batch {
  id: number;
  name: string;
  projectId: number;
  startTime?: string;
  remark?: string;
  sortOrder: number;
}

// Document
export interface Document {
  id: number;
  name: string;
  categoryId: number;
  category?: Category;
  year: string;
  provinceId: number;
  cityId: number;
  districtId: number;
  docType: string;
  filePath: string;
  fileName: string;
  fileSize: number;
  fileExt: string;
  version: number;
  createdAt: string;
  updatedAt: string;
  createdBy: number;
  tags?: Tag[];
  projects?: Project[];
}

// Tag
export interface Tag {
  id: number;
  name: string;
  groupType: TagGroupType;
  usageCount?: number;
  createdAt?: string;
  _count?: { documentTags: number };
}

export type TagGroupMap = Partial<Record<TagGroupType, Tag[]>>;

// Video
export interface Video {
  id: number;
  title: string;
  url: string;
  platform: 'douyin' | 'other';
  isEnabled: number;
  sortOrder: number;
  createdAt: string;
  updatedAt?: string;
  createdBy?: number;
  projects?: Project[];
  tags?: Tag[];
}

// Admin
export interface Admin {
  id: number;
  username: string;
  realName: string;
  role: 'super_admin' | 'admin';
  isEnabled: number;
  lastLoginAt?: string;
  createdAt: string;
}

// AuthorizationCode
export interface AuthorizationCode {
  id: number;
  code: string;
  name: string;
  description?: string | null;
  status: 'active' | 'disabled' | 'expired';
  maxDownloads: number;
  downloadCount: number;
  expiresAt?: string | null;
  createdBy: number;
  createdAt: string;
  updatedAt?: string;
}

// AuditLog
export interface AuditLog {
  id: number;
  operatorId?: number;
  operatorName?: string;
  action: string;
  targetType: string;
  targetId?: number;
  targetName?: string;
  detail?: any;
  ipAddress?: string;
  createdAt: string;
}

// API Response wrapper
export interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
}

// Paginated response
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Stats
export interface StatsOverview {
  totalDocuments: number;
  totalProjects: number;
  totalDownloads: number;
  totalAuthCodes: number;
}

export interface TrendItem {
  date: string;
  count: number;
}

export interface HotDoc {
  documentId: number;
  documentName: string;
  count: number;
}

export interface HotTag {
  tagId: number;
  tagName: string;
  count: number;
}
