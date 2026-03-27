'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { adminRegionApi } from '@/lib/api';
import type { Region } from '@/types';
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

const LEVEL_OPTIONS = [
  { label: '省级', value: '1' },
  { label: '市级', value: '2' },
  { label: '区县级', value: '3' },
] as const;

const EMPTY_FORM = {
  name: '',
  level: '1',
  parentId: '0',
  sortOrder: '0',
};

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function flattenRegions(regions: Region[]): Region[] {
  return regions.flatMap((region) => [
    region,
    ...(region.children ? flattenRegions(region.children) : []),
  ]);
}

function getLevelLabel(level: number) {
  return LEVEL_OPTIONS.find((item) => Number(item.value) === level)?.label ?? `级别 ${level}`;
}

function RegionDialog({
  open,
  saving,
  regions,
  initialValues,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  saving: boolean;
  regions: Region[];
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

  const candidateParents = useMemo(() => {
    const currentLevel = Number(form.level);
    if (currentLevel === 1) {
      return [];
    }
    return regions.filter((region) => region.level === currentLevel - 1);
  }, [form.level, regions]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initialValues.name ? '编辑地区' : '新建地区'}</DialogTitle>
          <DialogDescription>维护地区层级、父级和排序信息。</DialogDescription>
        </DialogHeader>

        <form
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            void onSubmit(form);
          }}
        >
          <div className="grid gap-2">
            <Label htmlFor="region-name">地区名称</Label>
            <Input
              id="region-name"
              value={form.name}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, name: event.target.value }))
              }
              disabled={saving}
              placeholder="请输入地区名称"
            />
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>地区层级</Label>
              <Select
                value={form.level}
                onValueChange={(value) =>
                  setForm((prev) => ({
                    ...prev,
                    level: value ?? '1',
                    parentId: value === '1' ? '0' : '',
                  }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {LEVEL_OPTIONS.find((item) => item.value === form.level)?.label}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {LEVEL_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>父级地区</Label>
              <Select
                value={form.parentId || undefined}
                onValueChange={(value) =>
                  setForm((prev) => ({ ...prev, parentId: value ?? '' }))
                }
                disabled={form.level === '1'}
              >
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {form.level === '1'
                      ? '无父级'
                      : candidateParents.find((item) => String(item.id) === form.parentId)
                            ?.name ?? '请选择父级'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {candidateParents.map((region) => (
                    <SelectItem key={region.id} value={String(region.id)}>
                      {region.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="region-sort-order">排序</Label>
            <Input
              id="region-sort-order"
              type="number"
              value={form.sortOrder}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, sortOrder: event.target.value }))
              }
              disabled={saving}
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
              {saving && <Loader2 className="animate-spin" />}
              保存
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminRegionsPage() {
  const [tree, setTree] = useState<Region[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRegion, setEditingRegion] = useState<Region | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchRegions() {
      setLoading(true);
      try {
        const data = await adminRegionApi.getTree();
        if (!cancelled) {
          setTree(data);
        }
      } catch (error) {
        if (!cancelled) {
          toast.error(getErrorMessage(error, '加载地区失败'));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void fetchRegions();

    return () => {
      cancelled = true;
    };
  }, []);

  const flattenedRegions = useMemo(() => flattenRegions(tree), [tree]);

  const dialogInitialValues = useMemo(
    () =>
      editingRegion
        ? {
            name: editingRegion.name,
            level: String(editingRegion.level),
            parentId: String(editingRegion.parentId),
            sortOrder: String(editingRegion.sortOrder ?? 0),
          }
        : EMPTY_FORM,
    [editingRegion],
  );

  const reload = async () => {
    const data = await adminRegionApi.getTree();
    setTree(data);
  };

  const handleSave = async (values: typeof EMPTY_FORM) => {
    if (!values.name.trim()) {
      toast.error('请输入地区名称');
      return;
    }

    if (values.level !== '1' && !values.parentId) {
      toast.error('请选择父级地区');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: values.name.trim(),
        level: Number(values.level),
        parentId: Number(values.level) === 1 ? 0 : Number(values.parentId),
        sortOrder: Number(values.sortOrder || 0),
      };

      if (editingRegion) {
        await adminRegionApi.update(editingRegion.id, payload);
        toast.success('地区已更新');
      } else {
        await adminRegionApi.create(payload);
        toast.success('地区已创建');
      }

      setDialogOpen(false);
      setEditingRegion(null);
      await reload();
    } catch (error) {
      toast.error(getErrorMessage(error, '保存地区失败'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (region: Region) => {
    if (!window.confirm(`确认删除地区「${region.name}」吗？`)) {
      return;
    }

    try {
      await adminRegionApi.delete(region.id);
      toast.success('地区已删除');
      await reload();
    } catch (error) {
      toast.error(getErrorMessage(error, '删除地区失败'));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-semibold">地区管理</h1>
          <p className="text-sm text-muted-foreground">
            以树形结构维护省、市、区县三级地区数据。
          </p>
        </div>
        <Button
          onClick={() => {
            setEditingRegion(null);
            setDialogOpen(true);
          }}
        >
          <Plus className="size-4" />
          新建地区
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>地区列表</CardTitle>
          <CardDescription>当前共 {flattenedRegions.length} 条地区记录。</CardDescription>
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
                  <TableHead>地区名称</TableHead>
                  <TableHead>层级</TableHead>
                  <TableHead>父级</TableHead>
                  <TableHead>排序</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {flattenedRegions.length ? (
                  flattenedRegions.map((region) => {
                    const parentName =
                      region.parentId === 0
                        ? '-'
                        : flattenedRegions.find((item) => item.id === region.parentId)?.name ?? '-';

                    return (
                      <TableRow key={region.id}>
                        <TableCell className="font-medium">
                          <span style={{ paddingLeft: `${(region.level - 1) * 20}px` }}>
                            {region.name}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{getLevelLabel(region.level)}</Badge>
                        </TableCell>
                        <TableCell>{parentName}</TableCell>
                        <TableCell>{region.sortOrder ?? 0}</TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setEditingRegion(region);
                                setDialogOpen(true);
                              }}
                            >
                              <Pencil className="size-4" />
                              编辑
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => void handleDelete(region)}
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
                    <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                      暂无地区数据
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <RegionDialog
        open={dialogOpen}
        saving={saving}
        regions={flattenedRegions}
        initialValues={dialogInitialValues}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setEditingRegion(null);
          }
        }}
        onSubmit={handleSave}
      />
    </div>
  );
}
