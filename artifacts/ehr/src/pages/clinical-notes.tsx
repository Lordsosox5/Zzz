import { useState } from "react";
import { useListClinicalNotes, useCreateClinicalNote, getListClinicalNotesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { FileText, Plus, Loader2, Save } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

export default function ClinicalNotes() {
  const { t, isRtl } = useTranslation();
  const [patientId, setPatientId] = useState<number | undefined>(undefined);
  const { data: notes, isLoading } = useListClinicalNotes({ patientId });
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold tracking-tight">{t("nav.notes")}</h1>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className={`${isRtl ? 'ml-2' : 'mr-2'} h-4 w-4`} />
              {t("notes.addNote")}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{t("notes.addClinicalNote")}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("notes.patientId")}</label>
                <Input placeholder={t("notes.enterPatientId")} type="number" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("notes.noteType")}</label>
                <Input placeholder={t("notes.noteTypePlaceholder")} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("notes.content")}</label>
                <Textarea placeholder={t("notes.contentPlaceholder")} className="min-h-[200px]" />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsOpen(false)}>{t("generic.cancel")}</Button>
              <Button><Save className={`${isRtl ? 'ml-2' : 'mr-2'} h-4 w-4`} /> {t("generic.save")}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("notes.recentNotes")}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("generic.date")}</TableHead>
                <TableHead>{t("generic.type")}</TableHead>
                <TableHead>{t("notes.author")}</TableHead>
                <TableHead>{t("notes.preview")}</TableHead>
                <TableHead className={isRtl ? "text-left" : "text-right"}>{t("generic.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
                  </TableCell>
                </TableRow>
              ) : notes && notes.length > 0 ? (
                notes.map((note) => (
                  <TableRow key={note.id}>
                    <TableCell>{new Date(note.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell><Badge variant="outline">{note.type}</Badge></TableCell>
                    <TableCell>{note.authorName}</TableCell>
                    <TableCell className="max-w-xs truncate text-muted-foreground">{note.content}</TableCell>
                    <TableCell className={isRtl ? "text-left" : "text-right"}>
                      <Button variant="ghost" size="sm">{t("generic.view")}</Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                    {t("notes.noNotes")}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
