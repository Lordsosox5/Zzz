import { useState, useCallback } from "react";
import { useListPatients } from "@workspace/api-client-react";
import { useTranslation } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Loader2, ChevronsUpDown, Check, User } from "lucide-react";

interface PatientSearchComboboxProps {
  value: string;
  onChange: (id: string, name: string) => void;
}

export function PatientSearchCombobox({ value, onChange }: PatientSearchComboboxProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedName, setSelectedName] = useState("");

  const { data, isLoading } = useListPatients(
    search.trim() ? { search: search.trim(), limit: 20 } : { limit: 30 },
    { query: { enabled: open } }
  );

  const patients = (data?.patients ?? []).map((p: Record<string, unknown>) => ({
    id: p.id as number,
    nameEn: (p.nameEn ?? p.name_en ?? "") as string,
    mrn: (p.mrn ?? "") as string,
  }));

  const handleSelect = useCallback((patient: typeof patients[0]) => {
    onChange(String(patient.id), patient.nameEn);
    setSelectedName(patient.nameEn);
    setOpen(false);
  }, [onChange]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" className="w-full justify-between font-normal">
          {value && selectedName ? (
            <span className="flex items-center gap-2">
              <User className="h-3.5 w-3.5 text-muted-foreground" />
              {selectedName}
            </span>
          ) : (
            <span className="text-muted-foreground">{t("generic.selectPatient")}</span>
          )}
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={t("generic.searchPatient")}
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            {isLoading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : patients.length === 0 ? (
              <CommandEmpty>{t("generic.noPatientFound")}</CommandEmpty>
            ) : (
              <CommandGroup>
                {patients.map((p) => (
                  <CommandItem
                    key={p.id}
                    value={String(p.id)}
                    onSelect={() => handleSelect(p)}
                    className="cursor-pointer"
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div className="h-7 w-7 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0">
                        {p.nameEn.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{p.nameEn}</p>
                        <p className="text-xs text-muted-foreground font-mono">{p.mrn}</p>
                      </div>
                    </div>
                    {value === String(p.id) && <Check className="h-4 w-4 text-primary shrink-0" />}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
