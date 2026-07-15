import { useState, useRef, useEffect, useMemo } from "react";
import { Search, X, Syringe, FlaskConical, Droplets, Tablet } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useTranslation } from "@/lib/i18n";
import {
  HOSPITAL_DRUG_LIST,
  searchHospitalDrugs,
  type HospitalDrug,
  type DrugForm,
} from "@/lib/drug-reference";

interface DrugNameComboboxProps {
  value: string;
  onChange: (name: string, drug?: HospitalDrug) => void;
  required?: boolean;
  placeholder?: string;
}

const FORM_GROUPS: { key: DrugForm; en: string; ar: string }[] = [
  { key: "injection", en: "Injections / Infusions", ar: "حقن وتسريب" },
  { key: "syrup",     en: "Syrups / Suspensions",  ar: "شراب ومعلقات" },
  { key: "drop",      en: "Drops",                  ar: "قطرات" },
  { key: "tablet",    en: "Tablets / Capsules",     ar: "أقراص وكبسولات" },
];

const FORM_ICONS: Record<DrugForm, React.ElementType> = {
  injection: Syringe,
  syrup:     FlaskConical,
  drop:      Droplets,
  tablet:    Tablet,
};

const FORM_COLORS: Record<DrugForm, string> = {
  injection: "text-red-500 bg-red-50 dark:bg-red-950/30",
  syrup:     "text-blue-500 bg-blue-50 dark:bg-blue-950/30",
  drop:      "text-cyan-500 bg-cyan-50 dark:bg-cyan-950/30",
  tablet:    "text-violet-500 bg-violet-50 dark:bg-violet-950/30",
};

export function DrugNameCombobox({ value, onChange, required, placeholder }: DrugNameComboboxProps) {
  const { isRtl } = useTranslation();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Keep local query in sync when value is set externally (e.g. DrugPicker selection)
  useEffect(() => {
    setQuery(value);
  }, [value]);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const filtered = useMemo(() => {
    return query.trim() ? searchHospitalDrugs(query) : HOSPITAL_DRUG_LIST;
  }, [query]);

  const grouped = useMemo(() => {
    const map: Partial<Record<DrugForm, HospitalDrug[]>> = {};
    for (const d of filtered) {
      if (!map[d.form]) map[d.form] = [];
      map[d.form]!.push(d);
    }
    return map;
  }, [filtered]);

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    onChange(e.target.value, undefined);
    setOpen(true);
  };

  const handleSelect = (drug: HospitalDrug) => {
    setQuery(drug.name);
    onChange(drug.name, drug);
    setOpen(false);
  };

  const handleClear = () => {
    setQuery("");
    onChange("", undefined);
    inputRef.current?.focus();
    setOpen(true);
  };

  const visibleGroups = FORM_GROUPS.filter(g => (grouped[g.key]?.length ?? 0) > 0);
  const totalCount = filtered.length;

  return (
    <div ref={containerRef} className="relative">
      {/* Input */}
      <div className="relative">
        <Search className={`absolute ${isRtl ? "right-3" : "left-3"} top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none`} />
        <Input
          ref={inputRef}
          value={query}
          onChange={handleInput}
          onFocus={() => setOpen(true)}
          required={required}
          placeholder={placeholder ?? (isRtl ? "ابحث باسم الدواء أو المادة الفعالة…" : "Search drug name or generic…")}
          className={isRtl ? "pr-9 pl-8" : "pl-9 pr-8"}
          autoComplete="off"
        />
        {query && (
          <button
            type="button"
            onClick={handleClear}
            className={`absolute ${isRtl ? "left-2" : "right-2"} top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors`}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 top-full mt-1 w-full rounded-md border bg-popover shadow-lg overflow-hidden">
          {totalCount === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              {isRtl ? "لا توجد نتائج" : "No drugs found"}
            </div>
          ) : (
            <>
              {/* Result count hint */}
              <div className="px-3 py-1.5 border-b bg-muted/30 flex items-center justify-between">
                <span className="text-[11px] text-muted-foreground">
                  {isRtl ? `${totalCount} دواء` : `${totalCount} drug${totalCount !== 1 ? "s" : ""}`}
                </span>
                <span className="text-[11px] text-muted-foreground">
                  {isRtl ? "اضغط للاختيار" : "Click to select"}
                </span>
              </div>

              <ScrollArea className="max-h-64">
                <div className="py-1">
                  {visibleGroups.map(group => {
                    const Icon = FORM_ICONS[group.key];
                    const colorCls = FORM_COLORS[group.key];
                    const drugs = grouped[group.key]!;
                    return (
                      <div key={group.key}>
                        {/* Group header */}
                        <div className="flex items-center gap-2 px-3 py-1.5 sticky top-0 bg-muted/50 backdrop-blur-sm">
                          <div className={`flex h-5 w-5 items-center justify-center rounded ${colorCls}`}>
                            <Icon className="h-3 w-3" />
                          </div>
                          <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                            {isRtl ? group.ar : group.en}
                          </span>
                          <span className="text-[10px] text-muted-foreground/70 ms-auto">{drugs.length}</span>
                        </div>

                        {/* Drug items */}
                        {drugs.map(drug => (
                          <button
                            key={drug.name}
                            type="button"
                            className={`w-full text-start px-3 py-2 hover:bg-muted/60 transition-colors flex items-start gap-2.5 group ${
                              drug.name === value ? "bg-primary/5 text-primary" : ""
                            }`}
                            onMouseDown={e => { e.preventDefault(); handleSelect(drug); }}
                          >
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm font-medium leading-tight truncate ${drug.name === value ? "text-primary" : "text-foreground"}`}>
                                {drug.name}
                              </p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <p className="text-[11px] text-muted-foreground truncate">{drug.nameAr}</p>
                                {drug.genericName && (
                                  <p className="text-[10px] text-muted-foreground/60 truncate hidden sm:block">· {drug.genericName}</p>
                                )}
                              </div>
                            </div>
                            {drug.refKey && (
                              <span className="shrink-0 text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-medium mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                {isRtl ? "جرعة تلقائية" : "auto-dose"}
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </>
          )}
        </div>
      )}
    </div>
  );
}
