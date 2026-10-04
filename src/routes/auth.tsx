import { createFileRoute, useRouter, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { ScrollText, Loader2, Eye, EyeOff, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast, Toaster } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  ssr: false,
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

function PasswordInput({
  id,
  value,
  onChange,
  autoComplete,
  placeholder,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete: string;
  placeholder?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input
        id={id}
        type={show ? "text" : "password"}
        required
        autoComplete={autoComplete}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="pr-10"
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        aria-label={show ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

function AuthPage() {
  const router = useRouter();
  const [tab, setTab] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  // Bước nhập mã 6 số sau khi đăng ký
  const [pendingEmail, setPendingEmail] = useState("");
  const [otp, setOtp] = useState("");

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
    if (tab === "signup" && password !== confirmPassword) {
      toast.error("Mật khẩu nhập lại không khớp");
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
        setPendingEmail(parsed.data.email);
        setOtp("");
        toast.success("Đã gửi mã xác nhận 6 số về email của bạn");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: parsed.data.email,
          password: parsed.data.password,
        });
        if (error) throw error;
        toast.success("Đăng nhập thành công");
        router.navigate({ to: "/", replace: true });
      }
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

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    const token = otp.trim();
    if (!/^\d{6}$/.test(token)) {
      toast.error("Mã xác nhận gồm 6 chữ số");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email: pendingEmail,
        token,
        type: "signup",
      });
      if (error) throw error;
      toast.success("Xác nhận thành công! Chào mừng bạn.");
      router.navigate({ to: "/", replace: true });
    } catch (err) {
      const msg = (err as Error).message;
      toast.error(
        msg.includes("expired") ? "Mã đã hết hạn, hãy gửi lại mã mới"
        : msg.includes("invalid") || msg.includes("Token") ? "Mã xác nhận không đúng"
        : msg,
      );
    } finally {
      setBusy(false);
    }
  }

  async function resendCode() {
    setBusy(true);
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: pendingEmail,
      });
      if (error) throw error;
      toast.success("Đã gửi lại mã xác nhận mới");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  // Màn hình nhập mã 6 số sau đăng ký
  if (pendingEmail) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-muted/40 px-4">
        <Toaster richColors position="top-right" />
        <Card className="w-full max-w-md p-6 shadow-lg">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <MailCheck className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-lg font-bold leading-tight">Xác nhận email</h1>
              <p className="text-xs text-muted-foreground">
                Nhập mã 6 số đã gửi về <span className="font-medium">{pendingEmail}</span>
              </p>
            </div>
          </div>

          <form onSubmit={verifyCode} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="otp">Mã xác nhận (6 số)</Label>
              <Input
                id="otp"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                required
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="______"
                className="text-center text-2xl font-semibold tracking-[0.5em]"
              />
            </div>
            <Button type="submit" className="w-full" disabled={busy || otp.length !== 6}>
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Xác nhận
            </Button>
          </form>

          <div className="mt-4 flex items-center justify-between text-xs">
            <button
              type="button"
              onClick={() => { setPendingEmail(""); setOtp(""); }}
              className="text-muted-foreground hover:text-foreground"
            >
              ← Quay lại đăng ký
            </button>
            <button
              type="button"
              onClick={resendCode}
              disabled={busy}
              className="text-primary hover:underline disabled:opacity-50"
            >
              Gửi lại mã
            </button>
          </div>
        </Card>
      </div>
    );
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
            <h1 className="text-lg font-bold leading-tight">TaxReconcile - Vũ Thị Hiền</h1>
            <p className="text-xs text-muted-foreground whitespace-pre-line">
              Sản phẩm của sinh viên Trường Đại học Hùng Vương&nbsp;{"\n"}
              HVU
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
              <PasswordInput
                id="password"
                autoComplete={tab === "signup" ? "new-password" : "current-password"}
                value={password}
                onChange={setPassword}
                placeholder="Tối thiểu 6 ký tự"
              />
            </div>

            <TabsContent value="signin" className="m-0 p-0" />
            <TabsContent value="signup" className="m-0 space-y-2 p-0">
              <Label htmlFor="confirm-password">Nhập lại mật khẩu</Label>
              <PasswordInput
                id="confirm-password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={setConfirmPassword}
                placeholder="Nhập lại mật khẩu"
              />
            </TabsContent>

            <Button type="submit" className="w-full" disabled={busy}>
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {tab === "signup" ? "Tạo tài khoản" : "Đăng nhập"}
            </Button>
          </form>
        </Tabs>

        <p className="mt-6 text-center text-xs text-muted-foreground whitespace-pre-line">{"\n"}</p>
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
