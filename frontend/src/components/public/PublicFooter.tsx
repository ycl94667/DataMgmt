export default function PublicFooter() {
  return (
    <footer className="border-t bg-muted/30 py-6">
      <div className="mx-auto max-w-5xl px-4 text-center text-sm text-muted-foreground">
        &copy; {new Date().getFullYear()} 资料管理系统 — 仅供内部使用
      </div>
    </footer>
  );
}
