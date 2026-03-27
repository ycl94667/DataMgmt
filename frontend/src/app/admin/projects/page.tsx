'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { adminProjectApi, frontApi } from '@/lib/api';
import type {
  Category,
  PaginatedResponse,
  Project,
  ProjectType,
  Region,
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
import { Loader2, Pencil, Plus, Search, Trash2 } from 'lucide-react';

const PROJECT_TYPE_OPTIONS: Array<{ label: string; value: ProjectType }> = [
  { label: '笔试', value: 'written_exam' },
  { label: '面试', value: 'interview' },
];

const EMPTY_FILTERS = {
  keyword: '',
  categoryId: 'all',
  year: '',
  provinceId: 'all',
  cityId: 'all',
  districtId: 'all',
  type: 'all',
};

const EMPTY_FORM = {
  name: '',
  categoryId: '',
  year: '',
  provinceId: '',
  cityId: '',
  districtId: '',
  type: 'written_exam' as ProjectType,
  sortOrder: '0',
};

type Filters = typeof EMPTY_FILTERS;
type ProjectFormState = typeof EMPTY_FORM;

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function formatProjectType(type: ProjectType) {
  return type === 'written_exam' ? '笔试' : '面试';
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

function ProjectDialog({
  open,
  saving,
  categories,
  regions,
  initialValues,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  saving: boolean;
  categories: Category[];
  regions: Region[];
  initialValues: ProjectFormState;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: ProjectFormState) => Promise<void>;
}) {
  const [form, setForm] = useState<ProjectFormState>(initialValues);

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
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{initialValues.name ? '编辑项目' : '新建项目'}</DialogTitle>
          <DialogDescription>
            维护项目基础信息，列表会实时联调后台接口。
          </DialogDescription>
        </DialogHeader>

        <form
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            void onSubmit(form);
          }}
        >
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="project-name">项目名称</Label>
              <Input
                id="project-name"
                value={form.name}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, name: event.target.value }))
                }
                disabled={saving}
                placeholder="请输入项目名称"
              />
            </div>
            <div className="grid gap-2">
              <Label>项目分类</Label>
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
          </div>

          <div className="grid gap-2 sm:grid-cols-3">
            <div className="grid gap-2">
              <Label htmlFor="project-year">年份</Label>
              <Input
                id="project-year"
                value={form.year}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, year: event.target.value }))
                }
                disabled={saving}
                placeholder="如 2026"
              />
            </div>
            <div className="grid gap-2">
              <Label>项目类型</Label>
              <Select
                value={form.type}
                onValueChange={(value) =>
                  setForm((prev) => ({ ...prev, type: value as ProjectType }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {PROJECT_TYPE_OPTIONS.find((item) => item.value === form.type)?.label}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {PROJECT_TYPE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="project-sort-order">排序</Label>
              <Input
                id="project-sort-order"
                type="number"
                value={form.sortOrder}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, sortOrder: event.target.value }))
                }
                disabled={saving}
              />
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-3">
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

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              取消
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="animate-spin" />}
              保存
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminProjectsPage() {
  const [projects, setProjects] = useState<PaginatedResponse<Project> | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const [categoryData, regionTree] = await Promise.all([
          frontApi.getCategories(),
          frontApi.getRegions(),
        ]);
        setCategories(categoryData);
        setRegions(flattenRegions(regionTree));
      } catch (error) {
        toast.error(getErrorMessage(error, '加载筛选数据失败'));
      }
    })();
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function fetchProjects() {
      setLoading(true);
      try {
        const data = await adminProjectApi.list({
          page,
          pageSize: 10,
          keyword: filters.keyword || undefined,
          categoryId:
            filters.categoryId === 'all' ? undefined : Number(filters.categoryId),
          year: filters.year || undefined,
          provinceId:
            filters.provinceId === 'all' ? undefined : Number(filters.provinceId),
          cityId: filters.cityId === 'all' ? undefined : Number(filters.cityId),
          districtId:
            filters.districtId === 'all' ? undefined : Number(filters.districtId),
          type: filters.type === 'all' ? undefined : filters.type,
        });

        if (!cancelled) {
          setProjects(data);
        }
      } catch (error) {
        if (!cancelled) {
          toast.error(getErrorMessage(error, '加载项目列表失败'));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void fetchProjects();

    return () => {
      cancelled = true;
    };
  }, [filters, page]);

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

  const dialogInitialValues = useMemo<ProjectFormState>(() => {
    if (!editingProject) {
      return EMPTY_FORM;
    }

    return {
      name: editingProject.name,
      categoryId: String(editingProject.categoryId),
      year: editingProject.year,
      provinceId: String(editingProject.provinceId),
      cityId: String(editingProject.cityId),
      districtId: String(editingProject.districtId),
      type: editingProject.type,
      sortOrder: String(editingProject.sortOrder ?? 0),
    };
  }, [editingProject]);

  const reloadCurrentPage = async () => {
    const data = await adminProjectApi.list({
      page,
      pageSize: 10,
      keyword: filters.keyword || undefined,
      categoryId: filters.categoryId === 'all' ? undefined : Number(filters.categoryId),
      year: filters.year || undefined,
      provinceId: filters.provinceId === 'all' ? undefined : Number(filters.provinceId),
      cityId: filters.cityId === 'all' ? undefined : Number(filters.cityId),
      districtId: filters.districtId === 'all' ? undefined : Number(filters.districtId),
      type: filters.type === 'all' ? undefined : filters.type,
    });
    setProjects(data);
  };

  const handleSave = async (values: ProjectFormState) => {
    if (
      !values.name.trim() ||
      !values.categoryId ||
      !values.year.trim() ||
      !values.provinceId ||
      !values.cityId ||
      !values.districtId
    ) {
      toast.error('请完整填写项目信息');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: values.name.trim(),
        categoryId: Number(values.categoryId),
        year: values.year.trim(),
        provinceId: Number(values.provinceId),
        cityId: Number(values.cityId),
        districtId: Number(values.districtId),
        type: values.type,
        sortOrder: Number(values.sortOrder || 0),
      };

      if (editingProject) {
        await adminProjectApi.update(editingProject.id, payload);
        toast.success('项目已更新');
      } else {
        await adminProjectApi.create(payload);
        toast.success('项目已创建');
      }

      setDialogOpen(false);
      setEditingProject(null);
      await reloadCurrentPage();
    } catch (error) {
      toast.error(getErrorMessage(error, '保存项目失败'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (project: Project) => {
    if (!window.confirm(`确认删除项目「${project.name}」吗？`)) {
      return;
    }

    try {
      await adminProjectApi.delete(project.id);
      toast.success('项目已删除');
      await reloadCurrentPage();
    } catch (error) {
      toast.error(getErrorMessage(error, '删除项目失败'));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-semibold">项目管理</h1>
          <p className="text-sm text-muted-foreground">
            支持筛选、分页、新建、编辑和删除项目。
          </p>
        </div>
        <Button
          onClick={() => {
            setEditingProject(null);
            setDialogOpen(true);
          }}
        >
          <Plus className="size-4" />
          新建项目
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>筛选条件</CardTitle>
          <CardDescription>按关键词、分类、年份、地区和类型过滤项目。</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="grid gap-2 xl:col-span-2">
            <Label htmlFor="project-keyword">关键词</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="project-keyword"
                className="pl-8"
                placeholder="搜索项目名称"
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
            <Label htmlFor="project-filter-year">年份</Label>
            <Input
              id="project-filter-year"
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
            <Label>类型</Label>
            <Select
              value={filters.type}
              onValueChange={(value) => {
                setPage(1);
                setFilters((prev) => ({ ...prev, type: value ?? 'all' }));
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue>
                  {filters.type === 'all'
                    ? '全部类型'
                    : PROJECT_TYPE_OPTIONS.find((item) => item.value === filters.type)?.label}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部类型</SelectItem>
                {PROJECT_TYPE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
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
          <CardTitle>项目列表</CardTitle>
          <CardDescription>
            共 {projects?.total ?? 0} 条记录，当前第 {projects?.page ?? 1} /{' '}
            {projects?.totalPages ?? 1} 页。
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
                    <TableHead>项目名称</TableHead>
                    <TableHead>分类</TableHead>
                    <TableHead>年份</TableHead>
                    <TableHead>类型</TableHead>
                    <TableHead>地区</TableHead>
                    <TableHead>资料数</TableHead>
                    <TableHead>视频数</TableHead>
                    <TableHead>排序</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projects?.items.length ? (
                    projects.items.map((project) => {
                      const province = regions.find(
                        (item) => item.id === project.provinceId,
                      )?.name;
                      const city = regions.find((item) => item.id === project.cityId)?.name;
                      const district = regions.find(
                        (item) => item.id === project.districtId,
                      )?.name;

                      return (
                        <TableRow key={project.id}>
                          <TableCell className="font-medium">{project.name}</TableCell>
                          <TableCell>{project.category?.name ?? '-'}</TableCell>
                          <TableCell>{project.year}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{formatProjectType(project.type)}</Badge>
                          </TableCell>
                          <TableCell>
                            {[province, city, district].filter(Boolean).join(' / ') || '-'}
                          </TableCell>
                          <TableCell>{project.documentCount ?? 0}</TableCell>
                          <TableCell>{project.videoCount ?? 0}</TableCell>
                          <TableCell>{project.sortOrder ?? 0}</TableCell>
                          <TableCell>
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setEditingProject(project);
                                  setDialogOpen(true);
                                }}
                              >
                                <Pencil className="size-4" />
                                编辑
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => void handleDelete(project)}
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
                        暂无项目数据
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
                        if ((projects?.page ?? 1) > 1) {
                          setPage((prev) => prev - 1);
                        }
                      }}
                    />
                  </PaginationItem>
                  <PaginationItem>
                    <span className="px-3 text-sm text-muted-foreground">
                      第 {projects?.page ?? 1} / {projects?.totalPages ?? 1} 页
                    </span>
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationNext
                      href="#"
                      text="下一页"
                      onClick={(event) => {
                        event.preventDefault();
                        if ((projects?.page ?? 1) < (projects?.totalPages ?? 1)) {
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

      <ProjectDialog
        open={dialogOpen}
        saving={submitting}
        categories={categories}
        regions={regions}
        initialValues={dialogInitialValues}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setEditingProject(null);
          }
        }}
        onSubmit={handleSave}
      />
    </div>
  );
}
