'use client';

import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search } from 'lucide-react';
import { useState } from 'react';

export default function PublicHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const [keyword, setKeyword] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (keyword.trim()) {
      router.push(`/search?q=${encodeURIComponent(keyword.trim())}`);
    }
  };

  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground text-sm font-bold">
              D
            </div>
            <span className="text-base font-semibold">资料管理系统</span>
          </Link>
          <nav className="hidden gap-4 sm:flex">
            <Link
              href="/"
              className={`text-sm ${pathname === '/' ? 'text-primary font-medium' : 'text-muted-foreground hover:text-foreground'}`}
            >
              首页
            </Link>
            <Link
              href="/projects"
              className={`text-sm ${pathname === '/projects' ? 'text-primary font-medium' : 'text-muted-foreground hover:text-foreground'}`}
            >
              全部项目
            </Link>
          </nav>
        </div>

        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="搜索..."
              className="w-44 pl-8 sm:w-56"
            />
          </div>
          <Button type="submit" size="sm" variant="outline">
            搜索
          </Button>
        </form>
      </div>
    </header>
  );
}
