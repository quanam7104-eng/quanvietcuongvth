import { Link, useRouterState } from "@tanstack/react-router";
import { Building2, Store, BookOpen, Landmark } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const MAIN_ITEMS = [
  {
    title: "Đối chiếu Doanh nghiệp",
    url: "/",
    icon: Building2,
    match: (p: string) => p === "/" || p === "",
  },
  {
    title: "Đối chiếu Hộ Kinh Doanh",
    url: "/ho-kinh-doanh",
    icon: Store,
    match: (p: string) => p.startsWith("/ho-kinh-doanh"),
  },
  {
    title: "Đối chiếu Sao kê Ngân hàng",
    url: "/sao-ke-ngan-hang",
    icon: Landmark,
    match: (p: string) => p.startsWith("/sao-ke-ngan-hang"),
  },
];

const HELP_ITEMS = [
  {
    title: "Hướng dẫn tải dữ liệu",
    url: "/huong-dan/tai-du-lieu-thue",
    icon: BookOpen,
    match: (p: string) => p.startsWith("/huong-dan"),
  },
];

export function AppSidebar() {
  const pathname = useRouterState({ select: (r) => r.location.pathname });

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link to="/">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <BookOpen className="h-5 w-5" />
                </div>
                <span className="text-sm font-bold leading-tight">
                  Đối chiếu Hóa Đơn
                  <span className="block text-[10px] font-normal text-muted-foreground">từ thuế và phần mềm</span>
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Chức năng đối chiếu hóa đơn mùa vào bán ra với bảng kê hóa đơn từ thuế</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {MAIN_ITEMS.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild isActive={item.match(pathname)} tooltip={item.title}>
                    <Link to={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Hỗ trợ</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {HELP_ITEMS.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild isActive={item.match(pathname)} tooltip={item.title}>
                    <Link to={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
