'use client';

import { useEffect, useState } from 'react';
import { adminStatsApi } from '@/lib/api';
import type { StatsOverview, TrendItem, HotDoc, HotTag } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Loader2, FileText, FolderKanban, Download, KeyRound, TrendingUp } from 'lucide-react';

function StatCard({
  title,
  value,
  icon: Icon,
  description,
}: {
  title: string;
  value: number | string;
  icon: React.ComponentType<{ className?: string }>;
  description?: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="size-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}

export default function StatsPage() {
  const [overview, setOverview] = useState<StatsOverview | null>(null);
  const [trend, setTrend] = useState<TrendItem[]>([]);
  const [hotDocs, setHotDocs] = useState<HotDoc[]>([]);
  const [hotTags, setHotTags] = useState<HotTag[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const [ov, tr, hd, ht] = await Promise.all([
          adminStatsApi.overview(),
          adminStatsApi.trend(),
          adminStatsApi.hotDocs(),
          adminStatsApi.hotTags(),
        ]);
        setOverview(ov as unknown as StatsOverview);
        setTrend((tr as unknown as TrendItem[]) ?? []);
        setHotDocs((hd as unknown as HotDoc[]) ?? []);
        setHotTags((ht as unknown as HotTag[]) ?? []);
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex h-60 items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">统计概览</h1>
        <p className="text-sm text-muted-foreground">系统数据总览与分析</p>
      </div>

      {/* ---- Overview Cards ---- */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="资料总数"
          value={overview?.totalDocuments ?? 0}
          icon={FileText}
          description="已发布的资料数量"
        />
        <StatCard
          title="项目总数"
          value={overview?.totalProjects ?? 0}
          icon={FolderKanban}
          description="已创建的项目数量"
        />
        <StatCard
          title="下载次数"
          value={overview?.totalDownloads ?? 0}
          icon={Download}
          description="所有授权码的累计下载"
        />
        <StatCard
          title="授权码总数"
          value={overview?.totalAuthCodes ?? 0}
          icon={KeyRound}
          description="已生成的授权码数量"
        />
      </div>

      {/* ---- Trend Chart ---- */}
      {trend.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="size-4" />
              下载趋势
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {trend.map((item) => (
                <div key={item.date} className="flex items-center gap-3 text-sm">
                  <span className="w-24 shrink-0 text-muted-foreground">
                    {item.date}
                  </span>
                  <div className="relative flex-1">
                    <div className="h-4 rounded bg-primary/20">
                      <div
                        className="h-4 rounded bg-primary transition-all"
                        style={{
                          width: `${Math.min(100, (item.count / (Math.max(...trend.map((t) => t.count), 1))) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                  <span className="w-12 text-right font-medium">{item.count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ---- Two columns: hot docs + hot tags ---- */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Hot Docs */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">热门资料</CardTitle>
          </CardHeader>
          <CardContent>
            {hotDocs.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>资料名称</TableHead>
                    <TableHead className="text-right">下载次数</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {hotDocs.map((doc) => (
                    <TableRow key={doc.documentId}>
                      <TableCell className="font-medium truncate max-w-[200px]">
                        {doc.documentName}
                      </TableCell>
                      <TableCell className="text-right">{doc.count}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-sm text-muted-foreground py-4 text-center">暂无数据</p>
            )}
          </CardContent>
        </Card>

        {/* Hot Tags */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">热门标签</CardTitle>
          </CardHeader>
          <CardContent>
            {hotTags.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>标签名称</TableHead>
                    <TableHead className="text-right">关联次数</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {hotTags.map((tag) => (
                    <TableRow key={tag.tagId}>
                      <TableCell className="font-medium">{tag.tagName}</TableCell>
                      <TableCell className="text-right">{tag.count}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-sm text-muted-foreground py-4 text-center">暂无数据</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
