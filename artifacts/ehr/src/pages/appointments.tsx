import { useState } from "react";
import {
  useListAppointments,
  useCreateAppointment,
  useUpdateAppointment,
  getListAppointmentsQueryKey,
  useListUnits,
  useListPatients,
  useListStaff,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "@/lib/i18n";
import { getUser } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Loader2, Save, Pencil, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type Appointment = {
  id: number;
  patientId: number;
  doctorId: number;
  patientName: string | null;
  doctorName: string | null;
  scheduledAt: string;
  type: string;
  status: string;
  chiefComplaint?: string | null;
  notes?: string | null;
  duration?: number | null;
};

const STATUS_OPTIONS = [
  "scheduled",
  "confirmed",
  "in-progress",
  "completed",
  "cancelled",
  "no-show",
];

const STATUS_CYCLE: Record<string, string> = {
  scheduled: "confirmed",
  confirmed: "in-progress",
  "in-progress": "completed",
};

const STATUS_BADGE: Record<string, "outline" | "secondary" | "default" | "destructive"> = {
  scheduled: "outline",
  confirmed: "secondary",
  "in-progress": "default",
  completed: "default",
  cancelled: "destructive",
  "no-show": "destructive",
};

const STATUS_COLOR_CLASS: Record<string, string> = {
  scheduled: "",
  confirmed: "border-blue-400 text-blue-600 dark:border-blue-500 dark:text-blue-400",
  "in-progress": "bg-amber-500 text-white border-amber-500",
  completed: "bg-green-600 text-white border-green-600",
  cancelled: "",
  "no-show": "",
};

const TYPE_OPTIONS = [
  "consultation",
  "follow-up",
  "emergency",
  "check-up",
  "procedure",
];

export default function Appointments() {
  const { t, isRtl } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const user = getUser();

  const [date, setDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [isNewOpen, setIsNewOpen] = useState(false);
  const [editAppt, setEditAppt] = useState<Appointment | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [cyclingId, setCyclingId] = useState<number | null>(null);

  const { data: appointments, isLoading } = useListAppointments({ date });
  const createMutation = useCreateAppointment();
  const updateMutation = useUpdateAppointment();

  const [selectedUnitId, setSelectedUnitId] = useState<string>("");
  const { data: units } = useListUnits();
  const { data: patientsData } = useListPatients({ limit: 500 });
  const { data: staffList } = useListStaff();
  const allPatients = patientsData?.patients ?? [];
  const unitPatients = selectedUnitId
    ? allPatients.filter((p) => p.unitId === Number(selectedUnitId))
    : [];
  const DOCTOR_ROLES = [
    "pediatric_consultant",
    "pediatric_specialist",
    "emergency_physician",
    "house_officer",
    "medical_officer",
  ];
  const doctors = (staffList ?? []).filter((s) => DOCTOR_ROLES.includes(s.role));

  const handleQuickStatus = (appt: Appointment) => {
    const next = STATUS_CYCLE[appt.status];
    if (!next || cyclingId !== null) return;
    setCyclingId(appt.id);
    updateMutation.mutate(
      { id: appt.id, data: { status: next } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListAppointmentsQueryKey() });
          toast({ title: t("generic.success"), description: `${appt.patientName ?? "Appointment"} → ${next}` });
        },
        onError: () =>
          toast({ variant: "destructive", title: t("generic.error"), description: t("generic.updateError") }),
        onSettled: () => setCyclingId(null),
      }
    );
  };

  const [form, setForm] = useState({
    patientId: "",
    doctorId: String(user?.id ?? "1"),
    scheduledAt: "",
    type: "consultation",
    chiefComplaint: "",
    notes: "",
    duration: "30",
  });

  const [editForm, setEditForm] = useState({
    scheduledAt: "",
    status: "",
    notes: "",
    duration: "",
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleEditChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setEditForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const openEdit = (appt: Appointment) => {
    setEditAppt(appt);
    const localDT = new Date(appt.scheduledAt);
    const pad = (n: number) => String(n).padStart(2, "0");
    const localStr = `${localDT.getFullYear()}-${pad(localDT.getMonth() + 1)}-${pad(localDT.getDate())}T${pad(localDT.getHours())}:${pad(localDT.getMinutes())}`;
    setEditForm({
      scheduledAt: localStr,
      status: appt.status,
      notes: appt.notes ?? "",
      duration: String(appt.duration ?? 30),
    });
    setIsEditOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.patientId) {
      toast({ variant: "destructive", title: t("generic.error"), description: t("appt.selectPatient") });
      return;
    }
    if (!form.doctorId) {
      toast({ variant: "destructive", title: t("generic.error"), description: t("appt.selectDoctor") });
      return;
    }
    createMutation.mutate(
      {
        data: {
          patientId: Number(form.patientId),
          doctorId: Number(form.doctorId),
          scheduledAt: form.scheduledAt,
          type: form.type,
          chiefComplaint: form.chiefComplaint || undefined,
          notes: form.notes || undefined,
          duration: Number(form.duration) || undefined,
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({
            queryKey: getListAppointmentsQueryKey(),
          });
          toast({
            title: t("generic.success"),
            description: t("generic.addSuccess"),
          });
          setIsNewOpen(false);
          setSelectedUnitId("");
          setForm({
            patientId: "",
            doctorId: String(user?.id ?? "1"),
            scheduledAt: "",
            type: "consultation",
            chiefComplaint: "",
            notes: "",
            duration: "30",
          });
        },
        onError: () =>
          toast({
            variant: "destructive",
            title: t("generic.error"),
            description: t("generic.addError"),
          }),
      }
    );
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editAppt) return;
    updateMutation.mutate(
      {
        id: editAppt.id,
        data: {
          scheduledAt: editForm.scheduledAt || undefined,
          status: editForm.status || undefined,
          notes: editForm.notes || undefined,
          duration: editForm.duration ? Number(editForm.duration) : undefined,
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({
            queryKey: getListAppointmentsQueryKey(),
          });
          toast({
            title: t("generic.success"),
            description: t("generic.updateSuccess"),
          });
          setIsEditOpen(false);
          setEditAppt(null);
        },
        onError: () =>
          toast({
            variant: "destructive",
            title: t("generic.error"),
            description: t("generic.updateError"),
          }),
      }
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold tracking-tight">
          {t("nav.appointments")}
        </h1>

        <Dialog open={isNewOpen} onOpenChange={(open) => { setIsNewOpen(open); if (!open) { setSelectedUnitId(""); setForm({ patientId: "", doctorId: String(user?.id ?? "1"), scheduledAt: "", type: "consultation", chiefComplaint: "", notes: "", duration: "30" }); } }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className={`${isRtl ? "ml-2" : "mr-2"} h-4 w-4`} />
              {t("appt.newAppointment")}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{t("appt.newAppointment")}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 py-2">
              {/* Ordered by banner */}
              <div className="flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-2 text-sm">
                <span className="text-muted-foreground">{t("appt.orderedBy")}:</span>
                <span className="font-medium">
                  {isRtl && user?.nameAr ? user.nameAr : user?.nameEn ?? user?.username ?? "—"}
                </span>
                <span className="ml-auto text-xs text-muted-foreground capitalize">
                  {user?.role?.replace(/_/g, " ")}
                </span>
              </div>
              <div className="space-y-3">
                <Label>{t("appt.filterByUnit")} *</Label>
                <Select
                  value={selectedUnitId}
                  onValueChange={(v) => {
                    setSelectedUnitId(v);
                    setForm((p) => ({ ...p, patientId: "" }));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("appt.selectUnit")} />
                  </SelectTrigger>
                  <SelectContent className="max-h-52 overflow-y-auto">
                    {(units ?? []).map((u) => (
                      <SelectItem key={u.id} value={String(u.id)}>
                        {isRtl && u.nameAr ? u.nameAr : u.nameEn}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-3">
                <Label>{t("generic.patient")} *</Label>
                <Select
                  value={form.patientId}
                  onValueChange={(v) => setForm((p) => ({ ...p, patientId: v }))}
                  disabled={!selectedUnitId}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        selectedUnitId
                          ? t("appt.selectPatient")
                          : t("appt.selectUnit")
                      }
                    />
                  </SelectTrigger>
                  <SelectContent className="max-h-60 overflow-y-auto">
                    {unitPatients.length === 0 ? (
                      <div className="px-3 py-4 text-sm text-muted-foreground text-center">
                        {t("appt.noPatients")}
                      </div>
                    ) : (
                      unitPatients.map((p) => (
                        <SelectItem key={p.id} value={String(p.id)}>
                          <span className="font-mono text-xs text-muted-foreground mr-2">
                            {p.mrn}
                          </span>
                          {isRtl && p.nameAr ? p.nameAr : p.nameEn}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-3">
                <Label>{t("appt.doctor")} *</Label>
                <Select
                  value={form.doctorId}
                  onValueChange={(v) => setForm((p) => ({ ...p, doctorId: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("appt.selectDoctor")} />
                  </SelectTrigger>
                  <SelectContent className="max-h-60 overflow-y-auto">
                    {doctors.length === 0 ? (
                      <div className="px-3 py-4 text-sm text-muted-foreground text-center">
                        {t("appt.noDoctors")}
                      </div>
                    ) : (
                      doctors.map((d) => (
                        <SelectItem key={d.id} value={String(d.id)}>
                          <span className="capitalize text-xs text-muted-foreground mr-2">
                            {d.role.replace(/_/g, " ")}
                          </span>
                          {isRtl && d.nameAr ? d.nameAr : d.nameEn}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                  <Label>{t("appt.dateTime")} *</Label>
                  <Input
                    name="scheduledAt"
                    type="datetime-local"
                    required
                    value={form.scheduledAt}
                    onChange={handleChange}
                  />
                </div>
                <div className="space-y-3">
                  <Label>{t("appt.duration")}</Label>
                  <Input
                    name="duration"
                    type="number"
                    value={form.duration}
                    onChange={handleChange}
                  />
                </div>
              </div>
              <div className="space-y-3">
                <Label>{t("generic.type")} *</Label>
                <Select
                  value={form.type}
                  onValueChange={(v) => setForm((p) => ({ ...p, type: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("appt.selectType")} />
                  </SelectTrigger>
                  <SelectContent>
                    {TYPE_OPTIONS.map((opt) => (
                      <SelectItem key={opt} value={opt}>
                        {t(`appt.${opt.replace("-", "")}` as keyof typeof t extends never ? string : string) || opt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-3">
                <Label>{t("appt.chiefComplaint")}</Label>
                <Input
                  name="chiefComplaint"
                  value={form.chiefComplaint}
                  onChange={handleChange}
                />
              </div>
              <div className="space-y-3">
                <Label>{t("generic.notes")}</Label>
                <Textarea
                  name="notes"
                  value={form.notes}
                  onChange={handleChange}
                  className="min-h-[80px]"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsNewOpen(false)}
                >
                  {t("generic.cancel")}
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save
                      className={`${isRtl ? "ml-2" : "mr-2"} h-4 w-4`}
                    />
                  )}
                  {t("generic.save")}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("generic.edit")} {t("nav.appointments").toLowerCase()}</DialogTitle>
          </DialogHeader>
          {editAppt && (
            <form onSubmit={handleEditSubmit} className="space-y-4 py-2">
              <div className="rounded-md bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
                <span className="font-medium">{editAppt.patientName}</span>
                {editAppt.chiefComplaint && (
                  <span className="ml-2">— {editAppt.chiefComplaint}</span>
                )}
              </div>

              <div className="space-y-3">
                <Label>{t("appt.dateTime")}</Label>
                <Input
                  name="scheduledAt"
                  type="datetime-local"
                  value={editForm.scheduledAt}
                  onChange={handleEditChange}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                  <Label>{t("generic.status")}</Label>
                  <Select
                    value={editForm.status}
                    onValueChange={(v) =>
                      setEditForm((p) => ({ ...p, status: v }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s.charAt(0).toUpperCase() + s.slice(1).replace("-", " ")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-3">
                  <Label>{t("appt.duration")}</Label>
                  <Input
                    name="duration"
                    type="number"
                    min="5"
                    value={editForm.duration}
                    onChange={handleEditChange}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <Label>{t("generic.notes")}</Label>
                <Textarea
                  name="notes"
                  value={editForm.notes}
                  onChange={handleEditChange}
                  className="min-h-[80px]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditOpen(false)}
                >
                  {t("generic.cancel")}
                </Button>
                <Button type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className={`${isRtl ? "ml-2" : "mr-2"} h-4 w-4`} />
                  )}
                  {t("generic.save")}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between p-4 border-b">
          <CardTitle className="text-lg">{t("appt.schedule")}</CardTitle>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="border rounded px-2 py-1 bg-transparent"
          />
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("appt.time")}</TableHead>
                <TableHead>{t("generic.patient")}</TableHead>
                <TableHead>{t("generic.doctor")}</TableHead>
                <TableHead>{t("generic.type")}</TableHead>
                <TableHead>{t("generic.status")}</TableHead>
                <TableHead className={isRtl ? "text-left" : "text-right"}>
                  {t("generic.actions")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
                  </TableCell>
                </TableRow>
              ) : appointments && appointments.length > 0 ? (
                (appointments as Appointment[]).map((appt) => (
                  <TableRow key={appt.id}>
                    <TableCell className="font-medium">
                      {new Date(appt.scheduledAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </TableCell>
                    <TableCell>{appt.patientName}</TableCell>
                    <TableCell>
                      {appt.doctorName ? `Dr. ${appt.doctorName}` : "—"}
                    </TableCell>
                    <TableCell className="capitalize">{appt.type}</TableCell>
                    <TableCell>
                      {STATUS_CYCLE[appt.status] ? (
                        <button
                          onClick={() => handleQuickStatus(appt as Appointment)}
                          disabled={cyclingId !== null}
                          className="group inline-flex items-center gap-1 focus:outline-none"
                          title={`Advance to ${STATUS_CYCLE[appt.status]}`}
                        >
                          <Badge
                            variant={STATUS_BADGE[appt.status] ?? "outline"}
                            className={`cursor-pointer transition-all group-hover:pr-1 ${STATUS_COLOR_CLASS[appt.status] ?? ""}`}
                          >
                            {cyclingId === appt.id ? (
                              <Loader2 className="h-3 w-3 animate-spin mr-1" />
                            ) : (
                              <ChevronRight className="h-3 w-3 mr-0.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                            )}
                            {appt.status}
                          </Badge>
                        </button>
                      ) : (
                        <Badge
                          variant={STATUS_BADGE[appt.status] ?? "outline"}
                          className={STATUS_COLOR_CLASS[appt.status] ?? ""}
                        >
                          {appt.status}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className={isRtl ? "text-left" : "text-right"}>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEdit(appt as Appointment)}
                      >
                        <Pencil className="h-4 w-4 mr-1" />
                        {t("generic.edit")}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="h-24 text-center text-muted-foreground"
                  >
                    {t("appt.noAppts")}
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
