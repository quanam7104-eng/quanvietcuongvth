import { createFileRoute, useRouter, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { ScrollText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast, Toaster } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Đăng nhập — TaxReconcile" },
      { name: "description", content: "Đăng nhập hoặc tạo tài khoản TaxReconcile để bắt đầu đối chiếu hóa đơn." },
    ],
  }),
  component: AuthPage,
});

const schema = z.object({
  email: z.string().trim().email("Email không hợp lệ").max(255),
  password: z.string().min(6, "Mật khẩu tối thiểu 6 ký tự").max(72),
});

function AuthPage() {
  const router = useRouter();
  const [tab, setTab] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) router.navigate({ to: "/", replace: true });
    });
  }, [router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse({ email, password });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setBusy(true);
    try {
      if (tab === "signup") {
        const { error } = await supabase.auth.signUp({
          email: parsed.data.email,
          password: parsed.data.password,
          options: { emailRedirectTo: `${window.location.origin}/` },
        });
        if (error) throw error;
        toast.success("Tạo tài khoản thành công!");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: parsed.data.email,
          password: parsed.data.password,
        });
        if (error) throw error;
        toast.success("Đăng nhập thành công");
      }
      router.navigate({ to: "/", replace: true });
    } catch (err) {
      const msg = (err as Error).message;
      toast.error(
        msg.includes("Invalid login") ? "Email hoặc mật khẩu không đúng"
        : msg.includes("already registered") ? "Email đã được đăng ký"
        : msg,
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-muted/40 px-4">
      <Toaster richColors position="top-right" />
      <Card className="w-full max-w-md p-6 shadow-lg">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <ScrollText className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold leading-tight">TaxReconcile</h1>
            <p className="text-xs text-muted-foreground whitespace-pre-line">
              Sản phẩm của sinh viên Trường Đại học Hùng Vương&nbsp;{"\n"}
              HVU -Quán Viết Cường&nbsp;
            </p>
          </div>
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as "signin" | "signup")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="signin">Đăng nhập</TabsTrigger>
            <TabsTrigger value="signup">Đăng ký</TabsTrigger>
          </TabsList>

          <form onSubmit={submit} className="mt-5 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" autoComplete="email" required
                value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="ban@congty.vn" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Mật khẩu</Label>
              <Input id="password" type="password" required
                autoComplete={tab === "signup" ? "new-password" : "current-password"}
                value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="Tối thiểu 6 ký tự" />
            </div>

            <TabsContent value="signin" className="m-0 p-0" />
            <TabsContent value="signup" className="m-0 p-0" />

            <Button type="submit" className="w-full" disabled={busy}>
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {tab === "signup" ? "Tạo tài khoản" : "Đăng nhập"}
            </Button>
          </form>
        </Tabs>

        <p className="mt-6 text-center text-xs text-muted-foreground whitespace-pre-line">
          Dữ liệu hóa đơn được xử lý trực tiếp trên trình duyệt{"\n"}
          STK: 100877640769-Viettinbank- Quán Viết Cường{"\n"}
          Sản phẩm Free không thu phí , mọi ủng hộ xin phép gửi vào STK trên.
        </p>
        <div className="mt-3 text-center">
          <Link
            to="/huong-dan/tai-du-lieu-thue"
            className="text-xs text-primary hover:underline"
          >
            Hướng dẫn tải dữ liệu từ Tổng cục Thuế →
          </Link>
        </div>
      </Card>
    </div>
  );
}