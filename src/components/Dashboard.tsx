import type { ReconcileResult } from "@/lib/reconcile";
import { formatVND } from "@/lib/reconcile";
import { Card } from "@/components/ui/card";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { CheckCircle2, AlertTriangle, FileX, FileSpreadsheet, Copy } from "lucide-react";

function Stat({ label, value, sub, tone, icon }: {
  label: string; value: string | number; sub?: string;
  tone?: "ok" | "warn" | "bad" | "neutral";
  icon: React.ReactNode;
}) {
  const toneClass = {
    ok: "text-success",
    warn: "text-warning",
    bad: "text-destructive",
    neutral: "text-primary",
  }[tone ?? "neutral"];
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
          <div className={`mt-2 text-2xl font-bold ${toneClass}`}>{value}</div>
          {sub && <div className="mt-1 text-xs text-muted-foreground">{sub}</div>}
        </div>
        <div className={`rounded-lg bg-muted p-2 ${toneClass}`}>{icon}</div>
      </div>
    </Card>
  );
}

export function Dashboard({ result }: { result: ReconcileResult }) {
  const t = result.totals;
  const barData = [
    { name: "Khớp", value: t.matchedCount, fill: "var(--success)" },
    { name: "Lệch", value: t.mismatchedCount, fill: "var(--warning)" },
    { name: "Chỉ có Thuế", value: result.onlyTax.length, fill: "var(--destructive)" },
    { name: "Chỉ có EB", value: result.onlyEB.length, fill: "var(--primary)" },
  ];
  const pieData = barData.filter((d) => d.value > 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="HĐ Thuế" value={t.taxCount} icon={<FileSpreadsheet className="h-5 w-5" />} tone="neutral" />
        <Stat label="HĐ EasyBooks" value={t.ebCount} icon={<FileSpreadsheet className="h-5 w-5" />} tone="neutral" />
        <Stat label="Khớp" value={t.matchedCount} icon={<CheckCircle2 className="h-5 w-5" />} tone="ok" />
        <Stat label="Lệch" value={t.mismatchedCount} icon={<AlertTriangle className="h-5 w-5" />} tone="warn" />
        <Stat label="Thiếu" value={t.missingCount} icon={<FileX className="h-5 w-5" />} tone="bad"
          sub={`Thuế: ${result.onlyTax.length} · EB: ${result.onlyEB.length}`} />
        <Stat label="Lệch tiền hàng" value={formatVND(t.deltaTienHang)} icon={<AlertTriangle className="h-5 w-5" />} tone={t.deltaTienHang ? "warn" : "ok"} sub="VND" />
        <Stat label="Lệch thuế GTGT" value={formatVND(t.deltaThueGTGT)} icon={<AlertTriangle className="h-5 w-5" />} tone={t.deltaThueGTGT ? "warn" : "ok"} sub="VND" />
        <Stat label="Lệch tổng tiền" value={formatVND(t.deltaTongTien)} icon={<AlertTriangle className="h-5 w-5" />} tone={t.deltaTongTien ? "bad" : "ok"} sub="VND" />
        <Stat
          label="Tổng tiền thiếu trên phần mềm"
          value={formatVND(t.missingOnEBAmount)}
          icon={<FileX className="h-5 w-5" />}
          tone={t.missingOnEBAmount ? "bad" : "ok"}
          sub={`${result.onlyTax.length} HĐ chỉ có trên Thuế`}
        />
        <Stat
          label="Tổng tiền thiếu trên Thuế"
          value={formatVND(t.missingOnTaxAmount)}
          icon={<FileX className="h-5 w-5" />}
          tone={t.missingOnTaxAmount ? "bad" : "ok"}
          sub={`${result.onlyEB.length} HĐ chỉ có trên phần mềm`}
        />
        <Stat
          label="HĐ hạch toán 2 lần"
          value={t.duplicateEBCount}
          icon={<Copy className="h-5 w-5" />}
          tone={t.duplicateEBCount ? "bad" : "ok"}
          sub={`${result.duplicatesEB.length} số HĐ bị lặp trên phần mềm`}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-4">
          <h3 className="mb-3 text-sm font-semibold">Phân loại kết quả đối chiếu</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData}>
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="value" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card className="p-4">
          <h3 className="mb-3 text-sm font-semibold">Tỉ trọng</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={2}>
                  {pieData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                </Pie>
                <Legend />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
}