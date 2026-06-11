import React, { createContext, useContext, useEffect, useState } from "react";

type Language = "en" | "ar";

interface Translations {
  [key: string]: {
    en: string;
    ar: string;
  };
}

const translations: Translations = {
  // General
  "app.title": { en: "Almuzini Children Hospital", ar: "مستشفى المزيني للأطفال" },
  "app.subtitle": { en: "Pediatric EHR", ar: "نظام السجلات الطبية للأطفال" },
  "nav.dashboard": { en: "Dashboard", ar: "لوحة القيادة" },
  "nav.patients": { en: "Patients", ar: "المرضى" },
  "nav.appointments": { en: "Appointments", ar: "المواعيد" },
  "nav.notes": { en: "Clinical Notes", ar: "الملاحظات السريرية" },
  "nav.prescriptions": { en: "Prescriptions", ar: "الوصفات الطبية" },
  "nav.lab": { en: "Laboratory", ar: "المختبر" },
  "nav.radiology": { en: "Radiology", ar: "الأشعة" },
  "nav.pharmacy": { en: "Pharmacy", ar: "الصيدلية" },
  "nav.billing": { en: "Billing", ar: "الفواتير" },
  "nav.staff": { en: "Staff", ar: "الموظفين" },
  "nav.vaccinations": { en: "Vaccinations", ar: "التطعيمات" },
  "nav.growth": { en: "Growth", ar: "النمو" },
  "nav.settings": { en: "Settings", ar: "الإعدادات" },
  "nav.logout": { en: "Logout", ar: "تسجيل الخروج" },

  // Login
  "login.title": { en: "Sign In", ar: "تسجيل الدخول" },
  "login.username": { en: "Username", ar: "اسم المستخدم" },
  "login.password": { en: "Password", ar: "كلمة المرور" },
  "login.button": { en: "Login", ar: "دخول" },
  "login.error": { en: "Invalid credentials", ar: "بيانات الاعتماد غير صالحة" },

  // Dashboard
  "dash.totalPatients": { en: "Total Patients", ar: "إجمالي المرضى" },
  "dash.todayAppts": { en: "Today's Appointments", ar: "مواعيد اليوم" },
  "dash.activeAdmissions": { en: "Active Admissions", ar: "الدخول النشط" },
  "dash.pendingLabs": { en: "Pending Labs", ar: "المختبرات المعلقة" },
  "dash.revenue": { en: "Revenue", ar: "الإيرادات" },
  "dash.occupancy": { en: "Bed Occupancy", ar: "إشغال الأسرة" },
  "dash.alerts": { en: "Alerts", ar: "تنبيهات" },
  "dash.recentActivity": { en: "Recent Activity", ar: "النشاط الأخير" },
  "dash.patient": { en: "Patient", ar: "المريض" },
  "dash.noAlerts": { en: "No critical alerts at this time.", ar: "لا تنبيهات حرجة في الوقت الحالي." },
  "dash.noApptsToday": { en: "No appointments today.", ar: "لا مواعيد اليوم." },

  // Generic
  "generic.search": { en: "Search...", ar: "بحث..." },
  "generic.save": { en: "Save", ar: "حفظ" },
  "generic.cancel": { en: "Cancel", ar: "إلغاء" },
  "generic.edit": { en: "Edit", ar: "تعديل" },
  "generic.delete": { en: "Delete", ar: "حذف" },
  "generic.new": { en: "New", ar: "جديد" },
  "generic.status": { en: "Status", ar: "الحالة" },
  "generic.date": { en: "Date", ar: "التاريخ" },
  "generic.actions": { en: "Actions", ar: "إجراءات" },
  "generic.view": { en: "View", ar: "عرض" },
  "generic.name": { en: "Name", ar: "الاسم" },
  "generic.patient": { en: "Patient", ar: "المريض" },
  "generic.doctor": { en: "Doctor", ar: "الطبيب" },
  "generic.type": { en: "Type", ar: "النوع" },
  "generic.phone": { en: "Phone", ar: "الهاتف" },
  "generic.address": { en: "Address", ar: "العنوان" },
  "generic.category": { en: "Category", ar: "الفئة" },
  "generic.noData": { en: "No data found.", ar: "لا توجد بيانات." },

  // Settings
  "settings.language": { en: "Language", ar: "اللغة" },
  "settings.theme": { en: "Theme", ar: "المظهر" },
  "settings.dark": { en: "Dark", ar: "داكن" },
  "settings.light": { en: "Light", ar: "فاتح" },
  "settings.preferences": { en: "Preferences", ar: "التفضيلات" },
  "settings.changeLanguage": { en: "Change the application language", ar: "تغيير لغة التطبيق" },
  "settings.toggleTheme": { en: "Toggle between light and dark mode", ar: "التبديل بين الوضع الفاتح والداكن" },
  "settings.selectLanguage": { en: "Select Language", ar: "اختر اللغة" },

  // Patients list
  "patient.mrn": { en: "MRN", ar: "رقم السجل" },
  "patient.dob": { en: "DOB", ar: "تاريخ الميلاد" },
  "patient.gender": { en: "Gender", ar: "الجنس" },
  "patient.viewProfile": { en: "View Profile", ar: "عرض الملف" },
  "patient.notFound": { en: "No patients found.", ar: "لم يتم العثور على مرضى." },
  "patient.newPatient": { en: "New Patient", ar: "مريض جديد" },

  // New patient form
  "patient.registerNew": { en: "Register New Patient", ar: "تسجيل مريض جديد" },
  "patient.personalInfo": { en: "Personal Information", ar: "المعلومات الشخصية" },
  "patient.fullNameEn": { en: "Full Name (English) *", ar: "الاسم الكامل (إنجليزي) *" },
  "patient.fullNameAr": { en: "Full Name (Arabic)", ar: "الاسم الكامل (عربي)" },
  "patient.dateOfBirth": { en: "Date of Birth *", ar: "تاريخ الميلاد *" },
  "patient.genderLabel": { en: "Gender *", ar: "الجنس *" },
  "patient.male": { en: "Male", ar: "ذكر" },
  "patient.female": { en: "Female", ar: "أنثى" },
  "patient.nationalId": { en: "National ID", ar: "رقم الهوية الوطنية" },
  "patient.nationality": { en: "Nationality", ar: "الجنسية" },
  "patient.bloodGroup": { en: "Blood Group", ar: "فصيلة الدم" },
  "patient.selectGender": { en: "Select gender", ar: "اختر الجنس" },
  "patient.selectBloodGroup": { en: "Select blood group", ar: "اختر فصيلة الدم" },
  "patient.contactGuardian": { en: "Contact & Guardian", ar: "التواصل والولي" },
  "patient.homePhone": { en: "Patient/Home Phone", ar: "هاتف المريض / المنزل" },
  "patient.guardianName": { en: "Guardian Name", ar: "اسم الولي" },
  "patient.guardianRelation": { en: "Guardian Relation", ar: "صلة الولي" },
  "patient.guardianPhone": { en: "Guardian Phone", ar: "هاتف الولي" },
  "patient.selectRelation": { en: "Select relation", ar: "اختر الصلة" },
  "patient.parent": { en: "Parent", ar: "ولي أمر" },
  "patient.sibling": { en: "Sibling", ar: "أخ / أخت" },
  "patient.other": { en: "Other", ar: "أخرى" },
  "patient.medicalAlerts": { en: "Medical Alerts", ar: "التنبيهات الطبية" },
  "patient.knownAllergies": { en: "Known Allergies", ar: "الحساسيات المعروفة" },
  "patient.allergiesPlaceholder": { en: "List any known allergies or leave blank", ar: "اذكر الحساسيات المعروفة أو اتركها فارغة" },
  "patient.registerButton": { en: "Register Patient", ar: "تسجيل المريض" },
  "patient.successTitle": { en: "Success", ar: "تم بنجاح" },
  "patient.successDesc": { en: "Patient registered successfully", ar: "تم تسجيل المريض بنجاح" },
  "patient.errorTitle": { en: "Error", ar: "خطأ" },
  "patient.errorDesc": { en: "Failed to register patient", ar: "فشل تسجيل المريض" },

  // Patient details
  "patient.profile": { en: "Patient Profile", ar: "ملف المريض" },
  "patient.notFoundMsg": { en: "Patient not found", ar: "المريض غير موجود" },
  "patient.newAppointment": { en: "New Appointment", ar: "موعد جديد" },
  "patient.addNote": { en: "Add Note", ar: "إضافة ملاحظة" },
  "patient.overview": { en: "Overview", ar: "نظرة عامة" },
  "patient.clinicalNotes": { en: "Clinical Notes", ar: "الملاحظات السريرية" },
  "patient.labsRadiology": { en: "Labs & Radiology", ar: "المختبر والأشعة" },
  "patient.demographicsVitals": { en: "Demographics & Vitals", ar: "البيانات الديموغرافية والحيوية" },
  "patient.upcomingAppointments": { en: "Upcoming Appointments", ar: "المواعيد القادمة" },
  "patient.guardian": { en: "Guardian", ar: "الولي" },
  "patient.allergies": { en: "Allergies", ar: "الحساسيات" },
  "patient.noAllergies": { en: "No known allergies", ar: "لا حساسيات معروفة" },
  "patient.noUpcomingAppts": { en: "No upcoming appointments.", ar: "لا مواعيد قادمة." },
  "patient.withDoctor": { en: "with Dr.", ar: "مع الدكتور" },

  // Clinical Notes
  "notes.addNote": { en: "New Note", ar: "ملاحظة جديدة" },
  "notes.addClinicalNote": { en: "Add Clinical Note", ar: "إضافة ملاحظة سريرية" },
  "notes.patientId": { en: "Patient ID", ar: "رقم المريض" },
  "notes.enterPatientId": { en: "Enter patient ID", ar: "أدخل رقم المريض" },
  "notes.noteType": { en: "Note Type", ar: "نوع الملاحظة" },
  "notes.noteTypePlaceholder": { en: "e.g. SOAP, Progress, Discharge", ar: "مثال: SOAP، تقدم، خروج" },
  "notes.content": { en: "Content", ar: "المحتوى" },
  "notes.contentPlaceholder": { en: "Clinical documentation...", ar: "التوثيق السريري..." },
  "notes.recentNotes": { en: "Recent Notes", ar: "الملاحظات الأخيرة" },
  "notes.author": { en: "Author", ar: "الكاتب" },
  "notes.preview": { en: "Preview", ar: "معاينة" },
  "notes.noNotes": { en: "No notes found.", ar: "لم يتم العثور على ملاحظات." },

  // Appointments
  "appt.schedule": { en: "Schedule", ar: "الجدول الزمني" },
  "appt.time": { en: "Time", ar: "الوقت" },
  "appt.noAppts": { en: "No appointments for this date.", ar: "لا مواعيد لهذا اليوم." },
  "appt.newAppointment": { en: "New Appointment", ar: "موعد جديد" },

  // Prescriptions
  "rx.activePrescriptions": { en: "Active Prescriptions", ar: "الوصفات النشطة" },
  "rx.drug": { en: "Drug", ar: "الدواء" },
  "rx.dosage": { en: "Dosage", ar: "الجرعة" },
  "rx.noActive": { en: "No active prescriptions found.", ar: "لم يتم العثور على وصفات نشطة." },
  "rx.newPrescription": { en: "New Prescription", ar: "وصفة جديدة" },

  // Pharmacy
  "pharmacy.inventory": { en: "Drug Inventory", ar: "مخزون الأدوية" },
  "pharmacy.lowStock": { en: "Low Stock", ar: "مخزون منخفض" },
  "pharmacy.noInventory": { en: "No drugs found in inventory.", ar: "لم يتم العثور على أدوية في المخزون." },
  "pharmacy.newDrug": { en: "New Drug", ar: "دواء جديد" },

  // Lab
  "lab.pendingOrders": { en: "Pending Lab Orders", ar: "طلبات المختبر المعلقة" },
  "lab.noPending": { en: "No pending lab orders.", ar: "لا طلبات مختبر معلقة." },
  "lab.newOrder": { en: "New Order", ar: "طلب جديد" },

  // Radiology
  "radiology.orders": { en: "Radiology Orders", ar: "طلبات الأشعة" },
  "radiology.noOrders": { en: "No active radiology orders.", ar: "لا طلبات أشعة نشطة." },
  "radiology.newOrder": { en: "New Order", ar: "طلب جديد" },

  // Billing
  "billing.invoices": { en: "Invoices", ar: "الفواتير" },
  "billing.noInvoices": { en: "No invoices to display.", ar: "لا فواتير للعرض." },
  "billing.newInvoice": { en: "New Invoice", ar: "فاتورة جديدة" },

  // Staff
  "staff.directory": { en: "Staff Directory", ar: "دليل الموظفين" },
  "staff.empty": { en: "Staff directory is currently empty.", ar: "دليل الموظفين فارغ حالياً." },
  "staff.newMember": { en: "New Staff Member", ar: "موظف جديد" },

  // Vaccinations
  "vacc.registry": { en: "Vaccination Registry", ar: "سجل التطعيمات" },
  "vacc.selectPatient": { en: "Select a patient to view their vaccination history.", ar: "اختر مريضاً لعرض سجل التطعيمات." },

  // Growth
  "growth.charts": { en: "Growth Charts", ar: "مخططات النمو" },
  "growth.selectPatient": { en: "Select a patient to view their growth charts.", ar: "اختر مريضاً لعرض مخططات النمو." },
};

interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  isRtl: boolean;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>("en");

  useEffect(() => {
    const savedLang = localStorage.getItem("ehr_lang") as Language;
    if (savedLang && (savedLang === "en" || savedLang === "ar")) {
      setLanguageState(savedLang);
    } else {
      setLanguageState("en");
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem("ehr_lang", lang);
  };

  const isRtl = language === "ar";

  useEffect(() => {
    document.documentElement.dir = isRtl ? "rtl" : "ltr";
    document.documentElement.lang = language;
  }, [language, isRtl]);

  const t = (key: string): string => {
    const translation = translations[key];
    if (!translation) return key;
    return translation[language];
  };

  return (
    <I18nContext.Provider value={{ language, setLanguage, t, isRtl }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useTranslation() {
  const context = useContext(I18nContext);
  if (context === undefined) {
    throw new Error("useTranslation must be used within an I18nProvider");
  }
  return context;
}
