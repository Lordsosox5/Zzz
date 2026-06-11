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

  // Generic
  "generic.search": { en: "Search...", ar: "بحث..." },
  "generic.save": { en: "Save", ar: "حفظ" },
  "generic.cancel": { en: "Cancel", ar: "إلغاء" },
  "generic.edit": { en: "Edit", ar: "تعديل" },
  "generic.delete": { en: "Delete", ar: "حذف" },
  "generic.new": { en: "New", ar: "جديد" },
  "generic.status": { en: "Status", ar: "الحالة" },
  "generic.date": { en: "Date", ar: "التاريخ" },
  
  // Settings
  "settings.language": { en: "Language", ar: "اللغة" },
  "settings.theme": { en: "Theme", ar: "المظهر" },
  "settings.dark": { en: "Dark", ar: "داكن" },
  "settings.light": { en: "Light", ar: "فاتح" },
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
      // Auto detect based on browser? default to en for now
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
