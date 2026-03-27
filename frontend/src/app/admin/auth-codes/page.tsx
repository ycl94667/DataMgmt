'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { adminAuthCodeApi } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import type { AuthorizationCode, PaginatedResponse } from '@/types';
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
import { Textarea } from '@/components/ui/textarea';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { CheckCircle2, History, Loader2, Pencil, Plus, Power, Trash2 } from 'lucide-react';

const STATUS_OPTIONS = [
  { label: '全部状态', value: 'all' },
  { label: '启用中', value: 'active' },
  { label: '已禁用', value: 'disabled' },
  { label: '已过期', value: 'expired' },
] as const;

const EMPTY_FORM = {
  name: '',
  description: '',
  maxDownloads: '-1',
  expiresAt: '',
};

const EMPTY_BATCH_FORM = {
  count: '10',
  name: '',
  maxDownloads: '-1',
  expiresAt: '',
};

type StatusFilter = (typeof STATUS_OPTIONS)[number]['value'];
type AuthCodeFormState = typeof EMPTY_FORM;
type BatchFormState = typeof EMPTY_BATCH_FORM;

type AuthCodeLog = {
  id: number;
  documentId: number;
  document: {
    id: number;
    name: string;
    fileName: string;
    fileExt: string;
    docType: string;
  };
  ipAddress?: string | null;
  userAgent?: string | null;
  downloadedAt: string;
};

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function formatDate(value?: string | null) {
  return value ? new Date(value).toLocaleString() : '未设置';
}

function formatMaxDownloads(value: number) {
  return value === -1 ? '不限' : `${value} 次`;
}

function getStatusLabel(status: AuthorizationCode['status']) {
  switch (status) {
    case 'active':
      return '启用中';
    case 'disabled':
      return '已禁用';
    case 'expired':
      return '已过期';
    default:
      return status;
  }
}

function getStatusVariant(status: AuthorizationCode['status']) {
  switch (status) {
    case 'active':
      return 'default' as const;
    case 'disabled':
      return 'secondary' as const;
    case 'expired':
      return 'outline' as const;
    default:
      return 'outline' as const;
  }
}

function toInputDateTime(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 16);
}

function toIsoDateTime(value: string) {
  if (!value) return undefined;
  return new Date(value).toISOString();
}

function parseMaxDownloads(value: string) {
  const normalized = value.trim();
  if (!normalized) return -1;
  const parsed = Number(normalized);
  return Number.isNaN(parsed) ? NaN : parsed;
}

function AuthCodeDialog({
  open,
  saving,
  initialValues,
  editingCode,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  saving: boolean;
  initialValues: AuthCodeFormState;
  editingCode: AuthorizationCode | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: AuthCodeFormState) => Promise<void>;
}) {
  const [form, setForm] = useState<AuthCodeFormState>(initialValues);

  useEffect(() => {
    if (open) {
      setForm(initialValues);
    }
  }, [initialValues, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editingCode ? '编辑授权码' : '新建授权码'}</DialogTitle>
          <DialogDescription>维护单个授权码的名称、说明、下载次数与过期时间。</DialogDescription>
        </DialogHeader>

        <form
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            void onSubmit(form);
          }}
        >
          <div className="grid gap-2">
            <Label htmlFor="auth-code-name">名称</Label>
            <Input
              id="auth-code-name"
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              disabled={saving}
              placeholder="请输入授权码名称"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="auth-code-description">说明</Label>
            <Textarea
              id="auth-code-description"
              value={form.description}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, description: event.target.value }))
              }
              disabled={saving}
              placeholder="可选，填写使用说明或备注"
              rows={4}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="auth-code-max-downloads">最大下载次数</Label>
              <Input
                id="auth-code-max-downloads"
                type="number"
                value={form.maxDownloads}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, maxDownloads: event.target.value }))
                }
                disabled={saving}
                placeholder="-1 表示不限"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="auth-code-expires-at">过期时间</Label>
              <Input
                id="auth-code-expires-at"
                type="datetime-local"
                value={form.expiresAt}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, expiresAt: event.target.value }))
                }
                disabled={saving}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
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

function BatchGenerateDialog({
  open,
  saving,
  initialValues,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  saving: boolean;
  initialValues: BatchFormState;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: BatchFormState) => Promise<void>;
}) {
  const [form, setForm] = useState<BatchFormState>(initialValues);

  useEffect(() => {
    if (open) {
      setForm(initialValues);
    }
  }, [initialValues, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>批量生成授权码</DialogTitle>
          <DialogDescription>一次最多生成 100 个授权码，可统一配置名称前缀、下载次数和过期时间。</DialogDescription>
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
              <Label htmlFor="batch-count">生成数量</Label>
              <Input
                id="batch-count"
                type="number"
                min="1"
                max="100"
                value={form.count}
                onChange={(event) => setForm((prev) => ({ ...prev, count: event.target.value }))}
                disabled={saving}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="batch-name">统一名称</Label>
              <Input
                id="batch-name"
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                disabled={saving}
                placeholder="留空则由后端自动生成"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="batch-max-downloads">最大下载次数</Label>
              <Input
                id="batch-max-downloads"
                type="number"
                value={form.maxDownloads}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, maxDownloads: event.target.value }))
                }
                disabled={saving}
                placeholder="-1 表示不限"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="batch-expires-at">过期时间</Label>
              <Input
                id="batch-expires-at"
                type="datetime-local"
                value={form.expiresAt}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, expiresAt: event.target.value }))
                }
                disabled={saving}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              取消
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="size-4 animate-spin" />}
              生成
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function LogsDialog({
  open,
  loading,
  authCode,
  logs,
  onOpenChange,
}: {
  open: boolean;
  loading: boolean;
  authCode: AuthorizationCode | null;
  logs: AuthCodeLog[];
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>下载日志</DialogTitle>
          <DialogDescription>
            {authCode ? `授权码：${authCode.name}（${authCode.code}）` : '查看授权码下载记录'}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : logs.length ? (
          <div className="max-h-[60vh] overflow-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>资料</TableHead>
                  <TableHead>文件</TableHead>
                  <TableHead>IP</TableHead>
                  <TableHead>浏览器</TableHead>
                  <TableHead>下载时间</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>{log.document.name}</TableCell>
                    <TableCell>{log.document.fileName}</TableCell>
                    <TableCell>{log.ipAddress || '-'}</TableCell>
                    <TableCell className="max-w-72 truncate">{log.userAgent || '-'}</TableCell>
                    <TableCell>{formatDate(log.downloadedAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="py-10 text-center text-sm text-muted-foreground">暂无下载日志</div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function AdminAuthCodesPage() {
  const admin = useAuthStore((state) => state.admin);
  const [data, setData] = useState<PaginatedResponse<AuthorizationCode> | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [batchDialogOpen, setBatchDialogOpen] = useState(false);
  const [editingCode, setEditingCode] = useState<AuthorizationCode | null>(null);
  const [logsOpen, setLogsOpen] = useState(false);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsTarget, setLogsTarget] = useState<AuthorizationCode | null>(null);
  const [logs, setLogs] = useState<AuthCodeLog[]>([]);

  const dialogInitialValues = useMemo<AuthCodeFormState>(
    () =>
      editingCode
        ? {
            name: editingCode.name,
            description: editingCode.description ?? '',
            maxDownloads: String(editingCode.maxDownloads),
            expiresAt: toInputDateTime(editingCode.expiresAt),
          }
        : EMPTY_FORM,
    [editingCode],
  );

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const result = await adminAuthCodeApi.list({
        page,
        pageSize: 10,
        status: statusFilter === 'all' ? undefined : statusFilter,
      });
      setData(result);
    } catch (error) {
      toast.error(getErrorMessage(error, '加载授权码失败'));
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => {
    if (admin?.role !== 'super_admin') {
      setLoading(false);
      return;
    }
    void reload();
  }, [admin?.role, reload]);

  const handleSave = async (values: AuthCodeFormState) => {
    if (!values.name.trim()) {
      toast.error('请输入授权码名称');
      return;
    }

    const maxDownloads = parseMaxDownloads(values.maxDownloads);
    if (Number.isNaN(maxDownloads) || maxDownloads < -1) {
      toast.error('最大下载次数必须为 -1 或非负整数');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: values.name.trim(),
        description: values.description.trim() || undefined,
        maxDownloads,
        expiresAt: toIsoDateTime(values.expiresAt),
      };

      if (editingCode) {
        await adminAuthCodeApi.update(editingCode.id, payload);
        toast.success('授权码已更新');
      } else {
        await adminAuthCodeApi.create(payload);
        toast.success('授权码已创建');
      }

      setDialogOpen(false);
      setEditingCode(null);
      await reload();
    } catch (error) {
      toast.error(getErrorMessage(error, '保存授权码失败'));
    } finally {
      setSaving(false);
    }
  };

  const handleBatchGenerate = async (values: BatchFormState) => {
    const count = Number(values.count);
    const maxDownloads = parseMaxDownloads(values.maxDownloads);

    if (!Number.isInteger(count) || count < 1 || count > 100) {
      toast.error('生成数量必须在 1 到 100 之间');
      return;
    }

    if (Number.isNaN(maxDownloads) || maxDownloads < -1) {
      toast.error('最大下载次数必须为 -1 或非负整数');
      return;
    }

    setSaving(true);
    try {
      const result = await adminAuthCodeApi.batchGenerate({
        count,
        name: values.name.trim() || undefined,
        maxDownloads,
        expiresAt: toIsoDateTime(values.expiresAt),
      });
      toast.success(`已生成 ${result.length} 个授权码`);
      setBatchDialogOpen(false);
      setPage(1);
      await reload();
    } catch (error) {
      toast.error(getErrorMessage(error, '批量生成失败'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item: AuthorizationCode) => {
    if (!window.confirm(`确认删除授权码「${item.name}（${item.code}）」吗？`)) {
      return;
    }

    try {
      await adminAuthCodeApi.delete(item.id);
      toast.success('授权码已删除');
      await reload();
    } catch (error) {
      toast.error(getErrorMessage(error, '删除授权码失败'));
    }
  };

  const handleToggleStatus = async (item: AuthorizationCode) => {
    try {
      if (item.status === 'active') {
        await adminAuthCodeApi.disable(item.id);
        toast.success('授权码已禁用');
      } else if (item.status === 'disabled') {
        await adminAuthCodeApi.enable(item.id);
        toast.success('授权码已启用');
      }
      await reload();
    } catch (error) {
      toast.error(getErrorMessage(error, '更新授权码状态失败'));
    }
  };

  const handleOpenLogs = async (item: AuthorizationCode) => {
    setLogsTarget(item);
    setLogsOpen(true);
    setLogsLoading(true);
    try {
      const result = await adminAuthCodeApi.getLogs(item.id);
      setLogs(result as AuthCodeLog[]);
    } catch (error) {
      toast.error(getErrorMessage(error, '加载日志失败'));
      setLogs([]);
    } finally {
      setLogsLoading(false);
    }
  };

  if (admin?.role !== 'super_admin') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>授权码管理</CardTitle>
          <CardDescription>仅超级管理员可访问该页面。</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-semibold">授权码管理</h1>
          <p className="text-sm text-muted-foreground">
            支持筛选、创建、批量生成、启用/禁用、删除和查看下载日志。
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button variant="outline" onClick={() => setBatchDialogOpen(true)}>
            <CheckCircle2 className="size-4" />
            批量生成
          </Button>
          <Button
            onClick={() => {
              setEditingCode(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="size-4" />
            新建授权码
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>筛选条件</CardTitle>
          <CardDescription>按状态筛选授权码数据。</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="grid min-w-56 gap-2">
            <Label>状态</Label>
            <Select
              value={statusFilter}
              onValueChange={(value) => {
                setPage(1);
                setStatusFilter(value as StatusFilter);
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue>
                  {STATUS_OPTIONS.find((item) => item.value === statusFilter)?.label ?? '全部状态'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((option) => (
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
          <CardTitle>授权码列表</CardTitle>
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
                    <TableHead>名称 / 编码</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>下载限制</TableHead>
                    <TableHead>过期时间</TableHead>
                    <TableHead>说明</TableHead>
                    <TableHead>创建时间</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.items.length ? (
                    data.items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="font-medium">{item.name}</div>
                            <div className="font-mono text-xs text-muted-foreground">{item.code}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusVariant(item.status)}>
                            {getStatusLabel(item.status)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1 text-sm">
                            <div>总次数：{formatMaxDownloads(item.maxDownloads)}</div>
                            <div className="text-muted-foreground">
                              已下载：{item.downloadCount.toLocaleString()} 次
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{formatDate(item.expiresAt)}</TableCell>
                        <TableCell className="max-w-72 whitespace-pre-wrap text-sm text-muted-foreground">
                          {item.description || '-'}
                        </TableCell>
                        <TableCell>{formatDate(item.createdAt)}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setEditingCode(item);
                                setDialogOpen(true);
                              }}
                            >
                              <Pencil className="size-4" />
                              编辑
                            </Button>
                            {item.status !== 'expired' ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => void handleToggleStatus(item)}
                              >
                                <Power className="size-4" />
                                {item.status === 'active' ? '禁用' : '启用'}
                              </Button>
                            ) : null}
                            <Button variant="outline" size="sm" onClick={() => void handleOpenLogs(item)}>
                              <History className="size-4" />
                              日志
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => void handleDelete(item)}
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
                      <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                        暂无授权码数据
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

      <AuthCodeDialog
        open={dialogOpen}
        saving={saving}
        initialValues={dialogInitialValues}
        editingCode={editingCode}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setEditingCode(null);
          }
        }}
        onSubmit={handleSave}
      />

      <BatchGenerateDialog
        open={batchDialogOpen}
        saving={saving}
        initialValues={EMPTY_BATCH_FORM}
        onOpenChange={setBatchDialogOpen}
        onSubmit={handleBatchGenerate}
      />

      <LogsDialog
        open={logsOpen}
        loading={logsLoading}
        authCode={logsTarget}
        logs={logs}
        onOpenChange={(open) => {
          setLogsOpen(open);
          if (!open) {
            setLogsTarget(null);
            setLogs([]);
          }
        }}
      />
    </div>
  );
}
