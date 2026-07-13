import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Moon, Sun, Download, Play, Store, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast, Toaster } from "sonner";
import { FileDropzone } from "@/components/FileDropzone";
import { ColumnMapper } from "@/components/ColumnMapper";
import { Dashboard } from "@/components/Dashboard";
import { ResultsView } from "@/components/ResultsView";
import { supabase } from "@/integrations/supabase/client";
import {
  autoMapHouseholdEB, autoMapHouseholdTax, buildInvoices, exportReport,
  parseWorkbook, pickBestSheet, reconcileHousehold,
  type CanonicalField, type ReconcileResult, type SheetParseResult,
} from "@/lib/reconcile";

export const Route = createFileRoute("/_authenticated/ho-kinh-doanh")({
  head: () => ({
    meta: [
      { title: "Đối Chiếu Hộ Kinh Doanh — TaxReconcile" },
      { name: "description", content: "Đối chiếu hóa đơn hộ kinh doanh: Doanh số bán chưa có thuế (Thuế) so với Tổng tiền thanh toán (phần mềm)." },
    ],
  }),
  component: HouseholdPage,
});

interface SourceState {
  file: File | null;
  sheets: SheetParseResult[];
  selectedSheet: string;
  mapping: Partial<Record<CanonicalField, string>>;
}
const empty: SourceState = { file: null, sheets: [], selectedSheet: "", mapping: {} };

function HouseholdPage() {
  const router = useRouter();
  const [dark, setDark] = useState(false);
  const [email, setEmail] = useState<string>("");
  const [tax, setTax] = useState<SourceState>(empty);
  const [eb, setEB] = useState<SourceState>(empty);
  const [result, setResult] = useState<ReconcileResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [resultLabel, setResultLabel] = useState("");

  useEffect(() => { document.documentElement.classList.toggle("dark", dark); }, [dark]);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? ""));
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    router.navigate({ to: "/auth", replace: true });
  }

  async function handleFile(which: "tax" | "eb", f: File | null) {
    if (!f) { (which === "tax" ? setTax : setEB)(empty); return; }
    try {
      const sheets = await parseWorkbook(f);
      if (!sheets.length) throw new Error("File rỗng");
      const best = pickBestSheet(sheets);
      const mapper = which === "tax" ? autoMapHouseholdTax : autoMapHouseholdEB;
      const state: SourceState = {
        file: f, sheets, selectedSheet: best.sheetName,
        mapping: mapper(best.headers),
      };
      (which === "tax" ? setTax : setEB)(state);
      toast.success(`Đã nạp ${f.name} · sheet "${best.sheetName}" · ${best.rows.length} dòng`);
    } catch (e) {
      toast.error("Không đọc được file: " + (e as Error).message);
    }
  }

  function changeSheet(which: "tax" | "eb", sheetName: string) {
    const s = which === "tax" ? tax : eb;
    const sheet = s.sheets.find((x) => x.sheetName === sheetName);
    if (!sheet) return;
    const mapper = which === "tax" ? autoMapHouseholdTax : autoMapHouseholdEB;
    const next = { ...s, selectedSheet: sheetName, mapping: mapper(sheet.headers) };
    (which === "tax" ? setTax : setEB)(next);
  }

  const taxSheet = useMemo(() => tax.sheets.find((s) => s.sheetName === tax.selectedSheet), [tax]);
  const ebSheet = useMemo(() => eb.sheets.find((s) => s.sheetName === eb.selectedSheet), [eb]);
  const canRun = !!taxSheet && !!ebSheet && !!tax.mapping.soHoaDon && !!eb.mapping.soHoaDon
    && !!tax.mapping.tongTien && !!eb.mapping.tongTien;

  function runReconcile() {
    if (!taxSheet || !ebSheet) return;
    setBusy(true);
    const t0 = performance.now();
    setTimeout(async () => {
      try {
        const taxInv = buildInvoices(taxSheet.rows, tax.mapping);
        const ebInv = buildInvoices(ebSheet.rows, eb.mapping);
        const res = reconcileHousehold(taxInv, ebInv);
        setResult(res);
        setResultLabel(`${tax.file?.name ?? "Thuế"} ↔ ${eb.file?.name ?? "Phần mềm"} (HKD)`);
        const ms = (performance.now() - t0).toFixed(0);
        toast.success(`Đối chiếu xong ${taxInv.length + ebInv.length} hóa đơn trong ${ms}ms`);
        const { data: u } = await supabase.auth.getUser();
        if (u.user) {
          const totalDiff = Math.abs(res.totals.deltaTongTien);
          const { error } = await supabase.from("reconciliations").insert({
            user_id: u.user.id,
            tax_file_name: (tax.file?.name ?? null) && `[HKD] ${tax.file!.name}`,
            eb_file_name: eb.file?.name ?? null,
            matched_count: res.totals.matchedCount,
            mismatched_count: res.totals.mismatchedCount,
            only_tax_count: res.onlyTax.length,
            only_eb_count: res.onlyEB.length,
            total_diff: totalDiff,
            result: JSON.parse(JSON.stringify(res)),
          });
          if (error) toast.error("Lưu lịch sử lỗi: " + error.message);
        }
      } catch (e) {
        toast.error("Lỗi đối chiếu: " + (e as Error).message);
      } finally { setBusy(false); }
    }, 30);
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Toaster richColors position="top-right" />
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent text-accent-foreground">
              <Store className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-base font-bold leading-tight">Đối chiếu Hóa Đơn — Hộ Kinh Doanh</h1>
              <p className="text-xs text-muted-foreground">
                So sánh Doanh số bán chưa có thuế (Thuế) ↔ Tổng tiền thanh toán (phần mềm).
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {email && <span className="hidden text-xs text-muted-foreground sm:inline">{email}</span>}
            <Link to="/" className="hidden text-xs text-primary hover:underline sm:inline">
              ← Đối chiếu doanh nghiệp (GTGT)
            </Link>
            {result && (
              <Button onClick={() => exportReport(result)} variant="default" size="sm">
                <Download className="mr-2 h-4 w-4" /> Xuất Excel
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={() => setDark((d) => !d)}>
              {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" size="icon" onClick={signOut} title="Đăng xuất">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6">
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Badge variant="secondary">Bước 1</Badge>
            <h2 className="text-lg font-semibold">Tải lên hai nguồn dữ liệu (Hộ kinh doanh)</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <FileDropzone
              label="Dữ liệu từ Cơ quan Thuế (HKD)"
              hint="Bảng kê hóa đơn HKD — cột đối chiếu: Doanh số bán chưa có thuế"
              accent="primary"
              file={tax.file}
              onFile={(f) => handleFile("tax", f)}
            />
            <FileDropzone
              label="Dữ liệu từ phần mềm bán hàng / hóa đơn"
              hint="File xuất từ phần mềm — cột đối chiếu: Tổng tiền thanh toán (đã trừ giảm trừ)"
              accent="accent"
              file={eb.file}
              onFile={(f) => handleFile("eb", f)}
            />
          </div>
        </section>

        {(tax.sheets.length > 0 || eb.sheets.length > 0) && (
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant="secondary">Bước 2</Badge>
              <h2 className="text-lg font-semibold">Chọn sheet và ánh xạ cột</h2>
              <span className="text-xs text-muted-foreground">
                Với HKD chỉ cần: Số hóa đơn, MST/Tên KH, Ngày, và cột số tiền để đối chiếu.
              </span>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {tax.sheets.length > 0 && taxSheet && (
                <div className="space-y-3">
                  <SheetPicker label="Sheet Thuế" current={tax.selectedSheet} sheets={tax.sheets}
                    onChange={(s) => changeSheet("tax", s)} />
                  <ColumnMapper title='Ánh xạ cột — Thuế (Tổng tiền = "Doanh số bán chưa có thuế")'
                    headers={taxSheet.headers}
                    mapping={tax.mapping}
                    onChange={(m) => setTax({ ...tax, mapping: m })} />
                </div>
              )}
              {eb.sheets.length > 0 && ebSheet && (
                <div className="space-y-3">
                  <SheetPicker label="Sheet phần mềm" current={eb.selectedSheet} sheets={eb.sheets}
                    onChange={(s) => changeSheet("eb", s)} />
                  <ColumnMapper title='Ánh xạ cột — Phần mềm (Tổng tiền = "Tổng tiền thanh toán")'
                    headers={ebSheet.headers}
                    mapping={eb.mapping}
                    onChange={(m) => setEB({ ...eb, mapping: m })} />
                </div>
              )}
            </div>
            <div className="flex items-center justify-end gap-3">
              {!canRun && (
                <span className="text-xs text-muted-foreground">
                  Cần ánh xạ “Số hóa đơn” và “Tổng thanh toán” ở cả hai nguồn.
                </span>
              )}
              <Button size="lg" disabled={!canRun || busy} onClick={runReconcile}>
                <Play className="mr-2 h-4 w-4" />
                {busy ? "Đang đối chiếu…" : "Đối chiếu ngay"}
              </Button>
            </div>
          </section>
        )}

        {result && (
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant="secondary">Bước 3</Badge>
              <h2 className="text-lg font-semibold">Kết quả đối chiếu (HKD)</h2>
              {resultLabel && <span className="ml-2 text-xs text-muted-foreground">{resultLabel}</span>}
            </div>
            <Dashboard result={result} />
            <Card className="p-4">
              <ResultsView result={result} />
            </Card>
          </section>
        )}
      </main>
    </div>
  );
}

function SheetPicker({
  label, current, sheets, onChange,
}: { label: string; current: string; sheets: SheetParseResult[]; onChange: (s: string) => void }) {
  if (sheets.length <= 1) {
    const s = sheets[0];
    return (
      <div className="rounded-lg border bg-card px-3 py-2 text-xs text-muted-foreground">
        {label}: <span className="font-medium text-foreground">{s?.sheetName}</span> · {s?.rows.length ?? 0} dòng
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2">
      <span className="text-xs text-muted-foreground">{label}:</span>
      <select className="bg-transparent text-sm font-medium outline-none"
        value={current} onChange={(e) => onChange(e.target.value)}>
        {sheets.map((s) => (
          <option key={s.sheetName} value={s.sheetName}>{s.sheetName} ({s.rows.length})</option>
        ))}
      </select>
    </div>
  );
}