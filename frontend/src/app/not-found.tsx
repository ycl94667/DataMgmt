import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="text-center">
        <h1 className="mb-2 text-6xl font-bold text-muted-foreground">404</h1>
        <h2 className="mb-4 text-xl font-semibold">页面未找到</h2>
        <p className="mb-8 text-muted-foreground">
          您访问的页面不存在或已被移除
        </p>
        <div className="flex gap-4 justify-center">
          <Link href="/">
            <Button>返回首页</Button>
          </Link>
          <Link href="/projects">
            <Button variant="outline">浏览项目</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
