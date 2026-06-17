import * as XLSX from "xlsx";

export type CanonicalField =
  | "soHoaDon"
  | "kyHieu"
  | "mauSo"
  | "ngay"
  | "mst"
  | "tenKH"
  | "tienHang"
  | "thueGTGT"
  | "tongTien"
  | "thueSuat"
  | "loai"
  | "trangThai";

export const FIELD_LABELS: Record<CanonicalField, string> = {
  soHoaDon: "Số hóa đơn",
  kyHieu: "Ký hiệu",
  mauSo: "Mẫu số",
  ngay: "Ngày hóa đơn",
  mst: "Mã số thuế",
  tenKH: "Tên khách hàng",
  tienHang: "Tiền hàng trước thuế",
  thueGTGT: "Thuế GTGT",
  tongTien: "Tổng thanh toán",
  thueSuat: "Thuế suất",
  loai: "Loại hóa đơn",
  trangThai: "Trạng thái",
};

// Keyword patterns for auto-mapping. Vietnamese accented + unaccented.
const FIELD_PATTERNS: Record<CanonicalField, RegExp[]> = {
  soHoaDon: [/so\s*hoa\s*don/i, /so\s*hd\b/i, /^so$/i, /invoice\s*no/i],
  kyHieu: [/ky\s*hieu/i, /serial/i],
  mauSo: [/mau\s*so/i, /form/i],
  ngay: [/ngay/i, /date/i],
  mst: [/ma\s*so\s*thue/i, /\bmst\b/i, /tax\s*code/i],
  tenKH: [/ten\s*(nguoi|khach|don\s*vi|nguoi\s*mua|nguoi\s*ban)/i, /customer/i, /buyer/i, /seller/i],
  tienHang: [/doanh\s*thu/i, /tien\s*hang/i, /thanh\s*tien/i, /chua\s*(co\s*)?thue/i, /amount/i, /^subtotal/i],
  thueGTGT: [/thue\s*gtgt/i, /tien\s*thue/i, /\bvat\b/i],
  tongTien: [/tong\s*(tien|cong|thanh\s*toan)/i, /total/i],
  thueSuat: [/thue\s*suat/i, /tax\s*rate/i, /\bts\b/i],
  loai: [/loai\s*hoa\s*don/i, /loai\s*hd/i, /type/i],
  trangThai: [/trang\s*thai/i, /status/i, /ket\s*qua/i],
};

function removeDiacritics(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D");
}

export type RawRow = Record<string, unknown>;

export interface SheetParseResult {
  sheetName: string;
  headers: string[];
  rows: RawRow[];
  headerRowIndex: number;
}

/** Find the header row by scanning for a row with many string cells matching known patterns. */
function detectHeaderRow(matrix: unknown[][]): number {
  let bestIdx = 0;
  let bestScore = 0;
  const limit = Math.min(matrix.length, 30);
  for (let i = 0; i < limit; i++) {
    const row = matrix[i] || [];
    let score = 0;
    for (const cell of row) {
      if (typeof cell !== "string") continue;
      const norm = removeDiacritics(cell.trim());
      if (!norm) continue;
      for (const pats of Object.values(FIELD_PATTERNS)) {
        if (pats.some((p) => p.test(norm))) {
          score++;
          break;
        }
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestIdx = i;
    }
  }
  return bestScore >= 3 ? bestIdx : 0;
}

export async function parseWorkbook(file: File): Promise<SheetParseResult[]> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array", cellDates: true });
  const results: SheetParseResult[] = [];
  for (const name of wb.SheetNames) {
    const ws = wb.Sheets[name];
    const matrix: unknown[][] = XLSX.utils.sheet_to_json(ws, {
      header: 1,
      raw: false,
      defval: "",
      blankrows: false,
    });
    if (!matrix.length) continue;
    const headerIdx = detectHeaderRow(matrix);
    const headerRow = (matrix[headerIdx] || []).map((c, i) =>
      String(c ?? "").trim() || `Cột ${i + 1}`,
    );
    // Detect a sub-header row (merged headers like Thuế file) and merge labels
    const next = matrix[headerIdx + 1];
    let dataStart = headerIdx + 1;
    if (Array.isArray(next)) {
      const looksLikeSub = next.some(
        (c) => typeof c === "string" && /hd|hoa\s*don|ngay|mau|ky|so/i.test(removeDiacritics(c)),
      );
      if (looksLikeSub) {
        for (let i = 0; i < next.length; i++) {
          const sub = String(next[i] ?? "").trim();
          if (sub && (!headerRow[i] || /^Cột/.test(headerRow[i]))) headerRow[i] = sub;
        }
        dataStart = headerIdx + 2;
      }
    }
    const rows: RawRow[] = [];
    for (let r = dataStart; r < matrix.length; r++) {
      const row = matrix[r] || [];
      const obj: RawRow = {};
      let hasVal = false;
      for (let c = 0; c < headerRow.length; c++) {
        const v = row[c];
        obj[headerRow[c]] = v ?? "";
        if (v !== undefined && v !== null && String(v).trim() !== "") hasVal = true;
      }
      if (hasVal) rows.push(obj);
    }
    results.push({ sheetName: name, headers: headerRow, rows, headerRowIndex: headerIdx });
  }
  return results;
}

/** Auto-suggest a mapping from headers -> canonical field. */
export function autoMap(headers: string[]): Partial<Record<CanonicalField, string>> {
  const map: Partial<Record<CanonicalField, string>> = {};
  for (const field of Object.keys(FIELD_PATTERNS) as CanonicalField[]) {
    const pats = FIELD_PATTERNS[field];
    for (const h of headers) {
      const norm = removeDiacritics(h);
      if (pats.some((p) => p.test(norm))) {
        if (!map[field]) map[field] = h;
        break;
      }
    }
  }
  return map;
}

/** Pick the most data-rich sheet (most rows with mappable invoice columns). */
export function pickBestSheet(sheets: SheetParseResult[]): SheetParseResult {
  let best = sheets[0];
  let bestScore = -1;
  for (const s of sheets) {
    const m = autoMap(s.headers);
    const score = Object.keys(m).length * 1000 + s.rows.length;
    if (score > bestScore) {
      bestScore = score;
      best = s;
    }
  }
  return best;
}

export interface Invoice {
  soHoaDon: string;
  kyHieu: string;
  mauSo: string;
  ngay: string;
  mst: string;
  tenKH: string;
  tienHang: number;
  thueGTGT: number;
  tongTien: number;
  thueSuat: string;
  loai: string;
  trangThai: string;
  _key: string;
  _raw: RawRow;
}

function toNum(v: unknown): number {
  if (v === null || v === undefined || v === "") return 0;
  if (typeof v === "number") return v;
  let s = String(v).trim();
  if (!s) return 0;
  // Vietnamese: "1.234.567,89" or "1,234,567.89"
  const hasComma = s.includes(",");
  const hasDot = s.includes(".");
  if (hasComma && hasDot) {
    if (s.lastIndexOf(",") > s.lastIndexOf(".")) {
      s = s.replace(/\./g, "").replace(",", ".");
    } else {
      s = s.replace(/,/g, "");
    }
  } else if (hasComma) {
    // assume thousand sep unless trailing decimals
    const parts = s.split(",");
    if (parts.length === 2 && parts[1].length <= 2) s = parts.join(".");
    else s = s.replace(/,/g, "");
  } else {
    // dot-only: if appears as thousand-sep (multiple groups), strip
    const dots = s.split(".");
    if (dots.length > 2) s = s.replace(/\./g, "");
  }
  const n = parseFloat(s.replace(/[^\d.\-]/g, ""));
  return isNaN(n) ? 0 : n;
}

function toStr(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (v instanceof Date) {
    const d = v;
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    return `${dd}/${mm}/${d.getFullYear()}`;
  }
  return String(v).trim();
}

function normalizeDate(v: unknown): string {
  const s = toStr(v);
  if (!s) return "";
  // dd/mm/yyyy or yyyy-mm-dd
  const m1 = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/);
  if (m1) {
    const dd = m1[1].padStart(2, "0");
    const mm = m1[2].padStart(2, "0");
    let yy = m1[3];
    if (yy.length === 2) yy = "20" + yy;
    return `${dd}/${mm}/${yy}`;
  }
  const m2 = s.match(/^(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})/);
  if (m2) return `${m2[3].padStart(2, "0")}/${m2[2].padStart(2, "0")}/${m2[1]}`;
  return s;
}

function normInvoiceNumber(v: unknown): string {
  const s = toStr(v).replace(/\s+/g, "");
  return s.replace(/^0+/, "") || s;
}

export function buildInvoices(
  rows: RawRow[],
  mapping: Partial<Record<CanonicalField, string>>,
): Invoice[] {
  const list: Invoice[] = [];
  for (const r of rows) {
    const get = (f: CanonicalField) => (mapping[f] ? r[mapping[f]!] : "");
    const soHoaDon = normInvoiceNumber(get("soHoaDon"));
    if (!soHoaDon) continue;
    const kyHieu = toStr(get("kyHieu"));
    const mst = toStr(get("mst"));
    const inv: Invoice = {
      soHoaDon,
      kyHieu,
      mauSo: toStr(get("mauSo")),
      ngay: normalizeDate(get("ngay")),
      mst,
      tenKH: toStr(get("tenKH")),
      tienHang: toNum(get("tienHang")),
      thueGTGT: toNum(get("thueGTGT")),
      tongTien: toNum(get("tongTien")),
      thueSuat: toStr(get("thueSuat")),
      loai: toStr(get("loai")),
      trangThai: toStr(get("trangThai")),
      _key: `${kyHieu}|${soHoaDon}|${mst}`.toUpperCase(),
      _raw: r,
    };
    if (!inv.tongTien && (inv.tienHang || inv.thueGTGT)) {
      inv.tongTien = inv.tienHang + inv.thueGTGT;
    }
    list.push(inv);
  }
  return list;
}

export type DiffField = "tienHang" | "thueGTGT" | "tongTien" | "ngay" | "mst" | "tenKH" | "kyHieu";

export interface MatchedPair {
  tax: Invoice;
  eb: Invoice;
  diffs: { field: DiffField; tax: string | number; eb: string | number; delta?: number }[];
}

export interface ReconcileResult {
  matched: MatchedPair[]; // exact match (no diffs)
  mismatched: MatchedPair[]; // matched but with differences
  onlyTax: Invoice[];
  onlyEB: Invoice[];
  totals: {
    taxCount: number;
    ebCount: number;
    matchedCount: number;
    mismatchedCount: number;
    missingCount: number;
    deltaTienHang: number;
    deltaThueGTGT: number;
    deltaTongTien: number;
  };
}

const MONEY_EPS = 1; // tolerance 1 đồng

function moneyEq(a: number, b: number) {
  return Math.abs((a || 0) - (b || 0)) <= MONEY_EPS;
}

export function reconcile(taxList: Invoice[], ebList: Invoice[]): ReconcileResult {
  // Build a multi-key index for EB: try ky+so+mst, then so+mst, then just so
  const idxFull = new Map<string, Invoice[]>();
  const idxSoMst = new Map<string, Invoice[]>();
  const idxSo = new Map<string, Invoice[]>();
  for (const e of ebList) {
    const k1 = e._key;
    const k2 = `${e.soHoaDon}|${e.mst}`.toUpperCase();
    const k3 = e.soHoaDon.toUpperCase();
    (idxFull.get(k1) ?? idxFull.set(k1, []).get(k1)!).push(e);
    (idxSoMst.get(k2) ?? idxSoMst.set(k2, []).get(k2)!).push(e);
    (idxSo.get(k3) ?? idxSo.set(k3, []).get(k3)!).push(e);
  }

  const matched: MatchedPair[] = [];
  const mismatched: MatchedPair[] = [];
  const onlyTax: Invoice[] = [];
  const usedEB = new Set<Invoice>();

  for (const t of taxList) {
    const k1 = t._key;
    const k2 = `${t.soHoaDon}|${t.mst}`.toUpperCase();
    const k3 = t.soHoaDon.toUpperCase();
    let cand: Invoice | undefined;
    for (const list of [idxFull.get(k1), idxSoMst.get(k2), idxSo.get(k3)]) {
      if (!list) continue;
      cand = list.find((e) => !usedEB.has(e));
      if (cand) break;
    }
    if (!cand) {
      onlyTax.push(t);
      continue;
    }
    usedEB.add(cand);
    const diffs: MatchedPair["diffs"] = [];
    if (!moneyEq(t.tienHang, cand.tienHang))
      diffs.push({ field: "tienHang", tax: t.tienHang, eb: cand.tienHang, delta: t.tienHang - cand.tienHang });
    if (!moneyEq(t.thueGTGT, cand.thueGTGT))
      diffs.push({ field: "thueGTGT", tax: t.thueGTGT, eb: cand.thueGTGT, delta: t.thueGTGT - cand.thueGTGT });
    if (!moneyEq(t.tongTien, cand.tongTien))
      diffs.push({ field: "tongTien", tax: t.tongTien, eb: cand.tongTien, delta: t.tongTien - cand.tongTien });
    if (t.ngay && cand.ngay && t.ngay !== cand.ngay)
      diffs.push({ field: "ngay", tax: t.ngay, eb: cand.ngay });
    if (t.mst && cand.mst && t.mst !== cand.mst)
      diffs.push({ field: "mst", tax: t.mst, eb: cand.mst });
    if (t.kyHieu && cand.kyHieu && t.kyHieu.toUpperCase() !== cand.kyHieu.toUpperCase())
      diffs.push({ field: "kyHieu", tax: t.kyHieu, eb: cand.kyHieu });
    if (diffs.length === 0) matched.push({ tax: t, eb: cand, diffs });
    else mismatched.push({ tax: t, eb: cand, diffs });
  }

  const onlyEB = ebList.filter((e) => !usedEB.has(e));

  const totals = {
    taxCount: taxList.length,
    ebCount: ebList.length,
    matchedCount: matched.length,
    mismatchedCount: mismatched.length,
    missingCount: onlyTax.length + onlyEB.length,
    deltaTienHang: mismatched.reduce((s, m) => s + (m.tax.tienHang - m.eb.tienHang), 0),
    deltaThueGTGT: mismatched.reduce((s, m) => s + (m.tax.thueGTGT - m.eb.thueGTGT), 0),
    deltaTongTien: mismatched.reduce((s, m) => s + (m.tax.tongTien - m.eb.tongTien), 0),
  };

  return { matched, mismatched, onlyTax, onlyEB, totals };
}

export function formatVND(n: number): string {
  return new Intl.NumberFormat("vi-VN").format(Math.round(n));
}

export function exportReport(result: ReconcileResult): void {
  const wb = XLSX.utils.book_new();

  const matchedRows = result.matched.map((m) => ({
    "Số hóa đơn": m.tax.soHoaDon,
    "Ký hiệu": m.tax.kyHieu,
    MST: m.tax.mst,
    "Tên KH": m.tax.tenKH,
    "Ngày HĐ": m.tax.ngay,
    "Tiền hàng": m.tax.tienHang,
    "Thuế GTGT": m.tax.thueGTGT,
    "Tổng tiền": m.tax.tongTien,
    "Trạng thái": "KHỚP",
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(matchedRows), "1. Khớp");

  const misRows = result.mismatched.flatMap((m) =>
    m.diffs.map((d) => ({
      "Số hóa đơn": m.tax.soHoaDon,
      "Ký hiệu": m.tax.kyHieu,
      MST: m.tax.mst,
      "Ngày HĐ": m.tax.ngay,
      "Chỉ tiêu lệch": FIELD_LABELS[d.field as CanonicalField] ?? d.field,
      "Giá trị Thuế": d.tax,
      "Giá trị EasyBooks": d.eb,
      "Chênh lệch": d.delta ?? "",
    })),
  );
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(misRows), "2. Lệch");

  const onlyTaxRows = result.onlyTax.map((t) => ({
    "Số hóa đơn": t.soHoaDon,
    "Ký hiệu": t.kyHieu,
    MST: t.mst,
    "Tên KH": t.tenKH,
    "Ngày HĐ": t.ngay,
    "Tổng tiền": t.tongTien,
    "Trạng thái": "Không có trên EasyBooks",
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(onlyTaxRows), "3. Thiếu EasyBooks");

  const onlyEBRows = result.onlyEB.map((t) => ({
    "Số hóa đơn": t.soHoaDon,
    "Ký hiệu": t.kyHieu,
    MST: t.mst,
    "Tên KH": t.tenKH,
    "Ngày HĐ": t.ngay,
    "Tổng tiền": t.tongTien,
    "Trạng thái": "Không có trên dữ liệu Thuế",
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(onlyEBRows), "4. Thiếu trên Thuế");

  const summary = [
    { "Chỉ tiêu": "Tổng HĐ Thuế", "Giá trị": result.totals.taxCount },
    { "Chỉ tiêu": "Tổng HĐ EasyBooks", "Giá trị": result.totals.ebCount },
    { "Chỉ tiêu": "Số HĐ khớp", "Giá trị": result.totals.matchedCount },
    { "Chỉ tiêu": "Số HĐ lệch", "Giá trị": result.totals.mismatchedCount },
    { "Chỉ tiêu": "Số HĐ thiếu", "Giá trị": result.totals.missingCount },
    { "Chỉ tiêu": "Chênh lệch tiền hàng", "Giá trị": result.totals.deltaTienHang },
    { "Chỉ tiêu": "Chênh lệch thuế GTGT", "Giá trị": result.totals.deltaThueGTGT },
    { "Chỉ tiêu": "Chênh lệch tổng tiền", "Giá trị": result.totals.deltaTongTien },
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summary), "5. Tổng hợp");

  const ts = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
  XLSX.writeFile(wb, `BaoCao_DoiChieu_${ts}.xlsx`);
}