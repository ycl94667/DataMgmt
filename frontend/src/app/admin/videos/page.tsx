'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { adminProjectApi, adminTagApi, adminVideoApi } from '@/lib/api';
import type {
  PaginatedResponse,
  Project,
  Tag,
  TagGroupMap,
  Video,
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

const PLATFORM_OPTIONS: Array<{ label: string; value: Video['platform'] }> = [
  { label: '抖音', value: 'douyin' },
  { label: '其他', value: 'other' },
];

const EMPTY_FILTERS = {
  keyword: '',
};

const EMPTY_FORM = {
  title: '',
  url: '',
  platform: 'other' as Video['platform'],
  isEnabled: '1' as string,
  sortOrder: '0' as string,
  projectIds: [] as number[],
  tagIds: [] as number[],
};

type Filters = typeof EMPTY_FILTERS;
type VideoFormState = typeof EMPTY_FORM;

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function formatDate(value?: string) {
  return value ? new Date(value).toLocaleString() : '-';
}

function formatPlatform(platform: Video['platform']) {
  return PLATFORM_OPTIONS.find((item) => item.value === platform)?.label ?? platform;
}

function normalizeTags(data: TagGroupMap) {
  return Object.entries(data).flatMap(([groupType, tags]) =>
    (tags ?? []).map((tag) => ({
      ...tag,
      groupType: tag.groupType ?? groupType,
    })),
  );
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
    if (!normalized) return options;
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

function VideoDialog({
  open,
  saving,
  projects,
  tags,
  initialValues,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  saving: boolean;
  projects: Project[];
  tags: Tag[];
  initialValues: VideoFormState;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: VideoFormState) => Promise<void>;
}) {
  const [form, setForm] = useState<VideoFormState>(initialValues);

  useEffect(() => {
    if (open) {
      setForm(initialValues);
    }
  }, [initialValues, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{initialValues.title ? '编辑视频' : '新建视频'}</DialogTitle>
          <DialogDescription>维护视频链接、平台信息和关联项目/标签。</DialogDescription>
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
              <Label htmlFor="video-title">视频标题</Label>
              <Input
                id="video-title"
                value={form.title}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, title: event.target.value }))
                }
                disabled={saving}
                placeholder="请输入视频标题"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="video-url">视频链接</Label>
              <Input
                id="video-url"
                value={form.url}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, url: event.target.value }))
                }
                disabled={saving}
                placeholder="请输入视频链接"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="grid gap-2">
              <Label>平台</Label>
              <Select
                value={form.platform}
                onValueChange={(value) =>
                  setForm((prev) => ({ ...prev, platform: value as Video['platform'] }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue>{formatPlatform(form.platform)}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {PLATFORM_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="video-sort-order">排序</Label>
              <Input
                id="video-sort-order"
                type="number"
                value={form.sortOrder}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, sortOrder: event.target.value }))
                }
                disabled={saving}
              />
            </div>
            <div className="grid gap-2">
              <Label>是否启用</Label>
              <Select
                value={form.isEnabled}
                onValueChange={(value) => setForm((prev) => ({ ...prev, isEnabled: value ?? '1' }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue>{form.isEnabled === '1' ? '启用' : '禁用'}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">启用</SelectItem>
                  <SelectItem value="0">禁用</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <FilterableMultiSelect
              label="关联项目"
              options={projects.map((project) => ({
                id: project.id,
                name: project.name,
                helperText: `${project.year} / ${project.category?.name ?? '未分类'}`,
              }))}
              selectedIds={form.projectIds}
              disabled={saving}
              emptyText="暂无可选项目"
              onToggle={(id) =>
                setForm((prev) => ({
                  ...prev,
                  projectIds: toggleId(prev.projectIds, id),
                }))
              }
            />
            <FilterableMultiSelect
              label="关联标签"
              options={tags.map((tag) => ({
                id: tag.id,
                name: tag.name,
              }))}
              selectedIds={form.tagIds}
              disabled={saving}
              emptyText="暂无可选标签"
              onToggle={(id) =>
                setForm((prev) => ({ ...prev, tagIds: toggleId(prev.tagIds, id) }))
              }
            />
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
              {saving && <Loader2 className="size-4 animate-spin" />}
              保存
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminVideosPage() {
  const [data, setData] = useState<PaginatedResponse<Video> | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingVideo, setEditingVideo] = useState<Video | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const [projectData, tagData] = await Promise.all([
          adminProjectApi.list({ page: 1, pageSize: 500 }),
          adminTagApi.list(),
        ]);
        setProjects(projectData.items);
        setTags(normalizeTags(tagData));
      } catch (error) {
        toast.error(getErrorMessage(error, '加载视频基础数据失败'));
      }
    })();
  }, []);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const result = await adminVideoApi.list({
        page,
        pageSize: 10,
        keyword: filters.keyword || undefined,
      });
      setData(result);
    } catch (error) {
      toast.error(getErrorMessage(error, '加载视频列表失败'));
    } finally {
      setLoading(false);
    }
  }, [filters.keyword, page]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const dialogInitialValues = useMemo<VideoFormState>(() => {
    if (!editingVideo) return EMPTY_FORM;
    return {
      title: editingVideo.title,
      url: editingVideo.url,
      platform: editingVideo.platform,
      isEnabled: String(editingVideo.isEnabled),
      sortOrder: String(editingVideo.sortOrder),
      projectIds: editingVideo.projects?.map((p) => Number(p.id)) ?? [],
      tagIds: editingVideo.tags?.map((t) => Number(t.id)) ?? [],
    };
  }, [editingVideo]);

  const handleSave = async (values: VideoFormState) => {
    if (!values.title.trim()) {
      toast.error('请输入视频标题');
      return;
    }
    if (!values.url.trim()) {
      toast.error('请输入视频链接');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        title: values.title.trim(),
        url: values.url.trim(),
        platform: values.platform,
        isEnabled: values.isEnabled === '1' ? 1 : 0,
        sortOrder: Number(values.sortOrder) || 0,
        projectIds: values.projectIds,
        tagIds: values.tagIds,
      };

      if (editingVideo) {
        await adminVideoApi.update(editingVideo.id, payload);
        toast.success('视频已更新');
      } else {
        await adminVideoApi.create(payload);
        toast.success('视频已创建');
      }

      setDialogOpen(false);
      setEditingVideo(null);
      await reload();
    } catch (error) {
      toast.error(getErrorMessage(error, '保存视频失败'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (video: Video) => {
    if (!window.confirm(`确认删除视频「${video.title}」吗？`)) {
      return;
    }

    try {
      await adminVideoApi.delete(video.id);
      toast.success('视频已删除');
      await reload();
    } catch (error) {
      toast.error(getErrorMessage(error, '删除视频失败'));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-semibold">视频管理</h1>
          <p className="text-sm text-muted-foreground">
            支持关键词筛选、新建、编辑、删除视频。
          </p>
        </div>
        <Button
          onClick={() => {
            setEditingVideo(null);
            setDialogOpen(true);
          }}
        >
          <Plus className="size-4" />
          新建视频
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>筛选条件</CardTitle>
          <CardDescription>按标题关键词筛选视频数据。</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="grid flex-1 gap-2">
            <Label htmlFor="video-filter-keyword">关键词</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="video-filter-keyword"
                className="pl-8"
                placeholder="搜索视频标题"
                value={filters.keyword}
                onChange={(event) => {
                  setPage(1);
                  setFilters((prev) => ({ ...prev, keyword: event.target.value }));
                }}
              />
            </div>
          </div>
          <Button
            variant="outline"
            onClick={() => {
              setPage(1);
              setFilters(EMPTY_FILTERS);
            }}
          >
            重置筛选
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>视频列表</CardTitle>
          <CardDescription>
            共 {data?.total ?? 0} 条记录，当前第 {data?.page ?? 1} / {data?.totalPages ?? 1} 页。
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
                    <TableHead>标题</TableHead>
                    <TableHead>平台</TableHead>
                    <TableHead>链接</TableHead>
                    <TableHead>关联项目</TableHead>
                    <TableHead>关联标签</TableHead>
                    <TableHead>排序</TableHead>
                    <TableHead>更新时间</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.items.length ? (
                    data.items.map((video) => (
                      <TableRow key={video.id}>
                        <TableCell className="font-medium">{video.title}</TableCell>
                        <TableCell>
                          <Badge variant={video.platform === 'douyin' ? 'default' : 'outline'}>
                            {formatPlatform(video.platform)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <a
                            href={video.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="max-w-48 truncate text-sm text-blue-600 underline"
                          >
                            {video.url}
                          </a>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {video.projects?.length ? (
                              video.projects.map((project) => (
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
                            {video.tags?.length ? (
                              video.tags.map((tag) => (
                                <Badge key={tag.id} variant="outline">
                                  {tag.name}
                                </Badge>
                              ))
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{video.sortOrder}</TableCell>
                        <TableCell>{formatDate(video.updatedAt)}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setEditingVideo(video);
                                setDialogOpen(true);
                              }}
                            >
                              <Pencil className="size-4" />
                              编辑
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => void handleDelete(video)}
                            >
                              <Trash2 className="size-4" />
                              删除
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                        暂无视频数据
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
                        if ((data?.page ?? 1) > 1) {
                          setPage((prev) => prev - 1);
                        }
                      }}
                    />
                  </PaginationItem>
                  <PaginationItem>
                    <span className="px-3 text-sm text-muted-foreground">
                      第 {data?.page ?? 1} / {data?.totalPages ?? 1} 页
                    </span>
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationNext
                      href="#"
                      text="下一页"
                      onClick={(event) => {
                        event.preventDefault();
                        if ((data?.page ?? 1) < (data?.totalPages ?? 1)) {
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

      <VideoDialog
        open={dialogOpen}
        saving={saving}
        projects={projects}
        tags={tags}
        initialValues={dialogInitialValues}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditingVideo(null);
        }}
        onSubmit={handleSave}
      />
    </div>
  );
}
