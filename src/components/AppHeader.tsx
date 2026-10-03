import type { ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { Moon, Sun, LogOut, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const TABS = [
  {
    to: "/" as const,
    label: "Đối chiếu Doanh nghiệp (GTGT)",
    match: (p: string) => p === "/" || p === "",
  },
  {
    to: "/ho-kinh-doanh" as const,
    label: "Đối chiếu Hộ Kinh Doanh",
    match: (p: string) => p.startsWith("/ho-kinh-doanh"),
  },
];

interface AppHeaderProps {
  email: string;
  dark: boolean;
  onToggleDark: () => void;
  onSignOut: () => void;
  actions?: ReactNode;
}

export function AppHeader({ email, dark, onToggleDark, onSignOut, actions }: AppHeaderProps) {
  const pathname = useRouterState({ select: (r) => r.location.pathname });

  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto max-w-7xl px-4">
        <div className="flex items-center justify-between gap-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-base font-bold leading-tight">Đối chiếu Hóa Đơn từ thuế và phần mềm .</h1>
              <p className="text-xs text-muted-foreground whitespace-pre-line">
                Sản phẩm của sinh viên Trường Đại học Hùng Vương&nbsp;{"\n"}
                HVU -Quán Viết Cường&nbsp;
              </p>
            </div>
          </div>

          {/* Menu chính: chia hai chức năng đối chiếu */}
          <nav className="hidden items-center gap-1 md:flex" aria-label="Chức năng đối chiếu">
            {TABS.map((tab) => {
              const active = tab.match(pathname);
              return (
                <Link
                  key={tab.to}
                  to={tab.to}
                  className={cn(
                    "rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  {tab.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            {email && <span className="hidden text-xs text-muted-foreground lg:inline">{email}</span>}
            <Link
              to="/huong-dan/tai-du-lieu-thue"
              className="hidden text-xs text-primary hover:underline xl:inline"
            >
              <BookOpen className="mr-1 inline h-3.5 w-3.5" />
              Hướng dẫn tải dữ liệu
            </Link>
            {actions}
            <Button variant="ghost" size="icon" onClick={onToggleDark} title="Đổi giao diện sáng/tối">
              {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" size="icon" onClick={onSignOut} title="Đăng xuất">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Menu dạng chip cho màn hình nhỏ */}
        <nav className="flex items-center gap-2 pb-3 md:hidden" aria-label="Chức năng đối chiếu (mobile)">
          {TABS.map((tab) => {
            const active = tab.match(pathname);
            return (
              <Link
                key={tab.to}
                to={tab.to}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border text-muted-foreground"
                )}
              >
                {tab.label}
              </Link>
            );
          })}
          <Link
            to="/huong-dan/tai-du-lieu-thue"
            className="rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground"
          >
            Hướng dẫn
          </Link>
        </nav>
      </div>
    </header>
  );
}
