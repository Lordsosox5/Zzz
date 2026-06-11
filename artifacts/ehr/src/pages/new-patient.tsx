import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useCreatePatient, getListPatientsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function NewPatient() {
  const { t, isRtl } = useTranslation();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const createMutation = useCreatePatient();

  const [formData, setFormData] = useState({
    nameEn: "",
    nameAr: "",
    dateOfBirth: "",
    gender: "male",
    bloodGroup: "",
    nationality: "",
    nationalId: "",
    phone: "",
    address: "",
    guardianName: "",
    guardianRelation: "parent",
    guardianPhone: "",
    allergies: ""
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(
      { data: formData },
      {
        onSuccess: (data) => {
          queryClient.invalidateQueries({ queryKey: getListPatientsQueryKey() });
          toast({
            title: t("patient.successTitle"),
            description: t("patient.successDesc"),
          });
          setLocation(`/patients/${data.id}`);
        },
        onError: () => {
          toast({
            variant: "destructive",
            title: t("patient.errorTitle"),
            description: t("patient.errorDesc"),
          });
        }
      }
    );
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/patients">
            <ArrowLeft className="h-4 w-4" style={{ transform: isRtl ? 'scaleX(-1)' : undefined }} />
          </Link>
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">{t("patient.registerNew")}</h1>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>{t("patient.personalInfo")}</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nameEn">{t("patient.fullNameEn")}</Label>
                <Input id="nameEn" name="nameEn" required value={formData.nameEn} onChange={handleChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nameAr">{t("patient.fullNameAr")}</Label>
                <Input id="nameAr" name="nameAr" dir="rtl" value={formData.nameAr} onChange={handleChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dateOfBirth">{t("patient.dateOfBirth")}</Label>
                <Input id="dateOfBirth" name="dateOfBirth" type="date" required value={formData.dateOfBirth} onChange={handleChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gender">{t("patient.genderLabel")}</Label>
                <Select value={formData.gender} onValueChange={(v) => handleSelectChange('gender', v)}>
                  <SelectTrigger id="gender">
                    <SelectValue placeholder={t("patient.selectGender")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">{t("patient.male")}</SelectItem>
                    <SelectItem value="female">{t("patient.female")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="nationalId">{t("patient.nationalId")}</Label>
                <Input id="nationalId" name="nationalId" value={formData.nationalId} onChange={handleChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nationality">{t("patient.nationality")}</Label>
                <Input id="nationality" name="nationality" value={formData.nationality} onChange={handleChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bloodGroup">{t("patient.bloodGroup")}</Label>
                <Select value={formData.bloodGroup} onValueChange={(v) => handleSelectChange('bloodGroup', v)}>
                  <SelectTrigger id="bloodGroup">
                    <SelectValue placeholder={t("patient.selectBloodGroup")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A+">A+</SelectItem>
                    <SelectItem value="A-">A-</SelectItem>
                    <SelectItem value="B+">B+</SelectItem>
                    <SelectItem value="B-">B-</SelectItem>
                    <SelectItem value="AB+">AB+</SelectItem>
                    <SelectItem value="AB-">AB-</SelectItem>
                    <SelectItem value="O+">O+</SelectItem>
                    <SelectItem value="O-">O-</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("patient.contactGuardian")}</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="address">{t("generic.address")}</Label>
                <Input id="address" name="address" value={formData.address} onChange={handleChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">{t("patient.homePhone")}</Label>
                <Input id="phone" name="phone" type="tel" value={formData.phone} onChange={handleChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="guardianName">{t("patient.guardianName")}</Label>
                <Input id="guardianName" name="guardianName" value={formData.guardianName} onChange={handleChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="guardianRelation">{t("patient.guardianRelation")}</Label>
                <Select value={formData.guardianRelation} onValueChange={(v) => handleSelectChange('guardianRelation', v)}>
                  <SelectTrigger id="guardianRelation">
                    <SelectValue placeholder={t("patient.selectRelation")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="parent">{t("patient.parent")}</SelectItem>
                    <SelectItem value="sibling">{t("patient.sibling")}</SelectItem>
                    <SelectItem value="other">{t("patient.other")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="guardianPhone">{t("patient.guardianPhone")}</Label>
                <Input id="guardianPhone" name="guardianPhone" type="tel" value={formData.guardianPhone} onChange={handleChange} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("patient.medicalAlerts")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="allergies">{t("patient.knownAllergies")}</Label>
                <Textarea
                  id="allergies"
                  name="allergies"
                  placeholder={t("patient.allergiesPlaceholder")}
                  value={formData.allergies}
                  onChange={handleChange}
                  className="min-h-[100px]"
                />
              </div>
            </CardContent>
            <CardFooter className="flex justify-end gap-2 border-t pt-6">
              <Button type="button" variant="outline" asChild>
                <Link href="/patients">{t("generic.cancel")}</Link>
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? <Loader2 className={`${isRtl ? 'ml-2' : 'mr-2'} h-4 w-4 animate-spin`} /> : <Save className={`${isRtl ? 'ml-2' : 'mr-2'} h-4 w-4`} />}
                {t("patient.registerButton")}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </form>
    </div>
  );
}
