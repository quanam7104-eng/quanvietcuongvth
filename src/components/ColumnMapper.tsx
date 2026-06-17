import { FIELD_LABELS, type CanonicalField } from "@/lib/reconcile";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

interface Props {
  title: string;
  headers: string[];
  mapping: Partial<Record<CanonicalField, string>>;
  onChange: (m: Partial<Record<CanonicalField, string>>) => void;
}

const FIELDS: CanonicalField[] = [
  "soHoaDon","kyHieu","mauSo","ngay","mst","tenKH",
  "tienHang","thueGTGT","tongTien","thueSuat","loai","trangThai",
];

export function ColumnMapper({ title, headers, mapping, onChange }: Props) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <h4 className="mb-3 text-sm font-semibold">{title}</h4>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {FIELDS.map((f) => (
          <div key={f} className="space-y-1">
            <Label className="text-xs">{FIELD_LABELS[f]}</Label>
            <Select
              value={mapping[f] ?? "__none"}
              onValueChange={(v) => {
                const next = { ...mapping };
                if (v === "__none") delete next[f];
                else next[f] = v;
                onChange(next);
              }}
            >
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="-- Bỏ qua --" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none">— Bỏ qua —</SelectItem>
                {headers.map((h) => (
                  <SelectItem key={h} value={h}>{h}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ))}
      </div>
    </div>
  );
}