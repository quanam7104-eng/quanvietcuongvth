import type { ReactNode } from "react";
import { Moon, Sun, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Toaster } from "sonner";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";

interface AppShellProps {
  email: string;
  dark: boolean;
  onToggleDark: () => void;
  onSignOut: () => void;
  actions?: ReactNode;
  children: ReactNode;
}

export function AppShell({ email, dark, onToggleDark, onSignOut, actions, children }: AppShellProps) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <Toaster richColors position="top-right" />
        <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center gap-2 border-b bg-background/80 px-4 backdrop-blur">
          <SidebarTrigger />
          <div className="ml-auto flex items-center gap-2">
            {email && <span className="hidden text-xs text-muted-foreground lg:inline">{email}</span>}
            {actions}
            <Button variant="ghost" size="icon" onClick={onToggleDark} title="Đổi giao diện sáng/tối">
              {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" size="icon" onClick={onSignOut} title="Đăng xuất">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </header>
        <main className="flex-1">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
