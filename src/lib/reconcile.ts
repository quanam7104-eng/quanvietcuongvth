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

// Scored patterns. Higher score = stronger evidence. Headers are normalized
// (lowercased, diacritics removed). We pick the highest-scoring header per
// field, and each header can only be assigned to one field.
const FIELD_RULES: Record<CanonicalField, { pattern: RegExp; score: number }[]> = {
  soHoaDon: [
    { pattern: /\bso\s*hoa\s*don\b/, score: 100 },
    { pattern: /\bso\s*hd\b/, score: 90 },
    { pattern: /invoice\s*(no|number)/, score: 80 },
    { pattern: /^so$/, score: 40 },
  ],
  kyHieu: [
    { pattern: /\bky\s*hieu(\s*hd)?\b/, score: 100 },
    { pattern: /\bserial\b/, score: 70 },
  ],
  mauSo: [
    { pattern: /\bmau\s*so(\s*hd)?\b/, score: 100 },
    { pattern: /\bform\b/, score: 60 },
  ],
  ngay: [
    { pattern: /\bngay(\s*hoa\s*don|\s*lap|\s*,?\s*thang)/, score: 100 },
    { pattern: /\bngay\b/, score: 70 },
    { pattern: /\bdate\b/, score: 60 },
  ],
  mst: [
    { pattern: /\bma\s*so\s*thue\b/, score: 100 },
    { pattern: /\bmst\b/, score: 90 },
    { pattern: /tax\s*code/, score: 70 },
  ],
  tenKH: [
    { pattern: /\bten\s*(nguoi\s*(mua|ban)|khach|don\s*vi|cong\s*ty)/, score: 100 },
    { pattern: /\bten\b/, score: 60 },
    { pattern: /\b(customer|buyer|seller)\b/, score: 70 },
  ],
  tienHang: [
    { pattern: /doanh\s*thu(\s*chua)?/, score: 100 },
    { pattern: /\btien\s*hang\b/, score: 100 },
    { pattern: /thanh\s*tien(\s*chua)?/, score: 90 },
    { pattern: /chua\s*(co\s*)?thue/, score: 80 },
    { pattern: /\bsubtotal\b/, score: 70 },
  ],
  thueGTGT: [
    // "Thuế GTGT" alone, NOT "Doanh thu chưa có thuế GTGT"
    { pattern: /^\s*(tien\s*)?thue\s*gtgt\s*$/, score: 100 },
    { pattern: /^\s*thue\s*gia\s*tri\s*gia\s*tang\s*$/, score: 100 },
    { pattern: /\btien\s*thue\b/, score: 80 },
    { pattern: /^\s*vat\s*$/, score: 70 },
  ],
  tongTien: [
    { pattern: /\btong\s*(tien\s*)?(cong\s*)?thanh\s*toan\b/, score: 100 },
    { pattern: /\btong\s*cong\b/, score: 90 },
    { pattern: /\btong\s*tien\b/, score: 90 },
    { pattern: /\btotal\b/, score: 70 },
  ],
  thueSuat: [
    { pattern: /thue\s*suat/, score: 100 },
    { pattern: /tax\s*rate/, score: 80 },
  ],
  loai: [
    { pattern: /loai\s*(hoa\s*don|hd)/, score: 100 },
    { pattern: /\btype\b/, score: 60 },
  ],
  trangThai: [
    { pattern: /trang\s*thai/, score: 100 },
    { pattern: /ket\s*qua/, score: 80 },
    { pattern: /\bstatus\b/, score: 70 },
  ],
};

// Backward-compat export used by header-row detection below.
const FIELD_PATTERNS: Record<CanonicalField, RegExp[]> = Object.fromEntries(
  (Object.keys(FIELD_RULES) as CanonicalField[]).map((k) => [
    k,
    FIELD_RULES[k].map((r) => r.pattern),
  ]),
) as Record<CanonicalField, RegExp[]>;

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
      const norm = removeDiacritics(cell.trim()).toLowerCase();
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
      // Treat the next row as a merged sub-header ONLY when it really looks
      // like a header band: every non-empty cell is short, contains no
      // digits / dates / currency, and at least one cell matches a header
      // keyword. Otherwise we'd swallow the first data row (e.g. a row whose
      // "Trạng thái" cell says "Hóa đơn mới").
      const nonEmpty = next.filter((c) => String(c ?? "").trim() !== "");
      const allShortText = nonEmpty.length > 0 && nonEmpty.every((c) => {
        const s = String(c ?? "").trim();
        if (s.length === 0 || s.length > 30) return false;
        if (/\d/.test(s)) return false; // digits → almost certainly data
        return true;
      });
      const hasHeaderKeyword = nonEmpty.some(
        (c) => typeof c === "string" &&
          /\b(so\s*hd|so\s*hoa\s*don|ky\s*hieu|mau\s*so|ngay)\b/.test(
            removeDiacritics(String(c)).toLowerCase(),
          ),
      );
      const looksLikeSub = allShortText && hasHeaderKeyword;
      if (looksLikeSub) {
        for (let i = 0; i < next.length; i++) {
          const sub = String(next[i] ?? "").trim();
          if (!sub) continue;
          const parent = headerRow[i] || "";
          // Overwrite when parent is empty/auto, OR when parent is a
          // group label (e.g. "Hóa đơn, chứng từ bán ra") that the
          // sub-row clearly refines.
          const parentIsGroup =
            /hoa\s*don|chung\s*tu/i.test(removeDiacritics(parent)) &&
            !/so\s*hoa\s*don|so\s*hd|ky\s*hieu|mau\s*so|ngay/i.test(removeDiacritics(parent));
          if (!parent || /^Cột/.test(parent) || parentIsGroup) headerRow[i] = sub;
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

/** Auto-suggest a mapping from headers -> canonical field using scored,
 *  unique assignment so each header maps to at most one field and each
 *  field picks its best-matching header. */
export function autoMap(headers: string[]): Partial<Record<CanonicalField, string>> {
  const fields = Object.keys(FIELD_RULES) as CanonicalField[];
  // candidates[field] = array of {header, score} sorted desc
  const candidates: { field: CanonicalField; header: string; score: number }[] = [];
  for (const f of fields) {
    for (const h of headers) {
      const norm = removeDiacritics(h).toLowerCase().trim();
      let best = 0;
      for (const r of FIELD_RULES[f]) {
        if (r.pattern.test(norm)) best = Math.max(best, r.score);
      }
      if (best > 0) candidates.push({ field: f, header: h, score: best });
    }
  }
  candidates.sort((a, b) => b.score - a.score);
  const map: Partial<Record<CanonicalField, string>> = {};
  const usedHeaders = new Set<string>();
  for (const c of candidates) {
    if (map[c.field]) continue;
    if (usedHeaders.has(c.header)) continue;
    map[c.field] = c.header;
    usedHeaders.add(c.header);
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
  _mstNorm: string;
  _kyHieuNorm: string;
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

/** Normalize MST for comparison: strip non-digits and leading zeros.
 *  EasyBooks exports MST as a number (loses leading zeros) while the Tax
 *  export keeps the original 10/13-digit string. */
function normMst(v: unknown): string {
  const s = toStr(v).replace(/[^\d]/g, "");
  return s.replace(/^0+/, "") || s;
}

/** Normalize Ký hiệu for comparison: uppercase, drop spaces and any
 *  leading mẫu-số digit prefix (EasyBooks often outputs "1C26TAA"
 *  while the Tax file outputs "C26TAA"). */
function normKyHieu(v: unknown): string {
  let s = toStr(v).replace(/\s+/g, "").toUpperCase();
  s = s.replace(/^[0-9]+(?=[A-Z])/, "");
  return s;
}

export function buildInvoices(
  rows: RawRow[],
  mapping: Partial<Record<CanonicalField, string>>,
): Invoice[] {
  return buildInvoiceList(rows, mapping, true);
}

/** Same as buildInvoices but without aggregating duplicate keys — used to
 *  detect invoices accounted for multiple times in the source workbook. */
export function buildInvoicesRaw(
  rows: RawRow[],
  mapping: Partial<Record<CanonicalField, string>>,
): Invoice[] {
  return buildInvoiceList(rows, mapping, false);
}

function buildInvoiceList(
  rows: RawRow[],
  mapping: Partial<Record<CanonicalField, string>>,
  aggregate: boolean,
): Invoice[] {
  const list: Invoice[] = [];
  for (const r of rows) {
    const get = (f: CanonicalField) => (mapping[f] ? r[mapping[f]!] : "");
    const soHoaDonRaw = toStr(get("soHoaDon"));
    const soHoaDon = normInvoiceNumber(soHoaDonRaw);
    if (!soHoaDon) continue;
    // Skip column-numbering rows like "(1)", "(2)" used in Vietnamese forms.
    if (/^\(\d+\)$/.test(soHoaDonRaw.trim())) continue;
    // Skip section headings & totals that landed in the first column.
    const firstCellAll = Object.values(r).map(toStr).join(" ").toLowerCase();
    if (/^(cong|tong\s*cong|tong\s*so|i+\.|[0-9]+\.\s*hang\s*hoa)/i.test(
      removeDiacritics(soHoaDonRaw).toLowerCase().trim(),
    )) continue;
    // Heuristic: invoice number should contain a digit.
    if (!/\d/.test(soHoaDon)) continue;
    void firstCellAll;
    const kyHieu = toStr(get("kyHieu"));
    const mst = toStr(get("mst"));
    const mstNorm = normMst(mst);
    const kyHieuNorm = normKyHieu(kyHieu);
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
      _key: `${kyHieuNorm}|${soHoaDon}|${mstNorm}`,
      _mstNorm: mstNorm,
      _kyHieuNorm: kyHieuNorm,
      _raw: r,
    };
    if (!inv.tongTien && (inv.tienHang || inv.thueGTGT)) {
      inv.tongTien = inv.tienHang + inv.thueGTGT;
    }
    list.push(inv);
  }
  if (!aggregate) return list;
  // Aggregate rows sharing the same (kyHieu+soHoaDon+mst) — EasyBooks
  // exports often emit one row per line item; for invoice-level
  // reconciliation we sum monetary fields and keep the first descriptive
  // fields.
  const byKey = new Map<string, Invoice>();
  for (const inv of list) {
    const existing = byKey.get(inv._key);
    if (!existing) {
      byKey.set(inv._key, inv);
      continue;
    }
    existing.tienHang += inv.tienHang;
    existing.thueGTGT += inv.thueGTGT;
    existing.tongTien += inv.tongTien;
  }
  return Array.from(byKey.values());
}

/** Group invoices by số hóa đơn (and MST when present) so callers can
 *  surface invoices that were entered into the accounting software more
 *  than once. */
export function findDuplicates(invoices: Invoice[]): Invoice[][] {
  const groups = new Map<string, Invoice[]>();
  for (const inv of invoices) {
    const key = `${inv.soHoaDon}|${inv._mstNorm}`;
    const g = groups.get(key);
    if (g) g.push(inv); else groups.set(key, [inv]);
  }
  return Array.from(groups.values()).filter((g) => g.length >= 2);
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
  duplicatesEB: Invoice[][]; // EB invoices recorded 2+ times (same số HĐ)
  totals: {
    taxCount: number;
    ebCount: number;
    matchedCount: number;
    mismatchedCount: number;
    missingCount: number;
    deltaTienHang: number;
    deltaThueGTGT: number;
    deltaTongTien: number;
    missingOnEBAmount: number; // tổng tiền hóa đơn thiếu trên phần mềm (chỉ có Thuế)
    missingOnTaxAmount: number; // tổng tiền hóa đơn thiếu trên Thuế (chỉ có EB)
    duplicateEBCount: number; // số HĐ bị hạch toán 2 lần trên phần mềm
  };
}

const MONEY_EPS = 1; // tolerance 1 đồng

function moneyEq(a: number, b: number) {
  return Math.abs((a || 0) - (b || 0)) <= MONEY_EPS;
}

export function reconcile(
  taxList: Invoice[],
  ebList: Invoice[],
  ebRawList?: Invoice[],
): ReconcileResult {
  // Build a multi-key index for EB: try ky+so+mst, then so+mst, then just so
  const idxFull = new Map<string, Invoice[]>();
  const idxSoMst = new Map<string, Invoice[]>();
  const idxSo = new Map<string, Invoice[]>();
  for (const e of ebList) {
    const k1 = e._key;
    const k2 = `${e.soHoaDon}|${e._mstNorm}`;
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
    const k2 = `${t.soHoaDon}|${t._mstNorm}`;
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
    if (t._mstNorm && cand._mstNorm && t._mstNorm !== cand._mstNorm)
      diffs.push({ field: "mst", tax: t.mst, eb: cand.mst });
    if (t._kyHieuNorm && cand._kyHieuNorm && t._kyHieuNorm !== cand._kyHieuNorm)
      diffs.push({ field: "kyHieu", tax: t.kyHieu, eb: cand.kyHieu });
    if (diffs.length === 0) matched.push({ tax: t, eb: cand, diffs });
    else mismatched.push({ tax: t, eb: cand, diffs });
  }

  const onlyEB = ebList.filter((e) => !usedEB.has(e));

  const duplicatesEB = findDuplicates(ebRawList ?? ebList);

  const totals = {
    taxCount: taxList.length,
    ebCount: ebList.length,
    matchedCount: matched.length,
    mismatchedCount: mismatched.length,
    missingCount: onlyTax.length + onlyEB.length,
    deltaTienHang: mismatched.reduce((s, m) => s + (m.tax.tienHang - m.eb.tienHang), 0),
    deltaThueGTGT: mismatched.reduce((s, m) => s + (m.tax.thueGTGT - m.eb.thueGTGT), 0),
    deltaTongTien: mismatched.reduce((s, m) => s + (m.tax.tongTien - m.eb.tongTien), 0),
    missingOnEBAmount: onlyTax.reduce((s, t) => s + (t.tongTien || 0), 0),
    missingOnTaxAmount: onlyEB.reduce((s, e) => s + (e.tongTien || 0), 0),
    duplicateEBCount: duplicatesEB.reduce((s, g) => s + (g.length - 1), 0),
  };

  return { matched, mismatched, onlyTax, onlyEB, duplicatesEB, totals };
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