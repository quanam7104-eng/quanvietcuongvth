import * as XLSX from "xlsx";

export interface BankLine {
  id: number;
  date: string; // dd/mm/yyyy
  ref: string;
  desc: string;
  thu: number;
  chi: number;
}

export interface BookVoucher {
  id: number;
  date: string;
  so: string;
  desc: string;
  thu: number;
  chi: number;
}

export interface BankMatch {
  voucher: BookVoucher;
  lines: BankLine[];
  kind: "exact" | "lech-ngay" | "gop" | "nhieu-phieu";
  groupSize?: number;
}

export interface DailyRow {
  date: string;
  bookThu: number;
  bankThu: number;
  bookChi: number;
  bankChi: number;
}

export interface BankResult {
  matches: BankMatch[];
  onlyBook: BookVoucher[];
  onlyBank: BankLine[];
  daily: DailyRow[];
  totals: { bookThu: number; bankThu: number; bookChi: number; bankChi: number };
}

const norm = (s: unknown) =>
  String(s ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

function num(v: unknown): number {
  let s = String(v ?? "").replace(/vnd|\s/gi, "");
  if (!s) return 0;
  // Remove the accounting wrapper before detecting decimal/thousands separators.
  const negativeParentheses = /^\(.*\)$/.test(s);
  if (negativeParentheses) s = s.slice(1, -1);
  const c = s.includes(","), d = s.includes(".");
  if (c && d) s = s.lastIndexOf(",") > s.lastIndexOf(".") ? s.replace(/\./g, "").replace(",", ".") : s.replace(/,/g, "");
  else if (c) s = /^-?\d{1,3}(,\d{3})+$/.test(s) ? s.replace(/,/g, "") : s.replace(",", ".");
  else if (d && /^-?\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, "");
  const n = parseFloat(s.replace(/[^\d.\-]/g, ""));
  return isNaN(n) ? 0 : negativeParentheses ? -Math.abs(n) : n;
}

function date(v: unknown): string {
  const m = String(v ?? "").match(/(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/);
  if (!m) return "";
  const y = m[3].length === 2 ? "20" + m[3] : m[3];
  return `${m[1].padStart(2, "0")}/${m[2].padStart(2, "0")}/${y}`;
}
const dkey = (d: string) => d.split("/").reverse().join("");
const dayNum = (d: string) => {
  const [dd, mm, yy] = d.split("/").map(Number);
  return Date.UTC(yy, mm - 1, dd) / 86400000;
};

async function matrices(file: File): Promise<unknown[][][]> {
  const wb = XLSX.read(await file.arrayBuffer(), { type: "array" });
  return wb.SheetNames.map((n) =>
    XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[n], { header: 1, raw: false, defval: "" }),
  );
}

function findCol(h: string[], res: RegExp[]): number {
  for (const re of res) {
    const i = h.findIndex((x) => re.test(x));
    if (i >= 0) return i;
  }
  return -1;
}

export async function parseBankStatement(file: File): Promise<BankLine[]> {
  for (const m of await matrices(file)) {
    for (let r = 0; r < Math.min(m.length, 40); r++) {
      const h = (m[r] || []).map(norm);
      const iNo = findCol(h, [/ghi no|debit|so tien chi|rut ra/]);
      const iCo = findCol(h, [/ghi co|credit|so tien thu|gui vao/]);
      const iDate = findCol(h, [/ngay|date/]);
      if (iNo < 0 || iCo < 0 || iDate < 0) continue;
      const iDesc = findCol(h, [/noi dung|detail|dien giai|description/]);
      const out: BankLine[] = [];
      for (let k = r + 1; k < m.length; k++) {
        const row = m[k] || [];
        const dt = date(row[iDate]);
        if (!dt) continue;
        const chi = num(row[iNo]), thu = num(row[iCo]);
        if (!chi && !thu) continue;
        const refM = String(row[iDate]).split("/ ").slice(1).join("/ ").trim();
        out.push({ id: out.length, date: dt, ref: refM, desc: String(row[iDesc] ?? "").trim(), thu, chi });
      }
      if (out.length) return out;
    }
  }
  throw new Error("Không tìm thấy bảng sao kê (cần cột Ngày, Ghi nợ, Ghi có)");
}

export async function parseBankBook(file: File): Promise<BookVoucher[]> {
  for (const m of await matrices(file)) {
    for (let r = 0; r < Math.min(m.length, 40); r++) {
      const h = (m[r] || []).map(norm);
      const iSo = findCol(h, [/so chung tu/, /so ct/, /^chung tu$/]);
      const iThu = findCol(h, [/^(so tien )?thu$/, /^thu\b/, /phat sinh no/]);
      const iChi = findCol(h, [/^(so tien )?chi$/, /^chi\b/, /phat sinh co/]);
      const iDate = findCol(h, [/ngay hach toan/, /ngay chung tu/, /ngay/]);
      if (iSo < 0 || iThu < 0 || iChi < 0 || iDate < 0) continue;
      const iDesc = findCol(h, [/dien giai|noi dung/]);
      const map = new Map<string, BookVoucher>();
      for (let k = r + 1; k < m.length; k++) {
        const row = m[k] || [];
        const dt = date(row[iDate]);
        const so = String(row[iSo] ?? "").trim();
        if (!dt || !so) continue;
        const thu = num(row[iThu]), chi = num(row[iChi]);
        if (!thu && !chi) continue;
        const key = `${so}|${dt}`;
        const v = map.get(key);
        if (v) { v.thu += thu; v.chi += chi; }
        else map.set(key, { id: map.size, date: dt, so, desc: String(row[iDesc] ?? "").trim(), thu, chi });
      }
      if (map.size) return [...map.values()];
    }
  }
  throw new Error("Không tìm thấy sổ tiền gửi (cần cột Ngày, Số chứng từ, Thu, Chi)");
}

// So khớp chính xác đến từng đồng — không làm tròn.
// Chỉ lượng tử hóa ở mức 1e-9 để tránh sai số dấu phẩy động của IEEE-754
// (mọi số tiền VND đều là số nguyên đồng, nên giá trị không bị thay đổi).
const cents = (n: number) => Math.round(n * 1e9) / 1e9;
const amt = (x: { thu: number; chi: number }) => cents(x.thu - x.chi); // signed

/** Tìm tập con các dòng sao kê có tổng = target (cents, cùng dấu). */
function subsetSum(items: BankLine[], target: number): BankLine[] | null {
  const list = items.filter((i) => Math.sign(amt(i)) === Math.sign(target) && Math.abs(amt(i)) <= Math.abs(target))
    .sort((a, b) => Math.abs(amt(b)) - Math.abs(amt(a)))
    .slice(0, 40);
  const T = Math.abs(target);
  const total = list.reduce((s, i) => s + Math.abs(amt(i)), 0);
  if (total < T) return null;
  if (total === T) return list.length >= 2 ? list : null;
  let steps = 0;
  const pick: BankLine[] = [];
  const suffix = list.map((_, i) => list.slice(i).reduce((s, x) => s + Math.abs(amt(x)), 0));
  const dfs = (i: number, rem: number): boolean => {
    if (rem === 0) return pick.length >= 2;
    if (i >= list.length || rem < 0 || suffix[i] < rem || ++steps > 300000) return false;
    pick.push(list[i]);
    if (dfs(i + 1, rem - Math.abs(amt(list[i])))) return true;
    pick.pop();
    return dfs(i + 1, rem);
  };
  return dfs(0, T) ? [...pick] : null;
}

export function reconcileBank(book: BookVoucher[], bank: BankLine[], dayTolerance = 3): BankResult {
  const used = new Set<number>();
  const matched = new Set<number>();
  const matches: BankMatch[] = [];
  const free = () => bank.filter((b) => !used.has(b.id));

  // 1) cùng ngày, cùng số tiền
  for (const v of book) {
    const b = free().find((x) => x.date === v.date && amt(x) === amt(v));
    if (b) { used.add(b.id); matched.add(v.id); matches.push({ voucher: v, lines: [b], kind: "exact" }); }
  }
  // 2) gộp: 1 phiếu trong sổ = nhiều dòng sao kê cùng ngày (vd. trả lương)
  for (const v of book) {
    if (matched.has(v.id)) continue;
    const set = subsetSum(free().filter((x) => x.date === v.date), amt(v));
    if (set) { set.forEach((b) => used.add(b.id)); matched.add(v.id); matches.push({ voucher: v, lines: set, kind: "gop" }); }
  }
  // 3) lệch ngày trong khoảng cho phép
  for (const v of book) {
    if (matched.has(v.id)) continue;
    const b = free().find((x) => amt(x) === amt(v) && Math.abs(dayNum(x.date) - dayNum(v.date)) <= dayTolerance);
    if (b) { used.add(b.id); matched.add(v.id); matches.push({ voucher: v, lines: [b], kind: "lech-ngay" }); continue; }
    const near = free().filter((x) => Math.abs(dayNum(x.date) - dayNum(v.date)) <= dayTolerance);
    const set = subsetSum(near, amt(v));
    if (set) { set.forEach((s) => used.add(s.id)); matched.add(v.id); matches.push({ voucher: v, lines: set, kind: "gop" }); }
  }
  // 4) nhiều phiếu sổ ↔ nhiều dòng sao kê (vd. THU NO TKV): cùng ngày, cùng chiều, tổng tiền bằng nhau
  const groupPass = (sameKey: (d: string) => string) => {
    const groups = new Map<string, { v: BookVoucher[]; b: BankLine[] }>();
    const g = (k: string) => groups.get(k) ?? groups.set(k, { v: [], b: [] }).get(k)!;
    for (const v of book) if (!matched.has(v.id) && amt(v) !== 0) g(`${sameKey(v.date)}|${Math.sign(amt(v))}`).v.push(v);
    for (const b of free()) if (amt(b) !== 0) g(`${sameKey(b.date)}|${Math.sign(amt(b))}`).b.push(b);
    for (const { v, b } of groups.values()) {
      if (!v.length || !b.length || v.length + b.length < 3) continue;
      if (v.reduce((s, x) => s + amt(x), 0) !== b.reduce((s, x) => s + amt(x), 0)) continue;
      b.forEach((x) => used.add(x.id));
      v.forEach((x) => { matched.add(x.id); matches.push({ voucher: x, lines: b, kind: "nhieu-phieu", groupSize: v.length }); });
    }
  };
  groupPass((d) => d);
  // cho phép lệch ngày: gộp theo cửa sổ tuần
  groupPass((d) => String(Math.floor(dayNum(d) / 7)));


  const dmap = new Map<string, DailyRow>();
  const row = (d: string) => dmap.get(d) ?? dmap.set(d, { date: d, bookThu: 0, bankThu: 0, bookChi: 0, bankChi: 0 }).get(d)!;
  for (const v of book) { const r = row(v.date); r.bookThu += v.thu; r.bookChi += v.chi; }
  for (const b of bank) { const r = row(b.date); r.bankThu += b.thu; r.bankChi += b.chi; }
  const daily = [...dmap.values()].sort((a, b) => dkey(a.date).localeCompare(dkey(b.date)));
  const totals = daily.reduce(
    (s, r) => ({ bookThu: s.bookThu + r.bookThu, bankThu: s.bankThu + r.bankThu, bookChi: s.bookChi + r.bookChi, bankChi: s.bankChi + r.bankChi }),
    { bookThu: 0, bankThu: 0, bookChi: 0, bankChi: 0 },
  );
  matches.sort((a, b) => dkey(a.voucher.date).localeCompare(dkey(b.voucher.date)));
  return {
    matches,
    onlyBook: book.filter((v) => !matched.has(v.id)),
    onlyBank: bank.filter((b) => !used.has(b.id)),
    daily,
    totals,
  };
}

export const dayEq = (a: number, b: number) => cents(a) === cents(b);

export function exportBankReport(r: BankResult) {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(r.daily.map((d) => ({
    "Ngày": d.date, "Thu - Sổ": d.bookThu, "Thu - Sao kê": d.bankThu, "Lệch thu": d.bookThu - d.bankThu,
    "Chi - Sổ": d.bookChi, "Chi - Sao kê": d.bankChi, "Lệch chi": d.bookChi - d.bankChi,
  }))), "1. Theo ngày");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(r.matches.map((m) => ({
    "Ngày sổ": m.voucher.date, "Số CT": m.voucher.so, "Diễn giải": m.voucher.desc,
    "Thu": m.voucher.thu, "Chi": m.voucher.chi, "Số dòng sao kê": m.lines.length,
    "Kiểu khớp": m.kind === "gop" ? "Gộp nhiều dòng" : m.kind === "lech-ngay" ? "Lệch ngày" : "Khớp",
    "Ngày sao kê": [...new Set(m.lines.map((l) => l.date))].join(", "),
  }))), "2. Đã khớp");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(r.onlyBook.map((v) => ({
    "Ngày": v.date, "Số CT": v.so, "Diễn giải": v.desc, "Thu": v.thu, "Chi": v.chi,
  }))), "3. Chỉ có trên sổ");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(r.onlyBank.map((b) => ({
    "Ngày": b.date, "Số GD": b.ref, "Nội dung": b.desc, "Ghi có (Thu)": b.thu, "Ghi nợ (Chi)": b.chi,
  }))), "4. Chỉ có trên sao kê");
  XLSX.writeFile(wb, `DoiChieu_SaoKe_${new Date().toISOString().slice(0, 10)}.xlsx`);
}
