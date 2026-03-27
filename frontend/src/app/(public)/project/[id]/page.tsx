'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { frontApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Download, ExternalLink } from 'lucide-react';
import DownloadModal from '@/components/public/DownloadModal';

// Extended types from project detail response
type ProjectDetailResponse = {
  id: number;
  name: string;
  categoryId: number;
  category?: { id: number; name: string };
  year: string;
  provinceId: number;
  provinceName?: string;
  cityId: number;
  cityName?: string;
  districtId: number;
  districtName?: string;
  type: 'written_exam' | 'interview';
  sortOrder: number;
  createdAt: string;
  updatedAt?: string;
  documentCount: number;
  videoCount: number;
  batches: Array<{
    id: number;
    name: string;
    startTime?: string;
    remark?: string;
    sortOrder: number;
  }>;
  documents: Array<{
    id: number;
    name: string;
    docType: string;
    fileName: string;
    fileExt: string;
    fileSize: number;
  }>;
  videos: Array<{
    id: number;
    title: string;
    url: string;
    platform: string;
  }>;
};

function formatProjectRegion(p: ProjectDetailResponse) {
  const parts = [];
  if (p.provinceName) parts.push(p.provinceName);
  if (p.cityName) parts.push(p.cityName);
  if (p.districtName) parts.push(p.districtName);
  return parts.length > 0 ? parts.join(' > ') : '未知地区';
}

function formatDate(value?: string) {
  return value ? new Date(value).toLocaleDateString() : '-';
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

export default function ProjectDetailPage() {
  const params = useParams();
  const projectId = Number(params.id);
  const [project, setProject] = useState<ProjectDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloadingDoc, setDownloadingDoc] = useState<{ id: number; name: string } | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const p = await frontApi.getProjectDetail(projectId);
        setProject(p as unknown as ProjectDetailResponse);
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    })();
  }, [projectId]);

  if (loading) {
    return (
      <div className="flex h-60 items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8 text-center">
        <p className="text-muted-foreground">项目不存在或已下架</p>
        <Link href="/projects" className="mt-4 text-primary hover:underline">
          返回项目列表
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      {/* ---- Breadcrumb ---- */}
      <div className="mb-4 text-sm text-muted-foreground">
        <Link href="/" className="hover:underline">首页</Link>
        <span className="mx-2">&gt;</span>
        <Link href="/projects" className="hover:underline">全部项目</Link>
        <span className="mx-2">&gt;</span>
        <span className="text-foreground">{project.name}</span>
      </div>

      {/* ---- Project Header ---- */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-xl">{project.name}</CardTitle>
          <div className="mt-2 flex flex-wrap gap-2">
            {project.category?.name && (
              <Badge variant="outline">{project.category.name}</Badge>
            )}
            <Badge variant="outline">{project.year}年</Badge>
            <Badge variant="outline">
              {project.type === 'written_exam' ? '笔试' : '面试'}
            </Badge>
            <Badge variant="outline">{formatProjectRegion(project)}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
            <div>年份：{project.year}</div>
            <div>类型：{project.type === 'written_exam' ? '笔试' : '面试'}</div>
            <div>地区：{formatProjectRegion(project)}</div>
            <div>更新时间：{formatDate(project.updatedAt)}</div>
          </div>
        </CardContent>
      </Card>

      {/* ---- Tabs ---- */}
      <Tabs defaultValue="documents" className="mb-6">
        <TabsList>
          <TabsTrigger value="documents">项目资料 ({project.documentCount})</TabsTrigger>
          <TabsTrigger value="batches">班次信息</TabsTrigger>
          <TabsTrigger value="videos">相关视频 ({project.videoCount})</TabsTrigger>
        </TabsList>

        {/* ---- Documents Tab ---- */}
        <TabsContent value="documents" className="mt-4">
          {project.documents?.length ? (
            <div className="space-y-2">
              {project.documents.map((doc) => (
                <Card key={doc.id}>
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/document/${doc.id}`}
                        className="truncate font-medium hover:text-primary hover:underline"
                      >
                        {doc.name}
                      </Link>
                      <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
                        <span>{doc.docType}</span>
                        <span>{formatFileSize(doc.fileSize)}</span>
                        <span>{doc.fileExt}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Link href={`/document/${doc.id}`}>
                        <Button size="sm" variant="outline">
                          查看详情
                        </Button>
                      </Link>
                      <Button
                        size="sm"
                        onClick={() => {
                          setDownloadingDoc({ id: doc.id, name: doc.name });
                          setModalOpen(true);
                        }}
                      >
                        <Download className="size-3.5" />
                        下载
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="flex h-40 items-center justify-center rounded-lg border bg-muted/30">
              <p className="text-sm text-muted-foreground">暂无资料</p>
            </div>
          )}
        </TabsContent>

        {/* ---- Batches Tab ---- */}
        <TabsContent value="batches" className="mt-4">
          {project.batches?.length ? (
            <div className="space-y-2">
              {project.batches.map((batch) => (
                <Card key={batch.id}>
                  <CardContent className="flex items-center justify-between p-4">
                    <div>
                      <span className="font-medium">{batch.name}</span>
                      {batch.startTime && (
                        <p className="mt-1 text-sm text-muted-foreground">
                          开班时间：{new Date(batch.startTime).toLocaleDateString()}
                        </p>
                      )}
                      {batch.remark && (
                        <p className="mt-1 text-sm text-muted-foreground">{batch.remark}</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="flex h-40 items-center justify-center rounded-lg border bg-muted/30">
              <p className="text-sm text-muted-foreground">暂无班次信息</p>
            </div>
          )}
        </TabsContent>

        {/* ---- Videos Tab ---- */}
        <TabsContent value="videos" className="mt-4">
          {project.videos?.length ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {project.videos.map((video) => (
                <Card key={video.id}>
                  <CardContent className="p-4">
                    <div className="mb-2 font-medium">{video.title}</div>
                    <div className="mb-2 flex items-center gap-2">
                      <Badge variant={video.platform === 'douyin' ? 'default' : 'outline'}>
                        {video.platform === 'douyin' ? '抖音' : '其他'}
                      </Badge>
                    </div>
                    <a
                      href={video.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                    >
                      <ExternalLink className="size-3.5" />
                      观看视频
                    </a>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="flex h-40 items-center justify-center rounded-lg border bg-muted/30">
              <p className="text-sm text-muted-foreground">暂无视频</p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {downloadingDoc && (
        <DownloadModal
          open={modalOpen}
          documentId={downloadingDoc.id}
          documentName={downloadingDoc.name}
          onOpenChange={(open) => {
            setModalOpen(open);
            if (!open) setDownloadingDoc(null);
          }}
        />
      )}
    </div>
  );
}
