'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  adminDocumentApi,
  adminProjectApi,
  adminTagApi,
  frontApi,
  uploadApi,
} from '@/lib/api';
import type {
  Category,
  Document,
  PaginatedResponse,
  Project,
  Region,
  Tag,
  TagGroupMap,
} from '@/types';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { Badge } from '@/components/ui/badge';
import {
  FileUp,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Upload,
} from 'lucide-react';

const DOC_TYPE_OPTIONS = [
  { label: '考试资料', value: 'exam_materials' },
  { label: '职位表', value: 'position_table' },
  { label: '笔试成绩', value: 'written_score' },
  { label: '面试成绩', value: 'interview_score' },
  { label: '面试线', value: 'interview_line' },
  { label: '真题', value: 'real_exam' },
  { label: '课程资料', value: 'course_materials' },
  { label: '其他', value: 'other' },
] as const;

type DocTypeValue = (typeof DOC_TYPE_OPTIONS)[number]['value'];

type UploadedFileInfo = {
  filePath: string;
  fileName: string;
  fileSize: number;
  fileExt: string;
};

const EMPTY_FILTERS = {
  keyword: '',
  categoryId: 'all',
  year: '',
  provinceId: 'all',
  cityId: 'all',
  districtId: 'all',
  docType: 'all',
  projectId: 'all',
};

const EMPTY_FORM = {
  name: '',
  categoryId: '',
  year: '',
  provinceId: '',
  cityId: '',
  districtId: '',
  docType: 'exam_materials' as DocTypeValue,
  projectIds: [] as number[],
  tagIds: [] as number[],
  uploadedFile: null as UploadedFileInfo | null,
};

type Filters = typeof EMPTY_FILTERS;
type DocumentFormState = typeof EMPTY_FORM;

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function flattenRegions(regions: Region[]): Region[] {
  return regions.flatMap((region) => [
    region,
    ...(region.children ? flattenRegions(region.children) : []),
  ]);
}

function findChildren(regions: Region[], parentId: string) {
  return regions.filter((region) => String(region.parentId) === parentId);
}

function normalizeTags(data: TagGroupMap) {
  return Object.entries(data).flatMap(([groupType, tags]) =>
    (tags ?? []).map((tag) => ({
      ...tag,
      groupType: tag.groupType ?? groupType,
    })),
  ) as Tag[];
}

function formatDocType(value: string) {
  return DOC_TYPE_OPTIONS.find((item) => item.value === value)?.label ?? value;
}

function formatDate(value?: string) {
  return value ? new Date(value).toLocaleString() : '-';
}

function formatFileSize(value?: number | string) {
  const size = Number(value ?? 0);
  if (!size) return '-';
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  if (size < 1024 * 1024 * 1024) return `${(size / 1024 / 1024).toFixed(1)} MB`;
  return `${(size / 1024 / 1024 / 1024).toFixed(1)} GB`;
}

function toggleId(items: number[], id: number) {
  return items.includes(id) ? items.filter((item) => item !== id) : [...items, id];
}

function FilterableMultiSelect({
  label,
  options,
  selectedIds,
  disabled,
  emptyText,
  onToggle,
}: {
  label: string;
  options: Array<{ id: number; name: string; helperText?: string }>;
  selectedIds: number[];
  disabled?: boolean;
  emptyText: string;
  onToggle: (id: number) => void;
}) {
  const [keyword, setKeyword] = useState('');

  const filteredOptions = useMemo(() => {
    const normalized = keyword.trim().toLowerCase();
    if (!normalized) {
      return options;
    }
    return options.filter((option) => {
      const text = `${option.name} ${option.helperText ?? ''}`.toLowerCase();
      return text.includes(normalized);
    });
  }, [keyword, options]);

  useEffect(() => {
    setKeyword('');
  }, [options, selectedIds]);

  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      <Input
        value={keyword}
        onChange={(event) => setKeyword(event.target.value)}
        placeholder={`搜索${label}`}
        disabled={disabled || !options.length}
      />
      <div className="max-h-44 overflow-y-auto rounded-md border p-2">
        {filteredOptions.length ? (
          <div className="flex flex-wrap gap-2">
            {filteredOptions.map((option) => {
              const active = selectedIds.includes(option.id);
              return (
                <Button
                  key={option.id}
                  type="button"
                  size="sm"
                  variant={active ? 'default' : 'outline'}
                  disabled={disabled}
                  onClick={() => onToggle(option.id)}
                  className="h-auto max-w-full whitespace-normal py-1.5 text-left"
                >
                  <span>{option.name}</span>
                  {option.helperText ? (
                    <span className="ml-2 text-xs opacity-80">{option.helperText}</span>
                  ) : null}
                </Button>
              );
            })}
          </div>
        ) : (
          <div className="py-4 text-sm text-muted-foreground">{emptyText}</div>
        )}
      </div>
    </div>
  );
}

function DocumentDialog({
  open,
  saving,
  uploading,
  editingDocument,
  categories,
  projects,
  tags,
  regions,
  initialValues,
  onOpenChange,
  onUploadFile,
  onSubmit,
}: {
  open: boolean;
  saving: boolean;
  uploading: boolean;
  editingDocument: Document | null;
  categories: Category[];
  projects: Project[];
  tags: Tag[];
  regions: Region[];
  initialValues: DocumentFormState;
  onOpenChange: (open: boolean) => void;
  onUploadFile: (file: File, values: DocumentFormState) => Promise<UploadedFileInfo | null>;
  onSubmit: (values: DocumentFormState) => Promise<void>;
}) {
  const [form, setForm] = useState<DocumentFormState>(initialValues);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (open) {
      setForm(initialValues);
    }
  }, [initialValues, open]);

  const provinces = useMemo(
    () => regions.filter((region) => region.level === 1),
    [regions],
  );
  const cities = useMemo(
    () => findChildren(regions, form.provinceId),
    [regions, form.provinceId],
  );
  const districts = useMemo(
    () => findChildren(regions, form.cityId),
    [regions, form.cityId],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>{editingDocument ? '编辑资料' : '新建资料'}</DialogTitle>
          <DialogDescription>
            {editingDocument
              ? '更新资料基础信息，文件替换请使用列表中的“替换文件”。'
              : '先填写基础信息并上传文件，再创建资料记录。'}
          </DialogDescription>
        </DialogHeader>

        <form
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            void onSubmit(form);
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="document-name">资料名称</Label>
              <Input
                id="document-name"
                value={form.name}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, name: event.target.value }))
                }
                disabled={saving || uploading}
                placeholder="请输入资料名称"
              />
            </div>
            <div className="grid gap-2">
              <Label>资料类型</Label>
              <Select
                value={form.docType}
                onValueChange={(value) =>
                  setForm((prev) => ({
                    ...prev,
                    docType: (value ?? 'exam_materials') as DocTypeValue,
                  }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue>{formatDocType(form.docType)}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {DOC_TYPE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="grid gap-2">
              <Label>分类</Label>
              <Select
                value={form.categoryId || undefined}
                onValueChange={(value) =>
                  setForm((prev) => ({ ...prev, categoryId: value ?? '' }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {categories.find((item) => String(item.id) === form.categoryId)?.name ??
                      '请选择分类'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={String(category.id)}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="document-year">年份</Label>
              <Input
                id="document-year"
                value={form.year}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, year: event.target.value }))
                }
                disabled={saving || uploading}
                placeholder="如 2026"
              />
            </div>
            <div className="grid gap-2">
              <Label>所属项目</Label>
              <div className="min-h-10 rounded-md border px-3 py-2 text-sm text-muted-foreground">
                已选 {form.projectIds.length} 个项目
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="grid gap-2">
              <Label>省份</Label>
              <Select
                value={form.provinceId || undefined}
                onValueChange={(value) =>
                  setForm((prev) => ({
                    ...prev,
                    provinceId: value ?? '',
                    cityId: '',
                    districtId: '',
                  }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {provinces.find((item) => String(item.id) === form.provinceId)?.name ??
                      '请选择省份'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {provinces.map((region) => (
                    <SelectItem key={region.id} value={String(region.id)}>
                      {region.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>城市</Label>
              <Select
                value={form.cityId || undefined}
                onValueChange={(value) =>
                  setForm((prev) => ({ ...prev, cityId: value ?? '', districtId: '' }))
                }
                disabled={!form.provinceId}
              >
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {cities.find((item) => String(item.id) === form.cityId)?.name ??
                      '请选择城市'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {cities.map((region) => (
                    <SelectItem key={region.id} value={String(region.id)}>
                      {region.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>区县</Label>
              <Select
                value={form.districtId || undefined}
                onValueChange={(value) =>
                  setForm((prev) => ({ ...prev, districtId: value ?? '' }))
                }
                disabled={!form.cityId}
              >
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {districts.find((item) => String(item.id) === form.districtId)?.name ??
                      '请选择区县'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {districts.map((region) => (
                    <SelectItem key={region.id} value={String(region.id)}>
                      {region.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <FilterableMultiSelect
              label="项目选择"
              options={projects.map((project) => ({
                id: project.id,
                name: project.name,
                helperText: `${project.year} / ${project.category?.name ?? '未分类'}`,
              }))}
              selectedIds={form.projectIds}
              disabled={saving || uploading}
              emptyText="暂无可选项目"
              onToggle={(id) =>
                setForm((prev) => ({
                  ...prev,
                  projectIds: toggleId(prev.projectIds, id),
                }))
              }
            />
            <FilterableMultiSelect
              label="标签选择"
              options={tags.map((tag) => ({
                id: tag.id,
                name: tag.name,
                helperText: formatDocType(tag.groupType === 'doc_type' ? 'other' : ''),
              }))}
              selectedIds={form.tagIds}
              disabled={saving || uploading}
              emptyText="暂无可选标签"
              onToggle={(id) =>
                setForm((prev) => ({ ...prev, tagIds: toggleId(prev.tagIds, id) }))
              }
            />
          </div>

          {editingDocument ? (
            <div className="rounded-md border bg-muted/30 p-3 text-sm">
              当前文件：{editingDocument.fileName}（{formatFileSize(editingDocument.fileSize)}）
            </div>
          ) : (
            <div className="grid gap-2 rounded-md border p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium">上传文件</p>
                  <p className="text-sm text-muted-foreground">
                    上传接口需要年份和分类，上传成功后才能创建资料。
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={async (event) => {
                    const file = event.target.files?.[0];
                    if (file) {
                      const uploaded = await onUploadFile(file, form);
                      if (uploaded) {
                        setForm((prev) => ({ ...prev, uploadedFile: uploaded }));
                      }
                    }
                    event.target.value = '';
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={uploading || saving}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {uploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
                  {form.uploadedFile ? '重新上传' : '选择文件'}
                </Button>
              </div>
              <div className="rounded-md bg-muted/40 p-3 text-sm">
                {form.uploadedFile ? (
                  <div className="space-y-1">
                    <p>文件名：{form.uploadedFile.fileName}</p>
                    <p>大小：{formatFileSize(form.uploadedFile.fileSize)}</p>
                    <p>扩展名：{form.uploadedFile.fileExt}</p>
                  </div>
                ) : (
                  <p className="text-muted-foreground">尚未上传文件</p>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving || uploading}
            >
              取消
            </Button>
            <Button type="submit" disabled={saving || uploading}>
              {saving && <Loader2 className="size-4 animate-spin" />}
              保存
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function VersionsDialog({
  open,
  loading,
  document,
  versions,
  onOpenChange,
}: {
  open: boolean;
  loading: boolean;
  document: Document | null;
  versions: Array<{
    id: number;
    version: number;
    fileName: string;
    fileSize: number | string;
    fileExt: string;
    createdAt: string;
  }>;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>版本记录</DialogTitle>
          <DialogDescription>{document ? `资料：${document.name}` : '查看历史文件版本'}</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : versions.length ? (
          <div className="space-y-3">
            <div className="rounded-md border p-3 text-sm">
              当前版本：v{document?.version ?? 1} / 当前文件：{document?.fileName ?? '-'}
            </div>
            <div className="space-y-2">
              {versions.map((version) => (
                <div key={version.id} className="rounded-md border p-3 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium">v{version.version} · {version.fileName}</p>
                      <p className="text-muted-foreground">
                        {version.fileExt} · {formatFileSize(version.fileSize)}
                      </p>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatDate(version.createdAt)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="py-10 text-center text-sm text-muted-foreground">暂无历史版本</div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function AdminDocumentsPage() {
  const [documents, setDocuments] = useState<PaginatedResponse<Document> | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [replacingId, setReplacingId] = useState<number | null>(null);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDocument, setEditingDocument] = useState<Document | null>(null);
  const [versionsOpen, setVersionsOpen] = useState(false);
  const [versionsLoading, setVersionsLoading] = useState(false);
  const [versionTarget, setVersionTarget] = useState<Document | null>(null);
  const [versions, setVersions] = useState<Array<{
    id: number;
    version: number;
    fileName: string;
    fileSize: number | string;
    fileExt: string;
    createdAt: string;
  }>>([]);
  const replaceInputRef = useRef<HTMLInputElement | null>(null);
  const replaceTargetRef = useRef<Document | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const [categoryData, regionTree, projectData, tagData] = await Promise.all([
          frontApi.getCategories(),
          frontApi.getRegions(),
          adminProjectApi.list({ page: 1, pageSize: 500 }),
          adminTagApi.list(),
        ]);
        setCategories(categoryData);
        setRegions(flattenRegions(regionTree));
        setProjects(projectData.items);
        setTags(normalizeTags(tagData));
      } catch (error) {
        toast.error(getErrorMessage(error, '加载资料管理基础数据失败'));
      }
    })();
  }, []);

  const reloadDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminDocumentApi.list({
        page,
        pageSize: 10,
        keyword: filters.keyword || undefined,
        categoryId: filters.categoryId === 'all' ? undefined : Number(filters.categoryId),
        year: filters.year || undefined,
        provinceId: filters.provinceId === 'all' ? undefined : Number(filters.provinceId),
        cityId: filters.cityId === 'all' ? undefined : Number(filters.cityId),
        districtId: filters.districtId === 'all' ? undefined : Number(filters.districtId),
        docType: filters.docType === 'all' ? undefined : filters.docType,
        projectId: filters.projectId === 'all' ? undefined : Number(filters.projectId),
      });
      setDocuments(data);
    } catch (error) {
      toast.error(getErrorMessage(error, '加载资料列表失败'));
    } finally {
      setLoading(false);
    }
  }, [filters, page]);

  useEffect(() => {
    void reloadDocuments();
  }, [reloadDocuments]);

  const provinces = useMemo(
    () => regions.filter((region) => region.level === 1),
    [regions],
  );
  const cities = useMemo(
    () => findChildren(regions, filters.provinceId),
    [regions, filters.provinceId],
  );
  const districts = useMemo(
    () => findChildren(regions, filters.cityId),
    [regions, filters.cityId],
  );

  const dialogInitialValues = useMemo<DocumentFormState>(() => {
    if (!editingDocument) {
      return EMPTY_FORM;
    }

    return {
      name: editingDocument.name,
      categoryId: String(editingDocument.categoryId),
      year: editingDocument.year,
      provinceId: String(editingDocument.provinceId),
      cityId: String(editingDocument.cityId),
      districtId: String(editingDocument.districtId),
      docType: editingDocument.docType as DocTypeValue,
      projectIds: editingDocument.projects?.map((project) => Number(project.id)) ?? [],
      tagIds: editingDocument.tags?.map((tag) => Number(tag.id)) ?? [],
      uploadedFile: null,
    };
  }, [editingDocument]);

  const handleUploadFile = async (file: File, values: DocumentFormState) => {
    if (!values.year.trim() || !values.categoryId) {
      toast.error('请先填写年份并选择分类后再上传文件');
      return null;
    }

    setUploading(true);
    try {
      const categoryName =
        categories.find((item) => String(item.id) === values.categoryId)?.name ?? values.categoryId;
      const result = await uploadApi.uploadFile(file, values.year.trim(), categoryName);
      toast.success('文件上传成功');
      return {
        filePath: result.filePath,
        fileName: result.fileName,
        fileSize: Number(result.fileSize),
        fileExt: result.fileExt,
      };
    } catch (error) {
      toast.error(getErrorMessage(error, '上传文件失败'));
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async (values: DocumentFormState) => {
    if (
      !values.name.trim() ||
      !values.categoryId ||
      !values.year.trim() ||
      !values.provinceId ||
      !values.cityId ||
      !values.districtId
    ) {
      toast.error('请完整填写资料信息');
      return;
    }

    if (!editingDocument && !values.uploadedFile) {
      toast.error('请先上传文件');
      return;
    }

    setSaving(true);
    try {
      if (editingDocument) {
        await adminDocumentApi.update(editingDocument.id, {
          name: values.name.trim(),
          categoryId: Number(values.categoryId),
          year: values.year.trim(),
          provinceId: Number(values.provinceId),
          cityId: Number(values.cityId),
          districtId: Number(values.districtId),
          docType: values.docType,
          projectIds: values.projectIds,
          tagIds: values.tagIds,
        });
        toast.success('资料已更新');
      } else {
        await adminDocumentApi.create({
          name: values.name.trim(),
          categoryId: Number(values.categoryId),
          year: values.year.trim(),
          provinceId: Number(values.provinceId),
          cityId: Number(values.cityId),
          districtId: Number(values.districtId),
          docType: values.docType,
          filePath: values.uploadedFile?.filePath,
          fileName: values.uploadedFile?.fileName,
          fileSize: values.uploadedFile?.fileSize,
          fileExt: values.uploadedFile?.fileExt,
          projectIds: values.projectIds,
          tagIds: values.tagIds,
        });
        toast.success('资料已创建');
      }

      setDialogOpen(false);
      setEditingDocument(null);
      await reloadDocuments();
    } catch (error) {
      toast.error(getErrorMessage(error, '保存资料失败'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (document: Document) => {
    if (!window.confirm(`确认删除资料「${document.name}」吗？`)) {
      return;
    }

    try {
      await adminDocumentApi.delete(document.id);
      toast.success('资料已删除');
      await reloadDocuments();
    } catch (error) {
      toast.error(getErrorMessage(error, '删除资料失败'));
    }
  };

  const handleReplaceFile = async (file: File, document: Document) => {
    setReplacingId(document.id);
    try {
      const categoryName = document.category?.name ?? String(document.categoryId);
      const uploadResult = await uploadApi.uploadFile(file, document.year, categoryName);
      await adminDocumentApi.replaceFile(document.id, {
        filePath: uploadResult.filePath,
        fileName: uploadResult.fileName,
        fileSize: Number(uploadResult.fileSize),
        fileExt: uploadResult.fileExt,
      });
      toast.success('文件已替换');
      await reloadDocuments();
    } catch (error) {
      toast.error(getErrorMessage(error, '替换文件失败'));
    } finally {
      setReplacingId(null);
      replaceTargetRef.current = null;
    }
  };

  const handleOpenVersions = async (document: Document) => {
    setVersionsOpen(true);
    setVersionTarget(document);
    setVersionsLoading(true);
    try {
      const data = await adminDocumentApi.getVersions(document.id);
      setVersions(
        data.map((item) => ({
          id: Number(item.id),
          version: Number(item.version),
          fileName: item.fileName,
          fileSize: item.fileSize,
          fileExt: item.fileExt,
          createdAt: item.createdAt,
        })),
      );
    } catch (error) {
      toast.error(getErrorMessage(error, '加载版本记录失败'));
      setVersions([]);
    } finally {
      setVersionsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <input
        ref={replaceInputRef}
        type="file"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          const target = replaceTargetRef.current;
          if (file && target) {
            void handleReplaceFile(file, target);
          }
          event.target.value = '';
        }}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-semibold">资料管理</h1>
          <p className="text-sm text-muted-foreground">
            支持筛选、上传、新建、编辑、替换文件、删除和版本记录查看。
          </p>
        </div>
        <Button
          onClick={() => {
            setEditingDocument(null);
            setDialogOpen(true);
          }}
        >
          <Plus className="size-4" />
          新建资料
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>筛选条件</CardTitle>
          <CardDescription>按关键词、分类、年份、地区、类型和项目过滤资料。</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="grid gap-2 xl:col-span-2">
            <Label htmlFor="document-keyword">关键词</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="document-keyword"
                className="pl-8"
                placeholder="搜索资料名称"
                value={filters.keyword}
                onChange={(event) => {
                  setPage(1);
                  setFilters((prev) => ({ ...prev, keyword: event.target.value }));
                }}
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label>分类</Label>
            <Select
              value={filters.categoryId}
              onValueChange={(value) => {
                setPage(1);
                setFilters((prev) => ({ ...prev, categoryId: value ?? 'all' }));
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue>
                  {filters.categoryId === 'all'
                    ? '全部分类'
                    : categories.find((item) => String(item.id) === filters.categoryId)?.name}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部分类</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={String(category.id)}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="document-filter-year">年份</Label>
            <Input
              id="document-filter-year"
              placeholder="如 2026"
              value={filters.year}
              onChange={(event) => {
                setPage(1);
                setFilters((prev) => ({ ...prev, year: event.target.value }));
              }}
            />
          </div>

          <div className="grid gap-2">
            <Label>省份</Label>
            <Select
              value={filters.provinceId}
              onValueChange={(value) => {
                setPage(1);
                setFilters((prev) => ({
                  ...prev,
                  provinceId: value ?? 'all',
                  cityId: 'all',
                  districtId: 'all',
                }));
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue>
                  {filters.provinceId === 'all'
                    ? '全部省份'
                    : provinces.find((item) => String(item.id) === filters.provinceId)?.name}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部省份</SelectItem>
                {provinces.map((region) => (
                  <SelectItem key={region.id} value={String(region.id)}>
                    {region.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label>城市</Label>
            <Select
              value={filters.cityId}
              onValueChange={(value) => {
                setPage(1);
                setFilters((prev) => ({ ...prev, cityId: value ?? 'all', districtId: 'all' }));
              }}
              disabled={filters.provinceId === 'all'}
            >
              <SelectTrigger className="w-full">
                <SelectValue>
                  {filters.cityId === 'all'
                    ? '全部城市'
                    : cities.find((item) => String(item.id) === filters.cityId)?.name}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部城市</SelectItem>
                {cities.map((region) => (
                  <SelectItem key={region.id} value={String(region.id)}>
                    {region.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label>区县</Label>
            <Select
              value={filters.districtId}
              onValueChange={(value) => {
                setPage(1);
                setFilters((prev) => ({ ...prev, districtId: value ?? 'all' }));
              }}
              disabled={filters.cityId === 'all'}
            >
              <SelectTrigger className="w-full">
                <SelectValue>
                  {filters.districtId === 'all'
                    ? '全部区县'
                    : districts.find((item) => String(item.id) === filters.districtId)?.name}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部区县</SelectItem>
                {districts.map((region) => (
                  <SelectItem key={region.id} value={String(region.id)}>
                    {region.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label>资料类型</Label>
            <Select
              value={filters.docType}
              onValueChange={(value) => {
                setPage(1);
                setFilters((prev) => ({ ...prev, docType: value ?? 'all' }));
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue>
                  {filters.docType === 'all' ? '全部类型' : formatDocType(filters.docType)}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部类型</SelectItem>
                {DOC_TYPE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label>项目</Label>
            <Select
              value={filters.projectId}
              onValueChange={(value) => {
                setPage(1);
                setFilters((prev) => ({ ...prev, projectId: value ?? 'all' }));
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue>
                  {filters.projectId === 'all'
                    ? '全部项目'
                    : projects.find((item) => String(item.id) === filters.projectId)?.name}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部项目</SelectItem>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={String(project.id)}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-end">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                setPage(1);
                setFilters(EMPTY_FILTERS);
              }}
            >
              重置筛选
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>资料列表</CardTitle>
          <CardDescription>
            共 {documents?.total ?? 0} 条记录，当前第 {documents?.page ?? 1} / {documents?.totalPages ?? 1} 页。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="flex h-48 items-center justify-center">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>资料名称</TableHead>
                    <TableHead>分类 / 类型</TableHead>
                    <TableHead>年份 / 地区</TableHead>
                    <TableHead>关联项目</TableHead>
                    <TableHead>标签</TableHead>
                    <TableHead>文件</TableHead>
                    <TableHead>版本</TableHead>
                    <TableHead>更新时间</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {documents?.items.length ? (
                    documents.items.map((document) => {
                      const province = regions.find((item) => item.id === document.provinceId)?.name;
                      const city = regions.find((item) => item.id === document.cityId)?.name;
                      const district = regions.find((item) => item.id === document.districtId)?.name;

                      return (
                        <TableRow key={document.id}>
                          <TableCell className="font-medium">{document.name}</TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div>{document.category?.name ?? '-'}</div>
                              <Badge variant="outline">{formatDocType(document.docType)}</Badge>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1 text-sm">
                              <div>{document.year}</div>
                              <div className="text-muted-foreground">
                                {[province, city, district].filter(Boolean).join(' / ') || '-'}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {document.projects?.length ? (
                                document.projects.map((project) => (
                                  <Badge key={project.id} variant="secondary">
                                    {project.name}
                                  </Badge>
                                ))
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {document.tags?.length ? (
                                document.tags.map((tag) => (
                                  <Badge key={tag.id} variant="outline">
                                    {tag.name}
                                  </Badge>
                                ))
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1 text-sm">
                              <div>{document.fileName}</div>
                              <div className="text-muted-foreground">
                                {formatFileSize(document.fileSize)} · {document.fileExt}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>v{document.version}</TableCell>
                          <TableCell>{formatDate(document.updatedAt)}</TableCell>
                          <TableCell>
                            <div className="flex flex-wrap justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setEditingDocument(document);
                                  setDialogOpen(true);
                                }}
                              >
                                <Pencil className="size-4" />
                                编辑
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={replacingId === document.id}
                                onClick={() => {
                                  replaceTargetRef.current = document;
                                  replaceInputRef.current?.click();
                                }}
                              >
                                {replacingId === document.id ? (
                                  <Loader2 className="size-4 animate-spin" />
                                ) : (
                                  <RefreshCw className="size-4" />
                                )}
                                替换文件
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => void handleOpenVersions(document)}
                              >
                                <FileUp className="size-4" />
                                版本记录
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => void handleDelete(document)}
                              >
                                <Trash2 className="size-4" />
                                删除
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={9} className="py-10 text-center text-muted-foreground">
                        暂无资料数据
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>

              <Pagination className="justify-end">
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      href="#"
                      text="上一页"
                      onClick={(event) => {
                        event.preventDefault();
                        if ((documents?.page ?? 1) > 1) {
                          setPage((prev) => prev - 1);
                        }
                      }}
                    />
                  </PaginationItem>
                  <PaginationItem>
                    <span className="px-3 text-sm text-muted-foreground">
                      第 {documents?.page ?? 1} / {documents?.totalPages ?? 1} 页
                    </span>
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationNext
                      href="#"
                      text="下一页"
                      onClick={(event) => {
                        event.preventDefault();
                        if ((documents?.page ?? 1) < (documents?.totalPages ?? 1)) {
                          setPage((prev) => prev + 1);
                        }
                      }}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </>
          )}
        </CardContent>
      </Card>

      <DocumentDialog
        open={dialogOpen}
        saving={saving}
        uploading={uploading}
        editingDocument={editingDocument}
        categories={categories}
        projects={projects}
        tags={tags}
        regions={regions}
        initialValues={dialogInitialValues}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setEditingDocument(null);
          }
        }}
        onUploadFile={handleUploadFile}
        onSubmit={handleSave}
      />

      <VersionsDialog
        open={versionsOpen}
        loading={versionsLoading}
        document={versionTarget}
        versions={versions}
        onOpenChange={(open) => {
          setVersionsOpen(open);
          if (!open) {
            setVersionTarget(null);
            setVersions([]);
          }
        }}
      />
    </div>
  );
}
