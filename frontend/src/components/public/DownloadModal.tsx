'use client';

import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { frontApi } from '@/lib/api';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2 } from 'lucide-react';

const STORAGE_KEY = 'auth_code';

interface DownloadModalProps {
  open: boolean;
  documentId: number;
  documentName: string;
  onOpenChange: (open: boolean) => void;
}

export default function DownloadModal({
  open,
  documentId,
  documentName,
  onOpenChange,
}: DownloadModalProps) {
  const [code, setCode] = useState('');
  const [remember, setRemember] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load saved code on open
  useEffect(() => {
    if (open) {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setCode(saved);
        setRemember(true);
      }
      // Focus input after a tick
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const handleDownload = async () => {
    if (!code.trim()) {
      toast.error('请输入授权码');
      return;
    }

    setVerifying(true);
    try {
      // Verify code first
      await frontApi.verifyCode(code.trim());

      // Save if remember is checked
      if (remember) {
        localStorage.setItem(STORAGE_KEY, code.trim());
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }

      // Proceed with download
      setVerifying(false);
      setDownloading(true);
      const blob = await frontApi.downloadDocument(documentId, code.trim());
      const url = URL.createObjectURL(blob as unknown as Blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = documentName;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('下载成功');
      onOpenChange(false);
    } catch (error) {
      const msg = error instanceof Error ? error.message : '验证或下载失败';
      toast.error(msg);
    } finally {
      setVerifying(false);
      setDownloading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>验证授权码</DialogTitle>
          <DialogDescription>请输入授权码以下载「{documentName}」</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="auth-code">授权码</Label>
            <Input
              id="auth-code"
              ref={inputRef}
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="请输入8位授权码"
              maxLength={16}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  void handleDownload();
                }
              }}
            />
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="remember-code"
              checked={remember}
              onCheckedChange={(v) => setRemember(Boolean(v))}
            />
            <Label htmlFor="remember-code" className="text-sm cursor-pointer">
              记住授权码（下次自动使用）
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={verifying || downloading}>
            取消
          </Button>
          <Button onClick={() => void handleDownload()} disabled={verifying || downloading}>
            {(verifying || downloading) && <Loader2 className="size-4 animate-spin" />}
            {verifying ? '验证中...' : downloading ? '下载中...' : '确认下载'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
