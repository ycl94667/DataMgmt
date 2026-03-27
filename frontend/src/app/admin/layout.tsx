'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/stores/auth-store';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  FolderKanban,
  FileText,
  Tags,
  Video,
  MapPin,
  KeyRound,
  Trash2,
  ScrollText,
  BarChart3,
  Users,
  LogOut,
  Menu,
  ShieldCheck,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Sidebar navigation items
// ---------------------------------------------------------------------------

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  superAdminOnly?: boolean;
}

const navItems: NavItem[] = [
  { label: '项目管理', href: '/admin/projects', icon: FolderKanban },
  { label: '资料管理', href: '/admin/documents', icon: FileText },
  { label: '标签管理', href: '/admin/tags', icon: Tags },
  { label: '视频管理', href: '/admin/videos', icon: Video },
  { label: '地区管理', href: '/admin/regions', icon: MapPin },
  {
    label: '授权码管理',
    href: '/admin/auth-codes',
    icon: KeyRound,
    superAdminOnly: true,
  },
  { label: '回收站', href: '/admin/recycle', icon: Trash2 },
  {
    label: '审计日志',
    href: '/admin/audit-logs',
    icon: ScrollText,
    superAdminOnly: true,
  },
  {
    label: '统计概览',
    href: '/admin/stats',
    icon: BarChart3,
    superAdminOnly: true,
  },
  {
    label: '管理员管理',
    href: '/admin/admins',
    icon: Users,
    superAdminOnly: true,
  },
];

// ---------------------------------------------------------------------------
// Sidebar content (shared between desktop sidebar and mobile sheet)
// ---------------------------------------------------------------------------

function SidebarNav({
  items,
  pathname,
  onNavigate,
}: {
  items: NavItem[];
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <nav className="grid gap-1 px-2">
      {items.map((item) => {
        const Icon = item.icon;
        const isActive =
          pathname === item.href || pathname.startsWith(item.href + '/');

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              isActive
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            <Icon className="size-4 shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { admin, isAuthenticated, loadFromStorage, logout } = useAuthStore();

  const [ready, setReady] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // --- Auth guard -----------------------------------------------------------
  useEffect(() => {
    loadFromStorage();
    setReady(true);
  }, [loadFromStorage]);

  useEffect(() => {
    if (!ready) return;

    // Allow the login page to render without auth
    if (pathname === '/admin/login') return;

    if (!isAuthenticated) {
      router.replace('/admin/login');
    }
  }, [ready, isAuthenticated, pathname, router]);

  // Don't render anything until we've checked storage
  if (!ready) return null;

  // Login page should be rendered without the admin chrome
  if (pathname === '/admin/login') {
    return <>{children}</>;
  }

  // While redirecting to login
  if (!isAuthenticated) return null;

  const isSuperAdmin = admin?.role === 'super_admin';
  const visibleItems = navItems.filter(
    (item) => !item.superAdminOnly || isSuperAdmin
  );

  const handleLogout = async () => {
    await logout();
    router.replace('/admin/login');
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* ---- Desktop Sidebar ---- */}
      <aside className="hidden w-60 shrink-0 border-r bg-card md:flex md:flex-col">
        <div className="flex h-14 items-center gap-2 px-4">
          <ShieldCheck className="size-5 text-primary" />
          <span className="text-sm font-semibold">资料管理系统</span>
        </div>
        <Separator />
        <ScrollArea className="flex-1 py-2">
          <SidebarNav items={visibleItems} pathname={pathname} />
        </ScrollArea>
      </aside>

      {/* ---- Main Area ---- */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* ---- Top bar ---- */}
        <header className="flex h-14 shrink-0 items-center justify-between border-b bg-card px-4">
          {/* Mobile menu trigger */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger
              className="inline-flex items-center justify-center rounded-lg p-2 hover:bg-muted md:hidden"
            >
              <Menu className="size-5" />
              <span className="sr-only">打开菜单</span>
            </SheetTrigger>
            <SheetContent side="left" className="w-60 p-0">
              <SheetHeader className="h-14 flex-row items-center gap-2 px-4">
                <ShieldCheck className="size-5 text-primary" />
                <SheetTitle className="text-sm font-semibold">
                  资料管理系统
                </SheetTitle>
              </SheetHeader>
              <Separator />
              <ScrollArea className="flex-1 py-2">
                <SidebarNav
                  items={visibleItems}
                  pathname={pathname}
                  onNavigate={() => setMobileOpen(false)}
                />
              </ScrollArea>
            </SheetContent>
          </Sheet>

          {/* Spacer for desktop (no hamburger) */}
          <div className="hidden md:block" />

          {/* Right side: user info + logout */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">
              {admin?.realName ?? admin?.username ?? '管理员'}
            </span>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="size-4" />
              退出登录
            </Button>
          </div>
        </header>

        {/* ---- Page content ---- */}
        <main className="flex-1 overflow-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
