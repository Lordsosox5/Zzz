import { useState } from "react";
import { useListClinicalNotes, useCreateClinicalNote, getListClinicalNotesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "@/lib/i18n";
import { getUser } from "@/lib/auth";
import { canWriteClinicalNotes } from "@/lib/permissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PatientSearchCombobox } from "@/components/patient-search-combobox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Loader2, Save, Eye } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

export default function ClinicalNotes() {
  const { t, isRtl } = useTranslation();
  const { toast } = useToast();
  const user = getUser();
  const canWrite = canWriteClinicalNotes(user?.role ?? "");
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const { data: notes, isLoading } = useListClinicalNotes({});
  const createMutation = useCreateClinicalNote();

  const [form, setForm] = useState({ patientId: "", patientName: "", type: "soap", content: "" });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.patientId) {
      toast({ variant: "destructive", title: t("generic.error"), description: t("generic.selectPatient") });
      return;
    }
    createMutation.mutate(
      { data: { patientId: Number(form.patientId), type: form.type, content: form.content } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListClinicalNotesQueryKey() });
          toast({ title: t("generic.success"), description: t("generic.addSuccess") });
          setIsOpen(false);
          setForm({ patientId: "", patientName: "", type: "soap", content: "" });
        },
        onError: () => toast({ variant: "destructive", title: t("generic.error"), description: t("generic.addError") }),
      }
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold tracking-tight">{t("nav.notes")}</h1>
        {canWrite && (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button><Plus className={`${isRtl ? 'ml-2' : 'mr-2'} h-4 w-4`} />{t("notes.addNote")}</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>{t("notes.addClinicalNote")}</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                  <Label>{t("generic.patient")} *</Label>
                  <PatientSearchCombobox
                    value={form.patientId}
                    onChange={(id, name) => setForm(p => ({ ...p, patientId: id, patientName: name }))}
                  />
                </div>
                <div className="space-y-3">
                  <Label>{t("notes.noteType")} *</Label>
                  <Select value={form.type} onValueChange={v => setForm(p => ({ ...p, type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="soap">SOAP</SelectItem>
                      <SelectItem value="progress">Progress</SelectItem>
                      <SelectItem value="discharge">Discharge</SelectItem>
                      <SelectItem value="admission">Admission</SelectItem>
                      <SelectItem value="consultation">Consultation</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-3">
                <Label>{t("notes.content")} *</Label>
                <Textarea required placeholder={t("notes.contentPlaceholder")} value={form.content} onChange={e => setForm(p => ({ ...p, content: e.target.value }))} className="min-h-[200px]" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>{t("generic.cancel")}</Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className={`${isRtl ? 'ml-2' : 'mr-2'} h-4 w-4`} />}
                  {t("generic.save")}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
        )}
      </div>

      <Card>
        <CardHeader><CardTitle>{t("notes.recentNotes")}</CardTitle></CardHeader>
        <CardContent className="px-4 pb-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("generic.date")}</TableHead>
                <TableHead>{t("generic.patient")}</TableHead>
                <TableHead>{t("generic.type")}</TableHead>
                <TableHead>{t("notes.author")}</TableHead>
                <TableHead>{t("notes.preview")}</TableHead>
                <TableHead className={isRtl ? "text-left" : "text-right"}>{t("generic.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="h-24 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" /></TableCell></TableRow>
              ) : notes && notes.length > 0 ? (
                notes.map((note) => (
                  <TableRow key={note.id}>
                    <TableCell>{new Date(note.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell className="font-medium">{(note as Record<string, unknown>).patientName as string ?? '-'}</TableCell>
                    <TableCell><Badge variant="outline">{note.type}</Badge></TableCell>
                    <TableCell>{note.authorName ?? '-'}</TableCell>
                    <TableCell className="max-w-xs truncate text-muted-foreground">{note.content}</TableCell>
                    <TableCell className={isRtl ? "text-left" : "text-right"}><Button variant="ghost" size="sm">{t("generic.view")}</Button></TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow><TableCell colSpan={6} className="h-24 text-center text-muted-foreground">{t("notes.noNotes")}</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
