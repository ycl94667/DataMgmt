'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/stores/auth-store';
import { adminStatsApi } from '@/lib/api';
import type { StatsOverview, TrendItem } from '@/types';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  FileText,
  FolderKanban,
  Download,
  KeyRound,
  Tags,
  Video,
  MapPin,
  Loader2,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';

// ---------------------------------------------------------------------------
// Stat card helper
// ---------------------------------------------------------------------------

function StatCard({
  title,
  value,
  icon: Icon,
}: {
  title: string;
  value: number | string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between pb-2">
        <CardDescription>{title}</CardDescription>
        <Icon className="size-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value.toLocaleString()}</div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Quick link for regular admins
// ---------------------------------------------------------------------------

function QuickLink({
  href,
  label,
  icon: Icon,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Link href={href}>
      <Button
        variant="outline"
        className="h-auto w-full flex-col gap-2 py-6"
      >
        <Icon className="size-6" />
        <span>{label}</span>
      </Button>
    </Link>
  );
}

// ---------------------------------------------------------------------------
// Super-admin dashboard
// ---------------------------------------------------------------------------

function SuperAdminDashboard() {
  const [overview, setOverview] = useState<StatsOverview | null>(null);
  const [trend, setTrend] = useState<TrendItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      try {
        const [ov, tr] = await Promise.all([
          adminStatsApi.overview(),
          adminStatsApi.trend(),
        ]);
        if (!cancelled) {
          setOverview(ov);
          setTrend(tr);
        }
      } catch {
        // silently fail – cards will show 0
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchData();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold">统计概览</h1>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="资料总数"
          value={overview?.totalDocuments ?? 0}
          icon={FileText}
        />
        <StatCard
          title="项目总数"
          value={overview?.totalProjects ?? 0}
          icon={FolderKanban}
        />
        <StatCard
          title="下载总次数"
          value={overview?.totalDownloads ?? 0}
          icon={Download}
        />
        <StatCard
          title="授权码总数"
          value={overview?.totalAuthCodes ?? 0}
          icon={KeyRound}
        />
      </div>

      {/* Trend chart */}
      <Card>
        <CardHeader>
          <CardTitle>近 30 天下载趋势</CardTitle>
          <CardDescription>每日下载次数统计</CardDescription>
        </CardHeader>
        <CardContent>
          {trend.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              暂无数据
            </p>
          ) : (
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={trend}
                  margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 12 }}
                    tickFormatter={(v: string) => v.slice(5)} // MM-DD
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip
                    labelFormatter={(label) => `日期：${label}`}
                    formatter={(value) => [`${value} 次`, '下载量']}
                  />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Regular admin dashboard
// ---------------------------------------------------------------------------

function AdminDashboard({ name }: { name: string }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold">欢迎回来，{name}</h1>
        <p className="text-sm text-muted-foreground">
          选择以下功能开始操作
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <QuickLink href="/admin/projects" label="项目管理" icon={FolderKanban} />
        <QuickLink href="/admin/documents" label="资料管理" icon={FileText} />
        <QuickLink href="/admin/tags" label="标签管理" icon={Tags} />
        <QuickLink href="/admin/videos" label="视频管理" icon={Video} />
        <QuickLink href="/admin/regions" label="地区管理" icon={MapPin} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function AdminDashboardPage() {
  const admin = useAuthStore((s) => s.admin);

  if (!admin) return null;

  if (admin.role === 'super_admin') {
    return <SuperAdminDashboard />;
  }

  return <AdminDashboard name={admin.realName || admin.username} />;
}
