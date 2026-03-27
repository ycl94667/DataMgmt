'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { frontApi } from '@/lib/api';
import type { Category, Project } from '@/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Search } from 'lucide-react';

const CATEGORY_COLORS = [
  'from-blue-500 to-blue-600',
  'from-emerald-500 to-emerald-600',
  'from-amber-500 to-amber-600',
];

function getCategoryColor(index: number) {
  return CATEGORY_COLORS[index % CATEGORY_COLORS.length];
}

function formatProjectRegion(project: Project) {
  const p = project as unknown as Record<string, unknown>;
  const parts = [];
  if (p.provinceName) parts.push(String(p.provinceName));
  if (p.cityName) parts.push(String(p.cityName));
  if (p.districtName) parts.push(String(p.districtName));
  return parts.length > 0 ? parts.join(' > ') : '未知地区';
}

export default function HomePage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [hotProjects, setHotProjects] = useState<Project[]>([]);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [loadingProjects, setLoadingProjects] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const cats = await frontApi.getCategories();
        setCategories(cats);
      } catch {
        // silent fail
      } finally {
        setLoadingCategories(false);
      }
    })();

    void (async () => {
      try {
        const result = await frontApi.getProjects({ page: 1, pageSize: 8, sortOrder: 'asc' });
        setHotProjects(result.items);
      } catch {
        // silent fail
      } finally {
        setLoadingProjects(false);
      }
    })();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchKeyword.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchKeyword.trim())}`);
    }
  };

  return (
    <>
      {/* ---- Hero / Search ---- */}
      <section className="bg-gradient-to-b from-muted/50 to-background py-12">
        <div className="mx-auto max-w-5xl px-4 text-center">
          <h1 className="mb-3 text-3xl font-bold tracking-tight">
            公务员 · 事业单位 · 国企资料库
          </h1>
          <p className="mb-8 text-muted-foreground">
            查找考试资料、岗位表、面试信息，下载所需文件
          </p>
          <form onSubmit={handleSearch} className="mx-auto flex max-w-xl gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                placeholder="输入关键词搜索..."
                className="pl-9 h-10"
              />
            </div>
            <Button type="submit" size="lg">
              搜索
            </Button>
          </form>
        </div>
      </section>

      {/* ---- Category Cards ---- */}
      <section className="mx-auto max-w-5xl px-4 py-10">
        <h2 className="mb-6 text-xl font-semibold">选择考试类别</h2>
        {loadingCategories ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {categories.map((cat, i) => (
              <Link key={cat.id} href={`/category/${cat.id}`}>
                <Card className="cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-md">
                  <CardContent className="flex items-center justify-center p-8">
                    <div className={`bg-gradient-to-br bg-clip-text text-transparent ${getCategoryColor(i)}`}>
                      <div className={`mb-1 text-2xl font-bold bg-gradient-to-br bg-clip-text text-transparent ${getCategoryColor(i)}`}>
                        {cat.name}
                      </div>
                      <p className="text-xs text-muted-foreground">点击查看全部项目</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* ---- Hot Projects ---- */}
      <section className="mx-auto max-w-5xl px-4 pb-16">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-semibold">热门项目</h2>
          <Link href="/projects" className="text-sm text-primary hover:underline">
            查看全部 &rarr;
          </Link>
        </div>
        {loadingProjects ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : hotProjects.length > 0 ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {hotProjects.map((project) => (
              <Link key={project.id} href={`/project/${project.id}`}>
                <Card className="cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-md">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate font-medium">{project.name}</h3>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {formatProjectRegion(project)}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <span className="text-xs text-muted-foreground">{project.year}年</span>
                        <span className="rounded bg-muted px-1.5 py-0.5 text-xs">
                          {project.type === 'written_exam' ? '笔试' : '面试'}
                        </span>
                      </div>
                    </div>
                    {project.documentCount !== undefined && (
                      <p className="mt-2 text-xs text-muted-foreground">
                        {project.documentCount} 份资料
                      </p>
                    )}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <div className="flex h-40 items-center justify-center rounded-lg border bg-muted/30">
            <p className="text-sm text-muted-foreground">暂无项目数据</p>
          </div>
        )}
      </section>
    </>
  );
}
