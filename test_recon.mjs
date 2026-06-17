import fs from "fs";
import {parseWorkbook, pickBestSheet, autoMap, buildInvoices, reconcile} from "/dev-server/src/lib/reconcile.ts";

async function load(p) {
  const buf = fs.readFileSync(p);
  return await parseWorkbook(new File([buf], p));
}
const tax = pickBestSheet(await load("/mnt/user-uploads/BANG_KE_HOA_DON_BAN_RA_TU_THUE.xlsx"));
const eb  = pickBestSheet(await load("/mnt/user-uploads/BANG_KE_BAN_RA_1.xlsx"));
const tm = autoMap(tax.headers), em = autoMap(eb.headers);
const ti = buildInvoices(tax.rows, tm), ei = buildInvoices(eb.rows, em);
console.log("EB rows containing 2394:");
for (const e of ei) if (e.soHoaDon==="2394") console.log(" ", e.kyHieu, e.mst, e.ngay, e.tongTien, "key=",e._key);
console.log("TAX rows containing 2394:");
for (const e of ti) if (e.soHoaDon==="2394") console.log(" ", e.kyHieu, e.mst, e.ngay, e.tongTien, "key=",e._key);
