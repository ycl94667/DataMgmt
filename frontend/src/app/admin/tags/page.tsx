'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { adminTagApi } from '@/lib/api';
import type { Tag, TagGroupMap, TagGroupType } from '@/types';
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
import { Badge } from '@/components/ui/badge';
import { Loader2, Pencil, Plus, Trash2 } from 'lucide-react';

const TAG_GROUP_OPTIONS: Array<{ label: string; value: TagGroupType }> = [
  { label: '分类', value: 'category' },
  { label: '年份', value: 'year' },
  { label: '地区', value: 'region' },
  { label: '资料类型', value: 'doc_type' },
  { label: '项目', value: 'project' },
  { label: '视频', value: 'video' },
  { label: '自定义', value: 'custom' },
];

const EMPTY_FORM = {
  name: '',
  groupType: 'custom' as TagGroupType,
};

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function getGroupLabel(groupType: TagGroupType) {
  return TAG_GROUP_OPTIONS.find((item) => item.value === groupType)?.label ?? groupType;
}

function normalizeTags(data: TagGroupMap) {
  return Object.entries(data).flatMap(([groupType, tags]) =>
    (tags ?? []).map((tag) => ({
      ...tag,
      groupType: groupType as TagGroupType,
    })),
  );
}

function TagDialog({
  open,
  saving,
  initialValues,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  saving: boolean;
  initialValues: typeof EMPTY_FORM;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: typeof EMPTY_FORM) => Promise<void>;
}) {
  const [form, setForm] = useState(initialValues);

  useEffect(() => {
    if (open) {
      setForm(initialValues);
    }
  }, [initialValues, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initialValues.name ? '编辑标签' : '新建标签'}</DialogTitle>
          <DialogDescription>维护标签名称和所属分组。</DialogDescription>
        </DialogHeader>

        <form
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            void onSubmit(form);
          }}
        >
          <div className="grid gap-2">
            <Label htmlFor="tag-name">标签名称</Label>
            <Input
              id="tag-name"
              value={form.name}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, name: event.target.value }))
              }
              disabled={saving}
              placeholder="请输入标签名称"
            />
          </div>

          <div className="grid gap-2">
            <Label>标签分组</Label>
            <Select
              value={form.groupType}
              onValueChange={(value) =>
                setForm((prev) => ({ ...prev, groupType: (value ?? 'custom') as TagGroupType }))
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue>{getGroupLabel(form.groupType)}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {TAG_GROUP_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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

export default function AdminTagsPage() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [groupFilter, setGroupFilter] = useState<'all' | TagGroupType>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchTags() {
      setLoading(true);
      try {
        const data = await adminTagApi.list(
          groupFilter === 'all' ? undefined : groupFilter,
        );
        if (!cancelled) {
          setTags(normalizeTags(data));
        }
      } catch (error) {
        if (!cancelled) {
          toast.error(getErrorMessage(error, '加载标签失败'));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void fetchTags();

    return () => {
      cancelled = true;
    };
  }, [groupFilter]);

  const dialogInitialValues = useMemo(
    () =>
      editingTag
        ? {
            name: editingTag.name,
            groupType: editingTag.groupType,
          }
        : EMPTY_FORM,
    [editingTag],
  );

  const reload = async () => {
    const data = await adminTagApi.list(groupFilter === 'all' ? undefined : groupFilter);
    setTags(normalizeTags(data));
  };

  const handleSave = async (values: typeof EMPTY_FORM) => {
    if (!values.name.trim()) {
      toast.error('请输入标签名称');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: values.name.trim(),
        groupType: values.groupType,
      };

      if (editingTag) {
        await adminTagApi.update(editingTag.id, payload);
        toast.success('标签已更新');
      } else {
        await adminTagApi.create(payload);
        toast.success('标签已创建');
      }

      setDialogOpen(false);
      setEditingTag(null);
      await reload();
    } catch (error) {
      toast.error(getErrorMessage(error, '保存标签失败'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (tag: Tag) => {
    if (!window.confirm(`确认删除标签「${tag.name}」吗？`)) {
      return;
    }

    try {
      await adminTagApi.delete(tag.id);
      toast.success('标签已删除');
      await reload();
    } catch (error) {
      toast.error(getErrorMessage(error, '删除标签失败'));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-semibold">标签管理</h1>
          <p className="text-sm text-muted-foreground">
            支持按分组筛选标签并进行新增、编辑、删除。
          </p>
        </div>
        <Button
          onClick={() => {
            setEditingTag(null);
            setDialogOpen(true);
          }}
        >
          <Plus className="size-4" />
          新建标签
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>筛选条件</CardTitle>
          <CardDescription>按标签分组查看数据。</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="grid min-w-56 gap-2">
            <Label>标签分组</Label>
            <Select
              value={groupFilter}
              onValueChange={(value) => setGroupFilter(value as 'all' | TagGroupType)}
            >
              <SelectTrigger className="w-full">
                <SelectValue>
                  {groupFilter === 'all' ? '全部分组' : getGroupLabel(groupFilter)}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部分组</SelectItem>
                {TAG_GROUP_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>标签列表</CardTitle>
          <CardDescription>当前共 {tags.length} 个标签。</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex h-48 items-center justify-center">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>标签名称</TableHead>
                  <TableHead>分组</TableHead>
                  <TableHead>使用次数</TableHead>
                  <TableHead>创建时间</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tags.length ? (
                  tags.map((tag) => (
                    <TableRow key={tag.id}>
                      <TableCell className="font-medium">{tag.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{getGroupLabel(tag.groupType)}</Badge>
                      </TableCell>
                      <TableCell>{tag.usageCount ?? tag._count?.documentTags ?? 0}</TableCell>
                      <TableCell>
                        {tag.createdAt ? new Date(tag.createdAt).toLocaleString() : '-'}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditingTag(tag);
                              setDialogOpen(true);
                            }}
                          >
                            <Pencil className="size-4" />
                            编辑
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => void handleDelete(tag)}
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
                    <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                      暂无标签数据
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <TagDialog
        open={dialogOpen}
        saving={saving}
        initialValues={dialogInitialValues}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setEditingTag(null);
          }
        }}
        onSubmit={handleSave}
      />
    </div>
  );
}
