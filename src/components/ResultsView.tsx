import { useMemo, useState } from "react";
import type { Invoice, MatchedPair, ReconcileResult } from "@/lib/reconcile";
import { FIELD_LABELS, formatVND } from "@/lib/reconcile";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { AlertTriangle } from "lucide-react";

function filter<T>(rows: T[], q: string, getters: ((r: T) => string | number)[]) {
  if (!q) return rows;
  const lc = q.toLowerCase();
  return rows.filter((r) => getters.some((g) => String(g(r) ?? "").toLowerCase().includes(lc)));
}

const th = "px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground";
const td = "px-3 py-2 text-sm";

export function ResultsView({ result }: { result: ReconcileResult }) {
  const [q, setQ] = useState("");
  const [detail, setDetail] = useState<MatchedPair | null>(null);

  const matched = useMemo(
    () => filter(result.matched, q, [(m) => m.tax.soHoaDon, (m) => m.tax.mst, (m) => m.tax.tenKH]),
    [result.matched, q],
  );
  const mismatched = useMemo(
    () => filter(result.mismatched, q, [(m) => m.tax.soHoaDon, (m) => m.tax.mst, (m) => m.tax.tenKH]),
    [result.mismatched, q],
  );
  const onlyTax = useMemo(
    () => filter(result.onlyTax, q, [(r) => r.soHoaDon, (r) => r.mst, (r) => r.tenKH]),
    [result.onlyTax, q],
  );
  const onlyEB = useMemo(
    () => filter(result.onlyEB, q, [(r) => r.soHoaDon, (r) => r.mst, (r) => r.tenKH]),
    [result.onlyEB, q],
  );

  return (
    <div className="space-y-3">
      <Input
        placeholder="Tìm theo số hóa đơn, MST, tên đơn vị…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        className="max-w-md"
      />
      <Tabs defaultValue="mismatched">
        <TabsList className="flex-wrap">
          <TabsTrigger value="mismatched">
            Lệch <Badge variant="destructive" className="ml-2">{mismatched.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="onlyTax">
            Thiếu trên EasyBooks <Badge variant="secondary" className="ml-2">{onlyTax.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="onlyEB">
            Thiếu trên Thuế <Badge variant="secondary" className="ml-2">{onlyEB.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="matched">
            Khớp <Badge variant="secondary" className="ml-2">{matched.length}</Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="mismatched">
          <ScrollTable>
            <thead className="bg-muted/50"><tr>
              <th className={th}>Số HĐ</th><th className={th}>Ký hiệu</th>
              <th className={th}>MST</th><th className={th}>Ngày</th>
              <th className={th}>Tổng (Thuế)</th><th className={th}>Tổng (EB)</th>
              <th className={th}>Chỉ tiêu lệch</th><th className={th}></th>
            </tr></thead>
            <tbody>
              {mismatched.map((m, i) => (
                <tr key={i} className="border-t hover:bg-muted/30 cursor-pointer" onClick={() => setDetail(m)}>
                  <td className={`${td} font-medium`}>{m.tax.soHoaDon}</td>
                  <td className={td}>{m.tax.kyHieu}</td>
                  <td className={td}>{m.tax.mst}</td>
                  <td className={td}>{m.tax.ngay}</td>
                  <td className={td}>{formatVND(m.tax.tongTien)}</td>
                  <td className={td}>{formatVND(m.eb.tongTien)}</td>
                  <td className={td}>
                    <div className="flex flex-wrap gap-1">
                      {m.diffs.map((d, j) => (
                        <Badge key={j} variant="destructive" className="gap-1">
                          <AlertTriangle className="h-3 w-3" />{FIELD_LABELS[d.field as keyof typeof FIELD_LABELS] ?? d.field}
                        </Badge>
                      ))}
                    </div>
                  </td>
                  <td className={`${td} text-primary text-xs`}>Xem chi tiết →</td>
                </tr>
              ))}
              {!mismatched.length && <EmptyRow text="Không có hóa đơn lệch." cols={8} />}
            </tbody>
          </ScrollTable>
        </TabsContent>

        <TabsContent value="onlyTax">
          <SimpleInvoiceTable rows={onlyTax} status="Không tìm thấy trên EasyBooks" badgeVariant="destructive" />
        </TabsContent>
        <TabsContent value="onlyEB">
          <SimpleInvoiceTable rows={onlyEB} status="Không tìm thấy trên dữ liệu Thuế" badgeVariant="secondary" />
        </TabsContent>
        <TabsContent value="matched">
          <ScrollTable>
            <thead className="bg-muted/50"><tr>
              <th className={th}>Số HĐ</th><th className={th}>MST</th>
              <th className={th}>Tên KH</th><th className={th}>Tổng tiền</th><th className={th}>Trạng thái</th>
            </tr></thead>
            <tbody>
              {matched.map((m, i) => (
                <tr key={i} className="border-t hover:bg-muted/30">
                  <td className={`${td} font-medium`}>{m.tax.soHoaDon}</td>
                  <td className={td}>{m.tax.mst}</td>
                  <td className={td}>{m.tax.tenKH}</td>
                  <td className={td}>{formatVND(m.tax.tongTien)}</td>
                  <td className={td}><Badge className="bg-success text-success-foreground">KHỚP</Badge></td>
                </tr>
              ))}
              {!matched.length && <EmptyRow text="Chưa có hóa đơn khớp." cols={5} />}
            </tbody>
          </ScrollTable>
        </TabsContent>
      </Tabs>

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Chi tiết chênh lệch — HĐ {detail?.tax.soHoaDon}</DialogTitle>
          </DialogHeader>
          {detail && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3 rounded-lg bg-muted/40 p-3 text-sm">
                <div><div className="text-xs text-muted-foreground">Ký hiệu</div>{detail.tax.kyHieu}</div>
                <div><div className="text-xs text-muted-foreground">MST</div>{detail.tax.mst}</div>
                <div><div className="text-xs text-muted-foreground">Ngày HĐ</div>{detail.tax.ngay}</div>
                <div><div className="text-xs text-muted-foreground">Tên KH</div>{detail.tax.tenKH}</div>
              </div>
              <table className="w-full text-sm">
                <thead><tr className="text-xs text-muted-foreground">
                  <th className="text-left py-1">Chỉ tiêu</th>
                  <th className="text-right py-1">Thuế</th>
                  <th className="text-right py-1">EasyBooks</th>
                  <th className="text-right py-1">Chênh lệch</th>
                </tr></thead>
                <tbody>
                  {detail.diffs.map((d, i) => (
                    <tr key={i} className="border-t">
                      <td className="py-2 font-medium">{FIELD_LABELS[d.field as keyof typeof FIELD_LABELS] ?? d.field}</td>
                      <td className="py-2 text-right">{typeof d.tax === "number" ? formatVND(d.tax) : d.tax}</td>
                      <td className="py-2 text-right">{typeof d.eb === "number" ? formatVND(d.eb) : d.eb}</td>
                      <td className={`py-2 text-right font-semibold ${d.delta && d.delta !== 0 ? "text-destructive" : ""}`}>
                        {d.delta !== undefined ? (d.delta > 0 ? "+" : "") + formatVND(d.delta) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ScrollTable({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-3 max-h-[60vh] overflow-auto rounded-lg border bg-card">
      <table className="w-full">{children}</table>
    </div>
  );
}
function EmptyRow({ text, cols }: { text: string; cols: number }) {
  return <tr><td colSpan={cols} className="px-3 py-8 text-center text-sm text-muted-foreground">{text}</td></tr>;
}

function SimpleInvoiceTable({
  rows, status, badgeVariant,
}: { rows: Invoice[]; status: string; badgeVariant: "destructive" | "secondary" }) {
  return (
    <ScrollTable>
      <thead className="bg-muted/50"><tr>
        <th className={th}>Số HĐ</th><th className={th}>Ký hiệu</th>
        <th className={th}>Ngày HĐ</th><th className={th}>MST</th>
        <th className={th}>Tên KH</th><th className={th}>Tổng tiền</th><th className={th}>Trạng thái</th>
      </tr></thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i} className="border-t hover:bg-muted/30">
            <td className={`${td} font-medium`}>{r.soHoaDon}</td>
            <td className={td}>{r.kyHieu}</td>
            <td className={td}>{r.ngay}</td>
            <td className={td}>{r.mst}</td>
            <td className={td}>{r.tenKH}</td>
            <td className={td}>{formatVND(r.tongTien)}</td>
            <td className={td}><Badge variant={badgeVariant}>{status}</Badge></td>
          </tr>
        ))}
        {!rows.length && <EmptyRow text="Không có dữ liệu." cols={7} />}
      </tbody>
    </ScrollTable>
  );
}