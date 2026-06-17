import { useCallback, useRef, useState } from "react";
import { Upload, FileSpreadsheet, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Props {
  label: string;
  hint: string;
  accent: "primary" | "accent";
  file: File | null;
  onFile: (f: File | null) => void;
}

export function FileDropzone({ label, hint, accent, file, onFile }: Props) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handle = useCallback((files: FileList | null) => {
    if (!files || !files[0]) return;
    const f = files[0];
    if (!/\.(xlsx|xls)$/i.test(f.name)) return;
    onFile(f);
  }, [onFile]);

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => { e.preventDefault(); setDragging(false); handle(e.dataTransfer.files); }}
      className={cn(
        "relative rounded-xl border-2 border-dashed p-6 transition-all",
        "bg-card hover:bg-muted/50",
        dragging ? "border-primary bg-primary/5 scale-[1.01]" : "border-border",
        file && (accent === "primary" ? "border-primary/60" : "border-accent-foreground/40"),
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls"
        className="hidden"
        onChange={(e) => handle(e.target.files)}
      />
      <div className="flex items-start gap-4">
        <div className={cn(
          "flex h-12 w-12 shrink-0 items-center justify-center rounded-lg",
          accent === "primary" ? "bg-primary/10 text-primary" : "bg-accent text-accent-foreground",
        )}>
          {file ? <FileSpreadsheet className="h-6 w-6" /> : <Upload className="h-6 w-6" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-foreground">{label}</div>
          <div className="mt-0.5 text-xs text-muted-foreground">{hint}</div>
          {file ? (
            <div className="mt-3 flex items-center gap-2">
              <span className="truncate text-sm font-medium text-foreground">{file.name}</span>
              <span className="text-xs text-muted-foreground">
                {(file.size / 1024).toFixed(0)} KB
              </span>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                onClick={() => onFile(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <Button
              size="sm"
              variant="outline"
              className="mt-3"
              onClick={() => inputRef.current?.click()}
            >
              Chọn file Excel
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}