'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { frontApi } from '@/lib/api';
import type { Document, PaginatedResponse } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { Loader2, Download } from 'lucide-react';
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

function SearchContent() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q') ?? '';
  const [query, setQuery] = useState(initialQuery);
  const [inputValue, setInputValue] = useState(initialQuery);
  const [data, setData] = useState<PaginatedResponse<Document> | null>(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [downloadingDoc, setDownloadingDoc] = useState<{ id: number; name: string } | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const doSearch = useCallback(async (q: string, p: number) => {
    if (!q.trim()) {
      setData(null);
      return;
    }
    setLoading(true);
    try {
      const result = await frontApi.searchDocuments({
        keyword: q.trim(),
        page: p,
        pageSize: 10,
      });
      setData(result);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (initialQuery) {
      void doSearch(initialQuery, page);
    }
  }, [doSearch, initialQuery, page]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = inputValue.trim();
    setQuery(q);
    setPage(1);
    void doSearch(q, 1);
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">搜索资料</h1>

      {/* ---- Search Form ---- */}
      <form onSubmit={handleSearch} className="mb-8 flex gap-2">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="输入关键词搜索资料..."
          className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <Button type="submit">搜索</Button>
      </form>

      {/* ---- Results ---- */}
      {loading ? (
        <div className="flex h-60 items-center justify-center">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : data ? (
        <>
          <div className="mb-4 text-sm text-muted-foreground">
            「{query}」的搜索结果：共 {data.total} 条
          </div>

          {data.items.length ? (
            <>
              <div className="space-y-3">
                {data.items.map((doc) => {
                  const regionParts: string[] = [];
                  const docExtra = doc as unknown as Record<string, unknown>;
                  if (docExtra.provinceName) regionParts.push(String(docExtra.provinceName));
                  if (docExtra.cityName) regionParts.push(String(docExtra.cityName));
                  if (docExtra.districtName) regionParts.push(String(docExtra.districtName));

                  return (
                    <Card key={doc.id}>
                      <CardContent className="flex items-start justify-between gap-3 p-4">
                        <div className="min-w-0 flex-1">
                          <Link
                            href={`/document/${doc.id}`}
                            className="block truncate text-base font-medium hover:text-primary hover:underline"
                          >
                            {doc.name}
                          </Link>
                          <div className="mt-1.5 flex flex-wrap gap-2 text-xs text-muted-foreground">
                            <span>{doc.year}年</span>
                            <span>{doc.category?.name ?? doc.docType}</span>
                            {regionParts.length > 0 && <span>{regionParts.join(' > ')}</span>}
                            <span>{formatFileSize(doc.fileSize)}</span>
                            <span>上传于 {formatDate(doc.createdAt)}</span>
                          </div>
                          {doc.tags && doc.tags.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {doc.tags.map((tag) => (
                                <span
                                  key={tag.id}
                                  className="rounded bg-muted px-1.5 py-0.5 text-xs"
                                >
                                  {tag.name}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="flex shrink-0 flex-col gap-2">
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
                  );
                })}
              </div>

              <Pagination className="mt-6 justify-end">
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      href="#"
                      text="上一页"
                      onClick={(e) => {
                        e.preventDefault();
                        if (page > 1) setPage((p) => p - 1);
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
                        if (page < (data.totalPages ?? 1)) setPage((p) => p + 1);
                      }}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </>
          ) : (
            <div className="flex h-60 flex-col items-center justify-center gap-3 rounded-lg border bg-muted/30">
              <p className="text-sm text-muted-foreground">未找到「{query}」相关的资料</p>
              <p className="text-xs text-muted-foreground">试试其他关键词</p>
            </div>
          )}
        </>
      ) : !initialQuery ? (
        <div className="flex h-40 items-center justify-center">
          <p className="text-sm text-muted-foreground">请输入关键词搜索</p>
        </div>
      ) : null}

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

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-4xl px-4 py-8">
          <h1 className="mb-6 text-2xl font-bold">搜索资料</h1>
          <div className="flex h-60 items-center justify-center">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        </div>
      }
    >
      <SearchContent />
    </Suspense>
  );
}
