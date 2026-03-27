'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { adminAuditApi } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import type { AuditLog, PaginatedResponse } from '@/types';
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
import { Download, Loader2, Search } from 'lucide-react';

const ACTION_OPTIONS = [
  { label: '全部操作', value: 'all' },
  { label: '创建', value: 'CREATE' },
  { label: '更新', value: 'UPDATE' },
  { label: '删除', value: 'DELETE' },
  { label: '下载', value: 'DOWNLOAD' },
  { label: '登录', value: 'LOGIN' },
  { label: '登出', value: 'LOGOUT' },
] as const;

const TARGET_TYPE_OPTIONS = [
  { label: '全部对象', value: 'all' },
  { label: '资料', value: 'document' },
  { label: '项目', value: 'project' },
  { label: '视频', value: 'video' },
  { label: '标签', value: 'tag' },
  { label: '管理员', value: 'admin' },
  { label: '授权码', value: 'auth_code' },
] as const;

type Filters = {
  keyword: string;
  action: string;
  targetType: string;
  dateFrom: string;
  dateTo: string;
};

const EMPTY_FILTERS: Filters = {
  keyword: '',
  action: 'all',
  targetType: 'all',
  dateFrom: '',
  dateTo: '',
};

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function formatDate(value?: string) {
  return value ? new Date(value).toLocaleString() : '-';
}

function formatAction(action: string) {
  const labels: Record<string, string> = {
    CREATE: '创建',
    UPDATE: '更新',
    DELETE: '删除',
    DOWNLOAD: '下载',
    LOGIN: '登录',
    LOGOUT: '登出',
  };
  return labels[action] ?? action;
}

function formatTargetType(targetType: string) {
  const labels: Record<string, string> = {
    document: '资料',
    project: '项目',
    video: '视频',
    tag: '标签',
    admin: '管理员',
    auth_code: '授权码',
  };
  return labels[targetType] ?? targetType;
}

export default function AdminAuditLogsPage() {
  const admin = useAuthStore((state) => state.admin);
  const [data, setData] = useState<PaginatedResponse<AuditLog> | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const result = await adminAuditApi.list({
        page,
        pageSize: 10,
        action: filters.action === 'all' ? undefined : filters.action,
        targetType: filters.targetType === 'all' ? undefined : filters.targetType,
        dateFrom: filters.dateFrom || undefined,
        dateTo: filters.dateTo || undefined,
      });
      setData(result);
    } catch (error) {
      toast.error(getErrorMessage(error, '加载审计日志失败'));
    } finally {
      setLoading(false);
    }
  }, [filters.action, filters.targetType, filters.dateFrom, filters.dateTo, page]);

  useEffect(() => {
    if (admin?.role !== 'super_admin') {
      setLoading(false);
      return;
    }
    void reload();
  }, [admin?.role, reload]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const blob = (await adminAuditApi.export({
        action: filters.action === 'all' ? undefined : filters.action,
        targetType: filters.targetType === 'all' ? undefined : filters.targetType,
        dateFrom: filters.dateFrom || undefined,
        dateTo: filters.dateTo || undefined,
      })) as unknown as Blob;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('导出成功');
    } catch (error) {
      toast.error(getErrorMessage(error, '导出失败'));
    } finally {
      setExporting(false);
    }
  };

  if (admin?.role !== 'super_admin') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>审计日志</CardTitle>
          <CardDescription>仅超级管理员可访问该页面。</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-semibold">审计日志</h1>
          <p className="text-sm text-muted-foreground">
            记录管理员操作历史，支持按操作类型、对象类型和日期范围筛选。
          </p>
        </div>
        <Button variant="outline" disabled={exporting} onClick={() => void handleExport()}>
          {exporting ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
          导出
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>筛选条件</CardTitle>
          <CardDescription>按操作类型、对象类型和日期范围筛选日志数据。</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <div className="grid gap-2">
            <Label>操作类型</Label>
            <Select
              value={filters.action}
              onValueChange={(value) => {
                setPage(1);
                setFilters((prev) => ({ ...prev, action: value ?? 'all' }));
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue>
                  {ACTION_OPTIONS.find((item) => item.value === filters.action)?.label ?? '全部操作'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {ACTION_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label>对象类型</Label>
            <Select
              value={filters.targetType}
              onValueChange={(value) => {
                setPage(1);
                setFilters((prev) => ({ ...prev, targetType: value ?? 'all' }));
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue>
                  {TARGET_TYPE_OPTIONS.find((item) => item.value === filters.targetType)?.label ??
                    '全部对象'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {TARGET_TYPE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="filter-date-from">开始日期</Label>
            <Input
              id="filter-date-from"
              type="date"
              value={filters.dateFrom}
              onChange={(event) => {
                setPage(1);
                setFilters((prev) => ({ ...prev, dateFrom: event.target.value }));
              }}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="filter-date-to">结束日期</Label>
            <Input
              id="filter-date-to"
              type="date"
              value={filters.dateTo}
              onChange={(event) => {
                setPage(1);
                setFilters((prev) => ({ ...prev, dateTo: event.target.value }));
              }}
            />
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
              <Search className="size-4" />
              重置筛选
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>日志列表</CardTitle>
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
              <div className="overflow-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>操作</TableHead>
                      <TableHead>对象类型</TableHead>
                      <TableHead>对象名称</TableHead>
                      <TableHead>操作人</TableHead>
                      <TableHead>IP地址</TableHead>
                      <TableHead>时间</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data?.items.length ? (
                      data.items.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell>
                            <Badge variant="outline">{formatAction(log.action)}</Badge>
                          </TableCell>
                          <TableCell>{formatTargetType(log.targetType)}</TableCell>
                          <TableCell className="max-w-48 truncate">{log.targetName ?? '-'}</TableCell>
                          <TableCell>{log.operatorName ?? '-'}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {log.ipAddress ?? '-'}
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            {formatDate(log.createdAt)}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                          暂无日志数据
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

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
    </div>
  );
}
