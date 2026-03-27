'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { adminAdminApi } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import type { PaginatedResponse } from '@/types';
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
import { Loader2, Pencil, Plus, Trash2 } from 'lucide-react';

const EMPTY_FORM = {
  username: '',
  password: '',
  realName: '',
  role: 'admin' as 'super_admin' | 'admin',
};

type AdminItem = {
  id: number;
  username: string;
  realName: string;
  role: 'super_admin' | 'admin';
  isEnabled: number;
  lastLoginAt?: string | null;
  createdAt: string;
  updatedAt?: string;
};

type AdminFormState = typeof EMPTY_FORM;

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function formatDate(value?: string | null) {
  return value ? new Date(value).toLocaleString() : '从未登录';
}

function formatRole(role: 'super_admin' | 'admin') {
  return role === 'super_admin' ? '超级管理员' : '普通管理员';
}

function AdminDialog({
  open,
  saving,
  initialValues,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  saving: boolean;
  initialValues: AdminFormState;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: AdminFormState) => Promise<void>;
}) {
  const [form, setForm] = useState<AdminFormState>(initialValues);

  useEffect(() => {
    if (open) {
      setForm(initialValues);
    }
  }, [initialValues, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initialValues.username ? '编辑管理员' : '新建管理员'}</DialogTitle>
          <DialogDescription>维护管理员账号、姓名、角色和状态。</DialogDescription>
        </DialogHeader>

        <form
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            void onSubmit(form);
          }}
        >
          <div className="grid gap-2">
            <Label htmlFor="admin-username">用户名</Label>
            <Input
              id="admin-username"
              value={form.username}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, username: event.target.value }))
              }
              disabled={saving}
              placeholder="请输入用户名（3-50字符）"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="admin-password">
              {initialValues.username ? '新密码（留空则不修改）' : '密码'}
            </Label>
            <Input
              id="admin-password"
              type="password"
              value={form.password}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, password: event.target.value }))
              }
              disabled={saving}
              placeholder={initialValues.username ? '留空保持原密码' : '请输入密码（6-50字符）'}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="admin-real-name">姓名</Label>
            <Input
              id="admin-real-name"
              value={form.realName}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, realName: event.target.value }))
              }
              disabled={saving}
              placeholder="请输入管理员姓名"
            />
          </div>

          <div className="grid gap-2">
            <Label>角色</Label>
            <Select
              value={form.role}
              onValueChange={(value) =>
                setForm((prev) => ({ ...prev, role: value as 'super_admin' | 'admin' }))
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue>{formatRole(form.role)}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">普通管理员</SelectItem>
                <SelectItem value="super_admin">超级管理员</SelectItem>
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
              {saving && <Loader2 className="size-4 animate-spin" />}
              保存
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminAdminsPage() {
  const currentAdmin = useAuthStore((state) => state.admin);
  const [data, setData] = useState<PaginatedResponse<AdminItem> | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<AdminItem | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const result = await adminAdminApi.list({ page, pageSize: 10 });
      // Backend returns id as string (BigInt), normalize to number for local use
      const normalized: PaginatedResponse<AdminItem> = {
        ...result,
        items: result.items.map((item) => {
          const raw = item as unknown as Record<string, unknown>;
          return {
            id: Number(raw.id),
            username: String(raw.username ?? ''),
            realName: String(raw.realName ?? ''),
            role: (raw.role ?? 'admin') as 'super_admin' | 'admin',
            isEnabled: Number(raw.isEnabled ?? 1),
            lastLoginAt: raw.lastLoginAt as string | null | undefined,
            createdAt: String(raw.createdAt ?? ''),
            updatedAt: raw.updatedAt as string | undefined,
          };
        }),
      };
      setData(normalized);
    } catch (error) {
      toast.error(getErrorMessage(error, '加载管理员列表失败'));
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    if (currentAdmin?.role !== 'super_admin') {
      setLoading(false);
      return;
    }
    void reload();
  }, [currentAdmin?.role, reload]);

  const dialogInitialValues = useMemo<AdminFormState>(() => {
    if (!editingAdmin) return EMPTY_FORM;
    return {
      username: editingAdmin.username,
      password: '',
      realName: editingAdmin.realName,
      role: editingAdmin.role,
    };
  }, [editingAdmin]);

  const handleSave = async (values: AdminFormState) => {
    if (!values.username.trim()) {
      toast.error('请输入用户名');
      return;
    }
    if (values.username.trim().length < 3) {
      toast.error('用户名至少需要 3 个字符');
      return;
    }
    if (!editingAdmin && !values.password.trim()) {
      toast.error('请输入密码');
      return;
    }
    if (values.password.trim() && values.password.length < 6) {
      toast.error('密码至少需要 6 个字符');
      return;
    }
    if (!values.realName.trim()) {
      toast.error('请输入姓名');
      return;
    }

    setSaving(true);
    try {
      const payload: {
        username: string;
        realName: string;
        role: 'super_admin' | 'admin';
        password?: string;
      } = {
        username: values.username.trim(),
        realName: values.realName.trim(),
        role: values.role,
      };
      if (values.password.trim()) {
        payload.password = values.password;
      }

      if (editingAdmin) {
        await adminAdminApi.update(editingAdmin.id, payload);
        toast.success('管理员已更新');
      } else {
        await adminAdminApi.create({ ...payload, password: values.password });
        toast.success('管理员已创建');
      }

      setDialogOpen(false);
      setEditingAdmin(null);
      await reload();
    } catch (error) {
      toast.error(getErrorMessage(error, '保存管理员失败'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item: AdminItem) => {
    if (item.id === currentAdmin?.id) {
      toast.error('不能删除自己的账号');
      return;
    }

    if (!window.confirm(`确认删除管理员「${item.username}」吗？`)) {
      return;
    }

    try {
      await adminAdminApi.delete(item.id);
      toast.success('管理员已删除');
      await reload();
    } catch (error) {
      toast.error(getErrorMessage(error, '删除管理员失败'));
    }
  };

  const handleToggleEnabled = async (item: AdminItem) => {
    if (item.id === currentAdmin?.id) {
      toast.error('不能禁用自己的账号');
      return;
    }

    try {
      await adminAdminApi.update(item.id, {
        isEnabled: item.isEnabled === 1 ? 0 : 1,
        role: item.role,
        realName: item.realName,
        username: item.username,
      });
      toast.success(item.isEnabled === 1 ? '管理员已禁用' : '管理员已启用');
      await reload();
    } catch (error) {
      toast.error(getErrorMessage(error, '更新管理员状态失败'));
    }
  };

  if (currentAdmin?.role !== 'super_admin') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>管理员管理</CardTitle>
          <CardDescription>仅超级管理员可访问该页面。</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-semibold">管理员管理</h1>
          <p className="text-sm text-muted-foreground">
            管理后台用户账号，支持新建、编辑、启用/禁用和删除。
          </p>
        </div>
        <Button
          onClick={() => {
            setEditingAdmin(null);
            setDialogOpen(true);
          }}
        >
          <Plus className="size-4" />
          新建管理员
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>管理员列表</CardTitle>
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
                    <TableHead>用户名</TableHead>
                    <TableHead>姓名</TableHead>
                    <TableHead>角色</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>最后登录</TableHead>
                    <TableHead>创建时间</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.items.length ? (
                    data.items.map((item) => {
                      const isSelf = item.id === currentAdmin?.id;
                      return (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">
                            {item.username}
                            {isSelf ? (
                              <span className="ml-2 text-xs text-muted-foreground">(本人)</span>
                            ) : null}
                          </TableCell>
                          <TableCell>{item.realName}</TableCell>
                          <TableCell>
                            <Badge
                              variant={item.role === 'super_admin' ? 'default' : 'outline'}
                            >
                              {formatRole(item.role)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={item.isEnabled === 1 ? 'default' : 'secondary'}>
                              {item.isEnabled === 1 ? '启用' : '禁用'}
                            </Badge>
                          </TableCell>
                          <TableCell>{formatDate(item.lastLoginAt)}</TableCell>
                          <TableCell>{formatDate(item.createdAt)}</TableCell>
                          <TableCell>
                            <div className="flex flex-wrap justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setEditingAdmin(item);
                                  setDialogOpen(true);
                                }}
                              >
                                <Pencil className="size-4" />
                                编辑
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={isSelf}
                                onClick={() => void handleToggleEnabled(item)}
                              >
                                {item.isEnabled === 1 ? '禁用' : '启用'}
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                disabled={isSelf}
                                onClick={() => void handleDelete(item)}
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
                      <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                        暂无管理员数据
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

      <AdminDialog
        open={dialogOpen}
        saving={saving}
        initialValues={dialogInitialValues}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditingAdmin(null);
        }}
        onSubmit={handleSave}
      />
    </div>
  );
}
