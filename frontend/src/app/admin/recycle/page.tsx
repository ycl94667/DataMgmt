'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { adminRecycleApi } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import type { Document, PaginatedResponse } from '@/types';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
import { Loader2, RotateCcw, Trash2 } from 'lucide-react';

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
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

function formatDocType(value: string) {
  const labels: Record<string, string> = {
    exam_materials: '考试资料',
    position_table: '职位表',
    written_score: '笔试成绩',
    interview_score: '面试成绩',
    interview_line: '面试线',
    real_exam: '真题',
    course_materials: '课程资料',
    other: '其他',
  };
  return labels[value] ?? value;
}

export default function AdminRecyclePage() {
  const admin = useAuthStore((state) => state.admin);
  const [data, setData] = useState<PaginatedResponse<Document> | null>(null);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState<number | null>(null);
  const [page, setPage] = useState(1);

  const isSuperAdmin = admin?.role === 'super_admin';

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const result = await adminRecycleApi.list({ page, pageSize: 10 });
      setData(result);
    } catch (error) {
      toast.error(getErrorMessage(error, '加载回收站失败'));
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const handleRestore = async (item: Document) => {
    setActingId(item.id);
    try {
      await adminRecycleApi.restore(item.id);
      toast.success('资料已恢复');
      await reload();
    } catch (error) {
      toast.error(getErrorMessage(error, '恢复资料失败'));
    } finally {
      setActingId(null);
    }
  };

  const handlePermanentDelete = async (item: Document) => {
    if (!isSuperAdmin) {
      toast.error('仅超级管理员可永久删除');
      return;
    }

    if (!window.confirm(`确认永久删除资料「${item.name}」吗？该操作不可恢复。`)) {
      return;
    }

    setActingId(item.id);
    try {
      await adminRecycleApi.permanentDelete(item.id);
      toast.success('资料已永久删除');
      await reload();
    } catch (error) {
      toast.error(getErrorMessage(error, '永久删除资料失败'));
    } finally {
      setActingId(null);
    }
  };

  const totalText = useMemo(
    () => `共 ${data?.total ?? 0} 条记录，当前第 ${data?.page ?? 1} / ${data?.totalPages ?? 1} 页。`,
    [data],
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold">回收站</h1>
        <p className="text-sm text-muted-foreground">
          查看已删除资料，支持恢复；永久删除仅超级管理员可执行。
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>已删除资料</CardTitle>
          <CardDescription>{totalText}</CardDescription>
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
                    <TableHead>文件</TableHead>
                    <TableHead>版本</TableHead>
                    <TableHead>删除前更新时间</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.items.length ? (
                    data.items.map((item) => {
                      const busy = actingId === item.id;
                      return (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.name}</TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div>{item.category?.name ?? '-'}</div>
                              <Badge variant="outline">{formatDocType(item.docType)}</Badge>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1 text-sm">
                              <div>{item.fileName}</div>
                              <div className="text-muted-foreground">
                                {formatFileSize(item.fileSize)} · {item.fileExt}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>v{item.version}</TableCell>
                          <TableCell>{formatDate(item.updatedAt)}</TableCell>
                          <TableCell>
                            <div className="flex flex-wrap justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={busy}
                                onClick={() => void handleRestore(item)}
                              >
                                {busy ? (
                                  <Loader2 className="size-4 animate-spin" />
                                ) : (
                                  <RotateCcw className="size-4" />
                                )}
                                恢复
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                disabled={busy || !isSuperAdmin}
                                onClick={() => void handlePermanentDelete(item)}
                              >
                                {busy ? (
                                  <Loader2 className="size-4 animate-spin" />
                                ) : (
                                  <Trash2 className="size-4" />
                                )}
                                永久删除
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                        回收站暂无资料
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
    </div>
  );
}
