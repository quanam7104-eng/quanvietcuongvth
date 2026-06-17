import fs from "fs";
import {parseWorkbook, pickBestSheet, autoMap, buildInvoices} from "/dev-server/src/lib/reconcile.ts";

const tax = pickBestSheet(await parseWorkbook(new File([fs.readFileSync("/mnt/user-uploads/BANG_KE_HOA_DON_BAN_RA_TU_THUE.xlsx")], "x")));
console.log("headerRowIndex:", tax.headerRowIndex, "rows:", tax.rows.length, "headers:", tax.headers);
console.log("first 3 rows:");
for (const r of tax.rows.slice(0,3)) console.log(r);
console.log("\nfind soHoaDon=2394:");
for (const r of tax.rows) {
  const v = r["Số hóa đơn"];
  if (String(v).includes("2394")) console.log(r);
}
const tm = autoMap(tax.headers);
const ti = buildInvoices(tax.rows, tm);
console.log("TAX inv count:", ti.length);
console.log("min so:", Math.min(...ti.map(x=>+x.soHoaDon||0)), "max:", Math.max(...ti.map(x=>+x.soHoaDon||0)));
const sorted = ti.map(x=>+x.soHoaDon).filter(n=>!isNaN(n)).sort((a,b)=>a-b);
console.log("first 5 sohoadon:", sorted.slice(0,5), "last 5:", sorted.slice(-5));
