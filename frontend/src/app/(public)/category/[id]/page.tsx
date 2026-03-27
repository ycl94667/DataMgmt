'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { frontApi } from '@/lib/api';
import type { Category, Project, PaginatedResponse } from '@/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { Loader2, Search } from 'lucide-react';

const EMPTY_FILTERS = {
  keyword: '',
  year: '',
  type: '',
};

type Filters = typeof EMPTY_FILTERS;

function formatProjectRegion(project: Project) {
  const p = project as unknown as Record<string, unknown>;
  const parts = [];
  if (p.provinceName) parts.push(String(p.provinceName));
  if (p.cityName) parts.push(String(p.cityName));
  if (p.districtName) parts.push(String(p.districtName));
  return parts.length > 0 ? parts.join(' > ') : '未知地区';
}

export default function CategoryPage() {
  const params = useParams();
  const categoryId = Number(params.id);
  const [category, setCategory] = useState<Category | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [data, setData] = useState<PaginatedResponse<Project> | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [page, setPage] = useState(1);

  // Load categories and category name in parallel
  useEffect(() => {
    void (async () => {
      try {
        const cats = await frontApi.getCategories();
        setCategories(cats);
        const cat = cats.find((c) => c.id === categoryId);
        setCategory(cat ?? null);
      } catch {
        // silent
      }
    })();
  }, [categoryId]);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const queryParams: Record<string, unknown> = { page: page, pageSize: 12, categoryId };
      if (filters.keyword.trim()) queryParams.keyword = filters.keyword.trim();
      if (filters.year.trim()) queryParams.year = filters.year.trim();
      if (filters.type) queryParams.type = filters.type;
      const result = await frontApi.getProjects(queryParams);
      setData(result);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [categoryId, filters.keyword, filters.type, filters.year, page]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      {/* ---- Breadcrumb ---- */}
      <div className="mb-4 text-sm text-muted-foreground">
        <Link href="/" className="hover:underline">首页</Link>
        <span className="mx-2">&gt;</span>
        <span className="text-foreground">{category?.name ?? '加载中...'}</span>
      </div>

      <h1 className="mb-6 text-2xl font-bold">{category?.name ?? '类目项目'}</h1>

      {/* ---- Filters ---- */}
      <Card className="mb-6">
        <CardContent className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="grid gap-1.5">
            <Label className="text-xs">关键词</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={filters.keyword}
                onChange={(e) => {
                  setPage(1);
                  setFilters((prev) => ({ ...prev, keyword: e.target.value }));
                }}
                placeholder="搜索项目名称"
                className="pl-8"
              />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label className="text-xs">年份</Label>
            <Input
              value={filters.year}
              onChange={(e) => {
                setPage(1);
                setFilters((prev) => ({ ...prev, year: e.target.value }));
              }}
              placeholder="如 2026"
            />
          </div>
          <div className="grid gap-1.5">
            <Label className="text-xs">类型</Label>
            <Select
              value={filters.type}
              onValueChange={(v) => {
                setPage(1);
                setFilters((prev) => ({ ...prev, type: v ?? '' }));
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="全部类型" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">全部类型</SelectItem>
                <SelectItem value="written_exam">笔试</SelectItem>
                <SelectItem value="interview">面试</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button
              variant="outline"
              size="sm"
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

      {/* ---- Results ---- */}
      <div className="mb-4 text-sm text-muted-foreground">
        共 {data?.total ?? 0} 个项目
      </div>

      {loading ? (
        <div className="flex h-60 items-center justify-center">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : data?.items.length ? (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {data.items.map((project) => (
              <Link key={project.id} href={`/project/${project.id}`}>
                <Card className="cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-md">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate font-medium">{project.name}</h3>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {formatProjectRegion(project)}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          <span className="rounded bg-muted px-1.5 py-0.5 text-xs">{project.year}年</span>
                          <span className="rounded bg-muted px-1.5 py-0.5 text-xs">
                            {project.type === 'written_exam' ? '笔试' : '面试'}
                          </span>
                        </div>
                      </div>
                      {project.documentCount !== undefined && (
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {project.documentCount} 份
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>

          <Pagination className="mt-6 justify-end">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  text="上一页"
                  onClick={(e) => {
                    e.preventDefault();
                    if ((data.page ?? 1) > 1) setPage((p) => p - 1);
                  }}
                />
              </PaginationItem>
              <PaginationItem>
                <span className="px-3 text-sm text-muted-foreground">
                  第 {data.page} / {data.totalPages} 页
                </span>
              </PaginationItem>
              <PaginationItem>
                <PaginationNext
                  href="#"
                  text="下一页"
                  onClick={(e) => {
                    e.preventDefault();
                    if ((data.page ?? 1) < (data.totalPages ?? 1)) setPage((p) => p + 1);
                  }}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </>
      ) : (
        <div className="flex h-60 items-center justify-center rounded-lg border bg-muted/30">
          <p className="text-sm text-muted-foreground">暂无符合条件的项目</p>
        </div>
      )}
    </div>
  );
}
