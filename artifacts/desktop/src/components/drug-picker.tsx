import { useState, useMemo } from "react";
import { Search, Pill, ChevronDown, Info, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useTranslation } from "@/lib/i18n";
import { DRUG_REFERENCE, DRUG_CATEGORIES, searchDrugs, type DrugReference } from "@/lib/drug-reference";

interface DrugPickerProps {
  onSelect: (drug: DrugReference) => void;
  triggerLabel?: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  analgesic:    "bg-amber-100 text-amber-800 border-amber-200",
  antibiotic:   "bg-blue-100 text-blue-800 border-blue-200",
  antiviral:    "bg-violet-100 text-violet-800 border-violet-200",
  neurological: "bg-purple-100 text-purple-800 border-purple-200",
  respiratory:  "bg-sky-100 text-sky-800 border-sky-200",
  cardiac:      "bg-red-100 text-red-800 border-red-200",
  gi:           "bg-green-100 text-green-800 border-green-200",
  endocrine:    "bg-orange-100 text-orange-800 border-orange-200",
  hematology:   "bg-rose-100 text-rose-800 border-rose-200",
  emergency:    "bg-red-200 text-red-900 border-red-300",
  fluid:        "bg-cyan-100 text-cyan-800 border-cyan-200",
};

export function DrugPicker({ onSelect, triggerLabel }: DrugPickerProps) {
  const { isRtl } = useTranslation();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let results = query ? searchDrugs(query) : DRUG_REFERENCE;
    if (selectedCategory) results = results.filter(d => d.category === selectedCategory);
    return results;
  }, [query, selectedCategory]);

  const grouped = useMemo(() => {
    const map: Record<string, DrugReference[]> = {};
    for (const drug of filtered) {
      if (!map[drug.category]) map[drug.category] = [];
      map[drug.category].push(drug);
    }
    return map;
  }, [filtered]);

  const handleSelect = (drug: DrugReference) => {
    onSelect(drug);
    setOpen(false);
    setQuery("");
    setSelectedCategory(null);
    setExpanded(null);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" className="w-full justify-start gap-2 font-normal text-muted-foreground hover:text-foreground">
          <Pill className="h-4 w-4 shrink-0" />
          <span>{triggerLabel ?? (isRtl ? "اختر دواءً من قائمة الجرعات" : "Browse drug reference & doses…")}</span>
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-2xl h-[82vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-5 pt-5 pb-3 border-b shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Pill className="h-5 w-5 text-primary" />
            {isRtl ? "مرجع الأدوية — الجرعات الأطفال والحديثي الولادة" : "Drug Reference — Pediatric & Neonatal Doses"}
          </DialogTitle>

          <div className="relative mt-3">
            <Search className={`absolute ${isRtl ? "right-3" : "left-3"} top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none`} />
            <Input
              autoFocus
              value={query}
              onChange={e => { setQuery(e.target.value); setSelectedCategory(null); }}
              placeholder={isRtl ? "ابحث باسم الدواء أو المادة الفعالة…" : "Search by drug name or generic name…"}
              className={isRtl ? "pr-9" : "pl-9"}
            />
            {query && (
              <button onClick={() => setQuery("")} className={`absolute ${isRtl ? "left-3" : "right-3"} top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground`}>
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Category filter chips */}
          <div className="flex flex-wrap gap-1.5 mt-2">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                !selectedCategory
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background text-muted-foreground border-border hover:bg-muted"
              }`}
            >
              {isRtl ? "الكل" : "All"} ({DRUG_REFERENCE.length})
            </button>
            {DRUG_CATEGORIES.map(cat => {
              const count = DRUG_REFERENCE.filter(d => d.category === cat.key).length;
              return (
                <button
                  key={cat.key}
                  onClick={() => { setSelectedCategory(cat.key === selectedCategory ? null : cat.key); setQuery(""); }}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                    selectedCategory === cat.key
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background text-muted-foreground border-border hover:bg-muted"
                  }`}
                >
                  {isRtl ? cat.ar : cat.en} ({count})
                </button>
              );
            })}
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 min-h-0">
          <div className="px-4 py-3 space-y-4">
            {filtered.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Pill className="mx-auto h-10 w-10 mb-3 opacity-30" />
                <p>{isRtl ? "لا توجد نتائج" : "No drugs found"}</p>
              </div>
            ) : (
              DRUG_CATEGORIES
                .filter(cat => grouped[cat.key]?.length)
                .map(cat => (
                  <div key={cat.key}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {isRtl ? cat.ar : cat.en}
                      </span>
                      <div className="flex-1 h-px bg-border" />
                      <span className="text-xs text-muted-foreground">{grouped[cat.key].length}</span>
                    </div>
                    <div className="space-y-1.5">
                      {grouped[cat.key].map(drug => {
                        const isExpanded = expanded === drug.name;
                        return (
                          <div
                            key={drug.name}
                            className="rounded-lg border bg-card hover:bg-muted/40 transition-colors overflow-hidden"
                          >
                            {/* Drug header row */}
                            <div className="flex items-start gap-3 p-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex flex-wrap items-center gap-2 mb-1">
                                  <span className="font-semibold text-sm text-foreground">{drug.name}</span>
                                  {drug.nameAr && (
                                    <span className="text-xs text-muted-foreground font-medium">{drug.nameAr}</span>
                                  )}
                                  <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${CATEGORY_COLORS[drug.category]}`}>
                                    {isRtl ? drug.categoryAr : drug.category}
                                  </Badge>
                                </div>
                                <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
                                  <span><span className="text-foreground/70">{isRtl ? "الطريق:" : "Route:"}</span> {drug.route}</span>
                                  <span><span className="text-foreground/70">{isRtl ? "التكرار:" : "Freq:"}</span> {drug.frequency}</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => setExpanded(isExpanded ? null : drug.name)}
                                  className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                                  title={isRtl ? "عرض الجرعات" : "Show doses"}
                                >
                                  <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                                </button>
                                <Button
                                  type="button"
                                  size="sm"
                                  className="h-7 text-xs"
                                  onClick={() => handleSelect(drug)}
                                >
                                  {isRtl ? "اختر" : "Select"}
                                </Button>
                              </div>
                            </div>

                            {/* Expanded dose panel */}
                            {isExpanded && (
                              <div className="border-t bg-muted/30 px-3 py-3 space-y-2.5 text-xs">
                                <div className="grid sm:grid-cols-2 gap-2.5">
                                  <div className="rounded-md border border-blue-200 bg-blue-50 dark:bg-blue-950/30 dark:border-blue-800 p-2.5">
                                    <div className="flex items-center gap-1.5 mb-1 font-semibold text-blue-800 dark:text-blue-300">
                                      <span>👶</span>
                                      <span>{isRtl ? "جرعة الأطفال" : "Pediatric Dose"}</span>
                                    </div>
                                    <p className="text-blue-900 dark:text-blue-200 leading-relaxed">{drug.pediatricDose}</p>
                                  </div>
                                  <div className="rounded-md border border-violet-200 bg-violet-50 dark:bg-violet-950/30 dark:border-violet-800 p-2.5">
                                    <div className="flex items-center gap-1.5 mb-1 font-semibold text-violet-800 dark:text-violet-300">
                                      <span>🍼</span>
                                      <span>{isRtl ? "جرعة حديثي الولادة" : "Neonatal Dose"}</span>
                                    </div>
                                    <p className="text-violet-900 dark:text-violet-200 leading-relaxed">{drug.neonatalDose}</p>
                                  </div>
                                </div>
                                {drug.notes && (
                                  <div className="flex items-start gap-1.5 rounded-md border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 p-2 text-amber-800 dark:text-amber-300">
                                    <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                                    <span>{drug.notes}</span>
                                  </div>
                                )}
                                <Button
                                  type="button"
                                  size="sm"
                                  className="w-full h-8"
                                  onClick={() => handleSelect(drug)}
                                >
                                  {isRtl ? "اختر هذا الدواء وأملأ النموذج" : "Select this drug & fill form"}
                                </Button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
