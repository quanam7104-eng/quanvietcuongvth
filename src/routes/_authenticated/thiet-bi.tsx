import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast, Toaster } from "sonner";
import { ArrowLeft, ShieldAlert, RotateCw, Trash2, LogOut as LogOutIcon } from "lucide-react";
import {
  amIAdmin,
  claimAdminIfNone,
  listAllDevices,
  revokeDevice,
  restoreDevice,
  deleteDevice,
} from "@/lib/devices.functions";

export const Route = createFileRoute("/_authenticated/thiet-bi")({
  head: () => ({
    meta: [{ title: "Quản lý thiết bị truy cập" }],
  }),
  component: DevicesAdmin,
});

type Device = {
  id: string;
  user_id: string;
  user_email: string | null;
  device_id: string;
  user_agent: string | null;
  ip: string | null;
  created_at: string;
  last_seen_at: string;
  revoked_at: string | null;
};

function shortUA(ua: string | null): string {
  if (!ua) return "Không rõ";
  const s = ua;
  if (/iPhone|iPad/.test(s)) return "iOS · " + (s.match(/Version\/[\d.]+/)?.[0] ?? "Safari");
  if (/Android/.test(s)) return "Android · " + (s.match(/Chrome\/[\d.]+/)?.[0] ?? "Chrome");
  if (/Edg\//.test(s)) return "Edge · Windows/Mac";
  if (/Chrome\//.test(s)) return "Chrome · " + (s.match(/Chrome\/[\d.]+/)?.[0] ?? "");
  if (/Firefox\//.test(s)) return "Firefox";
  if (/Safari\//.test(s)) return "Safari";
  return s.slice(0, 60);
}

function fmt(t: string) {
  try {
    return new Date(t).toLocaleString("vi-VN");
  } catch {
    return t;
  }
}

function DevicesAdmin() {
  const _check = useServerFn(amIAdmin);
  const _claim = useServerFn(claimAdminIfNone);
  const _list = useServerFn(listAllDevices);
  const _revoke = useServerFn(revokeDevice);
  const _restore = useServerFn(restoreDevice);
  const _delete = useServerFn(deleteDevice);

  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [devices, setDevices] = useState<Device[]>([]);

  async function refresh() {
    setLoading(true);
    try {
      let admin = (await _check()).isAdmin;
      if (!admin) {
        const c = await _claim();
        if (c.granted) {
          admin = true;
          toast.success("Bạn là admin đầu tiên — đã cấp quyền quản trị.");
        }
      }
      setIsAdmin(admin);
      if (admin) {
        const rows = (await _list()) as Device[];
        setDevices(rows);
      }
    } catch (e: any) {
      toast.error(e?.message ?? "Không tải được danh sách");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 15_000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onRevoke(id: string) {
    if (!confirm("Kick thiết bị này ra khỏi web?")) return;
    try {
      await _revoke({ data: { id } });
      toast.success("Đã kick thiết bị");
      refresh();
    } catch (e: any) {
      toast.error(e?.message ?? "Lỗi");
    }
  }
  async function onRestore(id: string) {
    try {
      await _restore({ data: { id } });
      toast.success("Đã bỏ khóa");
      refresh();
    } catch (e: any) {
      toast.error(e?.message ?? "Lỗi");
    }
  }
  async function onDelete(id: string) {
    if (!confirm("Xóa bản ghi thiết bị này?")) return;
    try {
      await _delete({ data: { id } });
      toast.success("Đã xóa");
      refresh();
    } catch (e: any) {
      toast.error(e?.message ?? "Lỗi");
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Toaster richColors position="top-right" />
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <Link
              to="/"
              className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" /> Quay lại
            </Link>
            <h1 className="text-2xl font-bold">Quản lý thiết bị truy cập</h1>
            <p className="text-sm text-muted-foreground">
              Xem tất cả thiết bị đang đăng nhập vào web và kick khi cần.
            </p>
          </div>
          <Button variant="outline" onClick={refresh} disabled={loading}>
            <RotateCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Làm mới
          </Button>
        </div>

        {!loading && !isAdmin && (
          <Card className="p-6">
            <div className="flex items-start gap-3">
              <ShieldAlert className="h-5 w-5 text-destructive" />
              <div>
                <div className="font-medium">Bạn chưa có quyền quản trị</div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Trang này chỉ dành cho admin. Admin đầu tiên được cấp tự động cho tài khoản
                  truy cập đầu tiên. Nếu bạn cần quyền, liên hệ admin hiện tại.
                </p>
              </div>
            </div>
          </Card>
        )}

        {isAdmin && (
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left">
                  <tr>
                    <th className="px-4 py-3">Người dùng</th>
                    <th className="px-4 py-3">Thiết bị</th>
                    <th className="px-4 py-3">IP</th>
                    <th className="px-4 py-3">Đăng nhập lúc</th>
                    <th className="px-4 py-3">Hoạt động cuối</th>
                    <th className="px-4 py-3">Trạng thái</th>
                    <th className="px-4 py-3 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {devices.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                        Chưa có thiết bị nào.
                      </td>
                    </tr>
                  )}
                  {devices.map((d) => {
                    const online =
                      !d.revoked_at && Date.now() - new Date(d.last_seen_at).getTime() < 60_000;
                    return (
                      <tr key={d.id} className="border-t">
                        <td className="px-4 py-3">
                          <div className="font-medium">{d.user_email ?? "—"}</div>
                          <div className="text-xs text-muted-foreground">{d.user_id.slice(0, 8)}…</div>
                        </td>
                        <td className="px-4 py-3">
                          <div>{shortUA(d.user_agent)}</div>
                          <div className="text-xs text-muted-foreground">{d.device_id.slice(0, 10)}…</div>
                        </td>
                        <td className="px-4 py-3">{d.ip ?? "—"}</td>
                        <td className="px-4 py-3">{fmt(d.created_at)}</td>
                        <td className="px-4 py-3">{fmt(d.last_seen_at)}</td>
                        <td className="px-4 py-3">
                          {d.revoked_at ? (
                            <Badge variant="destructive">Đã kick</Badge>
                          ) : online ? (
                            <Badge className="bg-emerald-600 hover:bg-emerald-600">Đang online</Badge>
                          ) : (
                            <Badge variant="secondary">Offline</Badge>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2">
                            {d.revoked_at ? (
                              <Button size="sm" variant="outline" onClick={() => onRestore(d.id)}>
                                Bỏ khóa
                              </Button>
                            ) : (
                              <Button size="sm" variant="destructive" onClick={() => onRevoke(d.id)}>
                                <LogOutIcon className="mr-1 h-3.5 w-3.5" /> Kick
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => onDelete(d.id)}
                              title="Xóa bản ghi"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        <p className="mt-4 text-xs text-muted-foreground">
          Web tự kiểm tra mỗi 20 giây. Thiết bị bị kick sẽ tự đăng xuất trong vòng 20 giây.
        </p>
      </div>
    </div>
  );
}