'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { frontApi } from '@/lib/api';
import type { Document } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import DownloadModal from '@/components/public/DownloadModal';

function formatDate(value?: string) {
  return value ? new Date(value).toLocaleDateString() : '-';
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

export default function DocumentDetailPage() {
  const params = useParams();
  const documentId = Number(params.id);
  const [doc, setDoc] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const d = await frontApi.getDocumentDetail(documentId);
        setDoc(d);
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    })();
  }, [documentId]);

  if (loading) {
    return (
      <div className="flex h-60 items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!doc) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8 text-center">
        <p className="text-muted-foreground">资料不存在或已下架</p>
        <Link href="/" className="mt-4 text-primary hover:underline">
          返回首页
        </Link>
      </div>
    );
  }

  const regionParts: string[] = [];
  const docExtra = doc as unknown as Record<string, unknown>;
  if (docExtra.provinceName) regionParts.push(String(docExtra.provinceName));
  if (docExtra.cityName) regionParts.push(String(docExtra.cityName));
  if (docExtra.districtName) regionParts.push(String(docExtra.districtName));

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      {/* ---- Breadcrumb ---- */}
      <div className="mb-4 text-sm text-muted-foreground">
        <Link href="/" className="hover:underline">首页</Link>
        <span className="mx-2">&gt;</span>
        <Link href="/projects" className="hover:underline">全部项目</Link>
        {doc.category?.name && (
          <>
            <span className="mx-2">&gt;</span>
            <span className="text-foreground">{doc.category.name}</span>
          </>
        )}
        <span className="mx-2">&gt;</span>
        <span className="truncate text-foreground">{doc.name}</span>
      </div>

      {/* ---- Document Info ---- */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <h1 className="mb-4 text-xl font-bold">{doc.name}</h1>

          <div className="mb-6 grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <span className="text-muted-foreground">类目：</span>
              {doc.category?.name ?? '-'}
            </div>
            <div>
              <span className="text-muted-foreground">年份：</span>
              {doc.year}
            </div>
            <div>
              <span className="text-muted-foreground">类型：</span>
              {doc.docType}
            </div>
            <div>
              <span className="text-muted-foreground">地区：</span>
              {regionParts.length > 0 ? regionParts.join(' > ') : '-'}
            </div>
            <div>
              <span className="text-muted-foreground">文件大小：</span>
              {formatFileSize(doc.fileSize)}
            </div>
            <div>
              <span className="text-muted-foreground">版本：</span>
              v{doc.version}
            </div>
            <div>
              <span className="text-muted-foreground">上传时间：</span>
              {formatDate(doc.createdAt)}
            </div>
            {doc.projects && doc.projects.length > 0 && (
              <div className="sm:col-span-2">
                <span className="text-muted-foreground">所属项目：</span>
                {doc.projects.map((p) => (
                  <Link
                    key={p.id}
                    href={`/project/${p.id}`}
                    className="ml-1 text-primary hover:underline"
                  >
                    {p.name}
                  </Link>
                ))}
              </div>
            )}
          </div>

          {doc.tags && doc.tags.length > 0 && (
            <div className="mb-6 flex flex-wrap gap-2">
              {doc.tags.map((tag) => (
                <Badge key={tag.id} variant="secondary">
                  {tag.name}
                </Badge>
              ))}
            </div>
          )}

          {/* ---- Download CTA ---- */}
          <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed p-6">
            <p className="text-sm text-muted-foreground">下载此资料</p>
            <Button
              size="lg"
              onClick={() => setModalOpen(true)}
            >
              <Download className="size-4" />
              点击下载（需授权码）
            </Button>
            <p className="text-xs text-muted-foreground">
              文件大小：{formatFileSize(doc.fileSize)}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* ---- Back Link ---- */}
      <div className="text-center">
        <Link href="/" className="text-sm text-primary hover:underline">
          返回首页
        </Link>
      </div>

      <DownloadModal
        open={modalOpen}
        documentId={doc.id}
        documentName={doc.name}
        onOpenChange={setModalOpen}
      />
    </div>
  );
}
