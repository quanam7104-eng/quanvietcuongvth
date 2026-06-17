import * as XLSX from "xlsx";
import fs from "fs";
import {parseWorkbook, pickBestSheet, autoMap, buildInvoices, reconcile} from "/dev-server/src/lib/reconcile.ts";

async function load(p) {
  const buf = fs.readFileSync(p);
  const file = new File([buf], p.split("/").pop());
  return await parseWorkbook(file);
}
const tax = await load("/mnt/user-uploads/BANG_KE_HOA_DON_BAN_RA_TU_THUE.xlsx");
const eb  = await load("/mnt/user-uploads/BANG_KE_BAN_RA_1.xlsx");
const ts = pickBestSheet(tax), es = pickBestSheet(eb);
console.log("TAX sheet", ts.sheetName, "headers:", ts.headers);
console.log("EB sheet", es.sheetName, "headers:", es.headers);
const tm = autoMap(ts.headers), em = autoMap(es.headers);
console.log("TAX map:", tm); console.log("EB map:", em);
const ti = buildInvoices(ts.rows, tm), ei = buildInvoices(es.rows, em);
console.log("TAX inv:", ti.length, "EB inv:", ei.length);
const r = reconcile(ti, ei);
console.log("matched:", r.matched.length, "mism:", r.mismatched.length, "onlyTax:", r.onlyTax.length, "onlyEB:", r.onlyEB.length);
console.log("Sample onlyEB:");
for (const e of r.onlyEB.slice(0,8)) console.log(" ", e.soHoaDon, e.kyHieu, e.mst, e.ngay, e.tongTien, e._key);
console.log("Sample onlyTax:");
for (const e of r.onlyTax.slice(0,8)) console.log(" ", e.soHoaDon, e.kyHieu, e.mst, e.ngay, e.tongTien, e._key);
