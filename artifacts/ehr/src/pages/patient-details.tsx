import { useRoute } from "wouter";
import { useGetPatientSummary, getGetPatientSummaryQueryKey } from "@workspace/api-client-react";
import { useTranslation } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { User, Calendar, Activity } from "lucide-react";
import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";

export default function PatientDetails({ params }: { params: { id: string } }) {
  const patientId = parseInt(params.id, 10);
  const { t, isRtl } = useTranslation();

  const { data: summary, isLoading } = useGetPatientSummary(patientId, {
    query: { enabled: !!patientId, queryKey: getGetPatientSummaryQueryKey(patientId) }
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-32" />
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <Skeleton className="h-16 w-16 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!summary?.patient) {
    return <div>{t("patient.notFoundMsg")}</div>;
  }

  const { patient } = summary;
  const name = isRtl && patient.nameAr ? patient.nameAr : patient.nameEn;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/patients">
            <ArrowLeft className="h-4 w-4" style={{ transform: isRtl ? 'scaleX(-1)' : undefined }} />
          </Link>
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">{t("patient.profile")}</h1>
      </div>

      <Card className="border-t-4 border-t-primary">
        <CardContent className="p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center text-primary border border-primary/20">
              <User className="h-8 w-8" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">{name}</h2>
              <div className="flex flex-wrap items-center gap-2 mt-1 text-sm text-muted-foreground">
                <span className="font-mono bg-muted px-1.5 py-0.5 rounded text-foreground">{t("patient.mrn")}: {patient.mrn}</span>
                <span>•</span>
                <span>{patient.gender === 'male' ? t("patient.male") : patient.gender === 'female' ? t("patient.female") : patient.gender}</span>
                <span>•</span>
                <span>{t("patient.dob")}: {new Date(patient.dateOfBirth).toLocaleDateString()}</span>
                {patient.bloodGroup && (
                  <>
                    <span>•</span>
                    <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">{patient.bloodGroup}</Badge>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button>{t("patient.newAppointment")}</Button>
            <Button variant="secondary">{t("patient.addNote")}</Button>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="w-full justify-start overflow-x-auto rounded-none border-b bg-transparent p-0">
          <TabsTrigger value="overview" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent">{t("patient.overview")}</TabsTrigger>
          <TabsTrigger value="notes" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent">{t("patient.clinicalNotes")}</TabsTrigger>
          <TabsTrigger value="prescriptions" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent">{t("nav.prescriptions")}</TabsTrigger>
          <TabsTrigger value="labs" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent">{t("patient.labsRadiology")}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Activity className="h-5 w-5 text-primary" /> {t("patient.demographicsVitals")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-y-4 text-sm">
                  <div>
                    <span className="text-muted-foreground block mb-1">{t("patient.guardian")}</span>
                    <span className="font-medium">{patient.guardianName || '-'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block mb-1">{t("generic.phone")}</span>
                    <span className="font-medium">{patient.phone || patient.guardianPhone || '-'}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-muted-foreground block mb-1">{t("patient.allergies")}</span>
                    {patient.allergies ? (
                      <Badge variant="destructive" className="mt-1">{patient.allergies}</Badge>
                    ) : (
                      <span className="text-muted-foreground italic">{t("patient.noAllergies")}</span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" /> {t("patient.upcomingAppointments")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {summary.upcomingAppointments && summary.upcomingAppointments.length > 0 ? (
                  <div className="space-y-4">
                    {summary.upcomingAppointments.map((appt) => (
                      <div key={appt.id} className="flex justify-between items-center border-b pb-2 last:border-0 last:pb-0">
                        <div>
                          <p className="font-medium">{new Date(appt.scheduledAt).toLocaleString()}</p>
                          <p className="text-sm text-muted-foreground">{appt.type} {t("patient.withDoctor")} {appt.doctorName}</p>
                        </div>
                        <Badge>{appt.status}</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">{t("patient.noUpcomingAppts")}</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="notes">
          <Card>
            <CardContent className="p-6">
              <p className="text-muted-foreground">{t("patient.clinicalNotes")}</p>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="prescriptions">
          <Card>
            <CardContent className="p-6">
              <p className="text-muted-foreground">{t("nav.prescriptions")}</p>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="labs">
          <Card>
            <CardContent className="p-6">
              <p className="text-muted-foreground">{t("patient.labsRadiology")}</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
