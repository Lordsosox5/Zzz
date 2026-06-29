import { useState } from "react";
import { useLocation } from "wouter";
import { useListClinicalNotes } from "@workspace/api-client-react";
import { useTranslation } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, FileText } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

type ClinicalNote = {
  id: number;
  patientId: number;
  type: string;
  content: string;
  authorName?: string | null;
  createdAt: string;
  patientName?: string | null;
};

export default function ClinicalNotes() {
  const { t, isRtl } = useTranslation();
  const [, navigate] = useLocation();
  const [viewNote, setViewNote] = useState<ClinicalNote | null>(null);
  const { data: notes, isLoading } = useListClinicalNotes({});

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold tracking-tight">{t("nav.notes")}</h1>
      </div>

      {/* View Note Dialog */}
      <Dialog open={!!viewNote} onOpenChange={(open) => { if (!open) setViewNote(null); }}>
        <DialogContent className="max-w-2xl h-[85vh] flex flex-col p-0 gap-0 overflow-hidden">
          <div className="flex items-center gap-3 px-6 py-4 border-b bg-card shrink-0">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-base font-bold">
                {viewNote?.patientName ?? `${t("generic.patient")} #${viewNote?.patientId}`}
              </DialogTitle>
              <div className="flex items-center gap-2 mt-0.5">
                <Badge variant="outline" className="text-xs capitalize">{viewNote?.type}</Badge>
                <span className="text-xs text-muted-foreground">
                  {viewNote?.authorName ? `${isRtl ? "بواسطة" : "by"} ${viewNote.authorName} · ` : ""}
                  {viewNote?.createdAt ? new Date(viewNote.createdAt).toLocaleDateString() : ""}
                </span>
              </div>
            </div>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-6">
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">{t("notes.content")}</p>
              <div className="rounded-xl border bg-muted/30 px-5 py-4">
                <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground">{viewNote?.content}</p>
              </div>
              <Separator className="my-4" />
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { if (viewNote) { navigate(`/patients/${viewNote.patientId}`); setViewNote(null); } }}
                >
                  {isRtl ? "عرض ملف المريض" : "View Patient File"}
                </Button>
              </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

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
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="h-24 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" /></TableCell></TableRow>
              ) : notes && notes.length > 0 ? (
                notes.map((note) => (
                  <TableRow
                    key={note.id}
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => setViewNote(note as ClinicalNote)}
                  >
                    <TableCell>{new Date(note.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <button
                        onClick={(e) => { e.stopPropagation(); navigate(`/patients/${note.patientId}`); }}
                        className="font-medium text-primary hover:underline cursor-pointer"
                      >
                        {(note as Record<string, unknown>).patientName as string ?? '-'}
                      </button>
                    </TableCell>
                    <TableCell><Badge variant="outline">{note.type}</Badge></TableCell>
                    <TableCell>{note.authorName ?? '-'}</TableCell>
                    <TableCell className="max-w-xs truncate text-muted-foreground text-sm">{note.content}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow><TableCell colSpan={5} className="h-24 text-center text-muted-foreground">{t("notes.noNotes")}</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
