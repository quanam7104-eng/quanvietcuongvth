import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Download, Play } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileDropzone } from "@/components/FileDropzone";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { formatVND } from "@/lib/reconcile";
import {
  dayEq, exportBankReport, parseBankBook, parseBankStatement, reconcileBank,
  type BankResult,
} from "@/lib/bank";

export const Route = createFileRoute("/_authenticated/sao-ke-ngan-hang")({
  head: () => ({
    meta: [
      { title: "Đối chiếu Sao kê Ngân hàng — TaxReconcile" },
      { name: "description", content: "Đối chiếu sao kê ngân hàng với sổ tiền gửi: gộp phiếu, tổng thu chi theo từng ngày." },
      { property: "og:title", content: "Đối chiếu Sao kê Ngân hàng — TaxReconcile" },
      { property: "og:description", content: "Đối chiếu sao kê ngân hàng với sổ tiền gửi theo từng ngày." },
    ],
  }),
  component: BankPage,
});

type Tab = "daily" | "matched" | "book" | "bank";

function BankPage() {
  const router = useRouter();
  const [dark, setDark] = useState(false);
  const [email, setEmail] = useState("");
  const [bankFile, setBankFile] = useState<File | null>(null);
  const [bookFile, setBookFile] = useState<File | null>(null);
  const [result, setResult] = useState<BankResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<Tab>("daily");
  const [onlyDiff, setOnlyDiff] = useState(false);

  useEffect(() => { document.documentElement.classList.toggle("dark", dark); }, [dark]);
  useEffect(() => { supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? "")); }, []);

  async function run() {
    if (!bankFile || !bookFile) return;
    setBusy(true);
    try {
      const [bank, book] = await Promise.all([parseBankStatement(bankFile), parseBankBook(bookFile)]);
      const r = reconcileBank(book, bank);
      setResult(r);
      toast.success(`Đã đối chiếu ${book.length} phiếu sổ với ${bank.length} dòng sao kê`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally { setBusy(false); }
  }

  const days = result ? result.daily.filter((d) => !onlyDiff || !dayEq(d.bookThu, d.bankThu) || !dayEq(d.bookChi, d.bankChi)) : [];
  const diffCls = (a: number, b: number) => (dayEq(a, b) ? "" : "text-destructive font-semibold");

  return (
    <AppShell
      email={email}
      dark={dark}
      onToggleDark={() => setDark((d) => !d)}
      onSignOut={async () => { await supabase.auth.signOut(); router.navigate({ to: "/auth", replace: true }); }}
      actions={result && (
        <Button size="sm" onClick={() => exportBankReport(result)}><Download className="mr-2 h-4 w-4" /> Xuất Excel</Button>
      )}
    >
      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6">
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Badge variant="secondary">Bước 1</Badge>
            <h2 className="text-lg font-semibold">Tải lên sao kê ngân hàng và sổ tiền gửi</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <FileDropzone label="Sao kê ngân hàng" hint="File sao kê tải từ ngân hàng (cột Ghi nợ / Ghi có)"
              accent="primary" file={bankFile} onFile={(f) => { setBankFile(f); setResult(null); }} />
            <FileDropzone label="Sổ tiền gửi ngân hàng (phần mềm)" hint="Sổ S08-DN xuất từ phần mềm kế toán (cột Số chứng từ, Thu, Chi)"
              accent="accent" file={bookFile} onFile={(f) => { setBookFile(f); setResult(null); }} />
          </div>
          <div className="flex items-center justify-end gap-3">
            <span className="text-xs text-muted-foreground">Phiếu gộp (vd. trả lương) được khớp với nhiều dòng sao kê cùng ngày.</span>
            <Button size="lg" disabled={!bankFile || !bookFile || busy} onClick={run}>
              <Play className="mr-2 h-4 w-4" />{busy ? "Đang đối chiếu…" : "Đối chiếu ngay"}
            </Button>
          </div>
        </section>

        {result && (
          <section className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Stat label="Tổng thu (Sổ / Sao kê)" a={result.totals.bookThu} b={result.totals.bankThu} />
              <Stat label="Tổng chi (Sổ / Sao kê)" a={result.totals.bookChi} b={result.totals.bankChi} />
              <Card className="p-4"><div className="text-xs text-muted-foreground">Phiếu đã khớp</div>
                <div className="text-2xl font-bold">{result.matches.length}</div>
                <div className="text-xs text-muted-foreground">{result.matches.filter((m) => m.kind === "gop").length} phiếu gộp nhiều dòng</div></Card>
              <Card className="p-4"><div className="text-xs text-muted-foreground">Chưa khớp</div>
                <div className="text-2xl font-bold text-destructive">{result.onlyBook.length + result.onlyBank.length}</div>
                <div className="text-xs text-muted-foreground">Sổ: {result.onlyBook.length} · Sao kê: {result.onlyBank.length}</div></Card>
            </div>

            <div className="flex flex-wrap gap-2">
              {([["daily", "Tổng thu chi theo ngày"], ["matched", `Đã khớp (${result.matches.length})`],
                ["book", `Chỉ có trên sổ (${result.onlyBook.length})`], ["bank", `Chỉ có trên sao kê (${result.onlyBank.length})`]] as [Tab, string][])
                .map(([k, l]) => (
                  <Button key={k} size="sm" variant={tab === k ? "default" : "outline"} onClick={() => setTab(k)}>{l}</Button>
                ))}
            </div>

            <Card className="overflow-x-auto p-0">
              {tab === "daily" && (
                <>
                  <label className="flex items-center gap-2 px-4 pt-3 text-sm">
                    <input type="checkbox" checked={onlyDiff} onChange={(e) => setOnlyDiff(e.target.checked)} /> Chỉ hiện ngày bị lệch
                  </label>
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 text-left"><tr>
                      <th className="p-2">Ngày</th><th className="p-2 text-right">Thu - Sổ</th><th className="p-2 text-right">Thu - Sao kê</th>
                      <th className="p-2 text-right">Chi - Sổ</th><th className="p-2 text-right">Chi - Sao kê</th><th className="p-2">Kết quả</th>
                    </tr></thead>
                    <tbody>{days.map((d) => {
                      const ok = dayEq(d.bookThu, d.bankThu) && dayEq(d.bookChi, d.bankChi);
                      return (
                        <tr key={d.date} className="border-t">
                          <td className="p-2">{d.date}</td>
                          <td className={`p-2 text-right ${diffCls(d.bookThu, d.bankThu)}`}>{formatVND(d.bookThu)}</td>
                          <td className={`p-2 text-right ${diffCls(d.bookThu, d.bankThu)}`}>{formatVND(d.bankThu)}</td>
                          <td className={`p-2 text-right ${diffCls(d.bookChi, d.bankChi)}`}>{formatVND(d.bookChi)}</td>
                          <td className={`p-2 text-right ${diffCls(d.bookChi, d.bankChi)}`}>{formatVND(d.bankChi)}</td>
                          <td className="p-2">{ok ? <Badge variant="secondary">Khớp</Badge> : <Badge variant="destructive">Lệch</Badge>}</td>
                        </tr>
                      );
                    })}</tbody>
                  </table>
                </>
              )}
              {tab === "matched" && (
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-left"><tr>
                    <th className="p-2">Ngày</th><th className="p-2">Số CT</th><th className="p-2">Diễn giải</th>
                    <th className="p-2 text-right">Thu</th><th className="p-2 text-right">Chi</th><th className="p-2">Sao kê</th>
                  </tr></thead>
                  <tbody>{result.matches.map((m) => (
                    <tr key={m.voucher.id} className="border-t align-top">
                      <td className="p-2">{m.voucher.date}</td><td className="p-2 font-medium">{m.voucher.so}</td>
                      <td className="p-2">{m.voucher.desc}</td>
                      <td className="p-2 text-right">{m.voucher.thu ? formatVND(m.voucher.thu) : ""}</td>
                      <td className="p-2 text-right">{m.voucher.chi ? formatVND(m.voucher.chi) : ""}</td>
                      <td className="p-2 text-xs">
                        {m.kind === "gop" ? <Badge variant="outline">Gộp {m.lines.length} dòng</Badge>
                          : m.kind === "lech-ngay" ? <Badge variant="outline">Lệch ngày ({m.lines[0].date})</Badge>
                          : <Badge variant="secondary">Khớp</Badge>}
                      </td>
                    </tr>
                  ))}</tbody>
                </table>
              )}
              {tab === "book" && (
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-left"><tr>
                    <th className="p-2">Ngày</th><th className="p-2">Số CT</th><th className="p-2">Diễn giải</th>
                    <th className="p-2 text-right">Thu</th><th className="p-2 text-right">Chi</th>
                  </tr></thead>
                  <tbody>{result.onlyBook.map((v) => (
                    <tr key={v.id} className="border-t">
                      <td className="p-2">{v.date}</td><td className="p-2 font-medium">{v.so}</td><td className="p-2">{v.desc}</td>
                      <td className="p-2 text-right">{v.thu ? formatVND(v.thu) : ""}</td><td className="p-2 text-right">{v.chi ? formatVND(v.chi) : ""}</td>
                    </tr>
                  ))}</tbody>
                </table>
              )}
              {tab === "bank" && (
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-left"><tr>
                    <th className="p-2">Ngày</th><th className="p-2">Số GD</th><th className="p-2">Nội dung</th>
                    <th className="p-2 text-right">Ghi có (Thu)</th><th className="p-2 text-right">Ghi nợ (Chi)</th>
                  </tr></thead>
                  <tbody>{result.onlyBank.map((b) => (
                    <tr key={b.id} className="border-t">
                      <td className="p-2">{b.date}</td><td className="p-2">{b.ref}</td><td className="p-2">{b.desc}</td>
                      <td className="p-2 text-right">{b.thu ? formatVND(b.thu) : ""}</td><td className="p-2 text-right">{b.chi ? formatVND(b.chi) : ""}</td>
                    </tr>
                  ))}</tbody>
                </table>
              )}
            </Card>
          </section>
        )}
      </main>
    </AppShell>
  );
}

function Stat({ label, a, b }: { label: string; a: number; b: number }) {
  const ok = dayEq(a, b);
  return (
    <Card className="p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-sm font-semibold">{formatVND(a)}</div>
      <div className="text-sm font-semibold">{formatVND(b)}</div>
      <div className={`text-xs ${ok ? "text-muted-foreground" : "text-destructive"}`}>{ok ? "Khớp" : `Lệch ${formatVND(a - b)}`}</div>
    </Card>
  );
}
