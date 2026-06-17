import { useEffect, useState, useCallback } from "react";
import { History, Trash2, RotateCcw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { formatVND, type ReconcileResult } from "@/lib/reconcile";

interface HistoryRow {
  id: string;
  tax_file_name: string | null;
  eb_file_name: string | null;
  matched_count: number;
  mismatched_count: number;
  only_tax_count: number;
  only_eb_count: number;
  total_diff: number;
  created_at: string;
}

export function HistoryPanel({
  reloadKey,
  onLoad,
}: {
  reloadKey: number;
  onLoad: (r: ReconcileResult, label: string) => void;
}) {
  const [rows, setRows] = useState<HistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [openingId, setOpeningId] = useState<string | null>(null);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("reconciliations")
      .select("id,tax_file_name,eb_file_name,matched_count,mismatched_count,only_tax_count,only_eb_count,total_diff,created_at")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) toast.error("Không tải được lịch sử: " + error.message);
    else setRows((data ?? []) as HistoryRow[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchRows(); }, [fetchRows, reloadKey]);

  async function loadOne(id: string, label: string) {
    setOpeningId(id);
    const { data, error } = await supabase
      .from("reconciliations").select("result").eq("id", id).maybeSingle();
    setOpeningId(null);
    if (error || !data) { toast.error("Không mở được kết quả"); return; }
    onLoad(data.result as unknown as ReconcileResult, label);
    toast.success("Đã tải lại kết quả cũ");
  }

  async function remove(id: string) {
    if (!confirm("Xóa lần đối chiếu này?")) return;
    const { error } = await supabase.from("reconciliations").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    setRows((r) => r.filter((x) => x.id !== id));
    toast.success("Đã xóa");
  }

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center gap-2">
        <History className="h-4 w-4" />
        <h3 className="font-semibold">Lịch sử đối chiếu của bạn</h3>
        <Badge variant="secondary" className="ml-auto">{rows.length}</Badge>
      </div>
      {loading ? (
        <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Đang tải…
        </div>
      ) : rows.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted-foreground">
          Chưa có lịch sử. Mỗi lần đối chiếu sẽ tự động được lưu vào tài khoản của bạn.
        </p>
      ) : (
        <ul className="divide-y">
          {rows.map((r) => {
            const label = `${r.tax_file_name ?? "Thuế"} ↔ ${r.eb_file_name ?? "EB"}`;
            return (
              <li key={r.id} className="flex flex-wrap items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{label}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(r.created_at).toLocaleString("vi-VN")}
                    {" · "}Khớp {r.matched_count} · Lệch {r.mismatched_count} · Thiếu {r.only_tax_count + r.only_eb_count}
                    {r.total_diff !== 0 && (
                      <span className="ml-1 text-destructive">· Δ {formatVND(Number(r.total_diff))}</span>
                    )}
                  </p>
                </div>
                <Button size="sm" variant="outline" disabled={openingId === r.id}
                  onClick={() => loadOne(r.id, label)}>
                  {openingId === r.id
                    ? <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                    : <RotateCcw className="mr-1 h-3 w-3" />}
                  Mở lại
                </Button>
                <Button size="sm" variant="ghost" onClick={() => remove(r.id)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}