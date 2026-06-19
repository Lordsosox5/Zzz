export interface Authority {
  en: string;
  ar: string;
}

export interface RoleDefinition {
  label: { en: string; ar: string };
  description: { en: string; ar: string };
  badgeClass: string;
  authorities: Authority[];
  allowedNav: string[] | "all";
}

export const ROLE_DEFINITIONS: Record<string, RoleDefinition> = {
  admin: {
    label: { en: "System Administrator", ar: "مدير النظام" },
    description: { en: "Full access to all system modules and configuration", ar: "وصول كامل لجميع وحدات النظام والإعدادات" },
    badgeClass: "bg-purple-100 text-purple-800 border border-purple-200 dark:bg-purple-900/30 dark:text-purple-300",
    authorities: [
      { en: "Manage all patient records (read/write)", ar: "إدارة جميع سجلات المرضى (قراءة/كتابة)" },
      { en: "Manage staff accounts and roles", ar: "إدارة حسابات الموظفين وأدوارهم" },
      { en: "Access billing and financial reports", ar: "الوصول للفواتير والتقارير المالية" },
      { en: "View and enter lab & radiology results", ar: "عرض وإدخال نتائج المختبر والأشعة" },
      { en: "Manage pharmacy inventory", ar: "إدارة مخزون الصيدلية" },
      { en: "System settings and configuration", ar: "إعدادات وتهيئة النظام" },
      { en: "Access all clinical notes and prescriptions", ar: "الوصول لجميع الملاحظات السريرية والوصفات" },
    ],
    allowedNav: "all",
  },
  consultant: {
    label: { en: "Consultant Physician", ar: "طبيب استشاري" },
    description: { en: "Full clinical access including prescriptions, notes, and test ordering", ar: "وصول سريري كامل شامل الوصفات والملاحظات وطلب الفحوصات" },
    badgeClass: "bg-blue-100 text-blue-800 border border-blue-200 dark:bg-blue-900/30 dark:text-blue-300",
    authorities: [
      { en: "View and manage patient records", ar: "عرض وإدارة سجلات المرضى" },
      { en: "Write clinical notes and diagnoses", ar: "كتابة الملاحظات السريرية والتشخيصات" },
      { en: "Prescribe medications", ar: "وصف الأدوية" },
      { en: "Order lab and radiology tests", ar: "طلب فحوصات المختبر والأشعة" },
      { en: "View lab results for their patients", ar: "عرض نتائج المختبر لمرضاهم" },
      { en: "Manage appointments", ar: "إدارة المواعيد" },
      { en: "Record vaccinations and growth data", ar: "تسجيل التطعيمات وبيانات النمو" },
    ],
    allowedNav: ["/dashboard", "/patients", "/appointments", "/clinical-notes", "/prescriptions", "/lab", "/radiology", "/vaccinations", "/growth"],
  },
  specialist: {
    label: { en: "Medical Specialist", ar: "أخصائي طبي" },
    description: { en: "Clinical access for specialist consultations and treatment", ar: "وصول سريري للاستشارات المتخصصة والعلاج" },
    badgeClass: "bg-cyan-100 text-cyan-800 border border-cyan-200 dark:bg-cyan-900/30 dark:text-cyan-300",
    authorities: [
      { en: "View and manage patient records", ar: "عرض وإدارة سجلات المرضى" },
      { en: "Write clinical notes and consultations", ar: "كتابة الملاحظات السريرية والاستشارات" },
      { en: "Prescribe medications", ar: "وصف الأدوية" },
      { en: "Order lab and radiology tests", ar: "طلب فحوصات المختبر والأشعة" },
      { en: "View lab results for their patients", ar: "عرض نتائج المختبر لمرضاهم" },
      { en: "Manage appointments", ar: "إدارة المواعيد" },
    ],
    allowedNav: ["/dashboard", "/patients", "/appointments", "/clinical-notes", "/prescriptions", "/lab", "/radiology"],
  },
  nurse: {
    label: { en: "Nursing Staff", ar: "الكوادر التمريضية" },
    description: { en: "Patient care, vitals recording, vaccinations and growth monitoring", ar: "رعاية المرضى وتسجيل العلامات الحيوية والتطعيمات ومتابعة النمو" },
    badgeClass: "bg-green-100 text-green-800 border border-green-200 dark:bg-green-900/30 dark:text-green-300",
    authorities: [
      { en: "View patient records (read-only)", ar: "عرض سجلات المرضى (للقراءة فقط)" },
      { en: "Record vital signs and growth measurements", ar: "تسجيل العلامات الحيوية وقياسات النمو" },
      { en: "Administer and record vaccinations", ar: "إعطاء وتسجيل التطعيمات" },
      { en: "Assist with appointments scheduling", ar: "المساعدة في جدولة المواعيد" },
      { en: "View upcoming appointments", ar: "عرض المواعيد القادمة" },
    ],
    allowedNav: ["/dashboard", "/patients", "/appointments", "/vaccinations", "/growth"],
  },
  pharmacist: {
    label: { en: "Pharmacist", ar: "صيدلاني" },
    description: { en: "Pharmacy inventory management and prescription dispensing", ar: "إدارة مخزون الصيدلية وصرف الوصفات الطبية" },
    badgeClass: "bg-orange-100 text-orange-800 border border-orange-200 dark:bg-orange-900/30 dark:text-orange-300",
    authorities: [
      { en: "Manage drug inventory (add/update)", ar: "إدارة مخزون الأدوية (إضافة/تحديث)" },
      { en: "View and dispense prescriptions", ar: "عرض وصرف الوصفات الطبية" },
      { en: "Update stock levels and expiry dates", ar: "تحديث مستويات المخزون وتواريخ الانتهاء" },
      { en: "Flag low-stock medications", ar: "تحديد الأدوية منخفضة المخزون" },
    ],
    allowedNav: ["/dashboard", "/pharmacy", "/prescriptions"],
  },
  lab_specialist: {
    label: { en: "Laboratory Specialist", ar: "أخصائي مختبر" },
    description: { en: "Lab test processing, result entry, critical value flagging and reporting", ar: "معالجة الفحوصات المخبرية وإدخال النتائج وتحديد القيم الحرجة وإعداد التقارير" },
    badgeClass: "bg-yellow-100 text-yellow-800 border border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300",
    authorities: [
      { en: "View all lab orders from any physician", ar: "عرض جميع طلبات المختبر من أي طبيب" },
      { en: "Mark samples as collected", ar: "تحديد العينات على أنها مجمعة" },
      { en: "Enter and validate lab test results", ar: "إدخال والتحقق من نتائج الفحوصات المخبرية" },
      { en: "Flag critical / abnormal results", ar: "تحديد النتائج الحرجة أو غير الطبيعية" },
      { en: "Enter reference ranges and units", ar: "إدخال النطاقات الطبيعية والوحدات" },
      { en: "View patient demographics (read-only)", ar: "عرض بيانات المريض (للقراءة فقط)" },
      { en: "Generate and export lab reports", ar: "إنشاء وتصدير تقارير المختبر" },
    ],
    allowedNav: ["/dashboard", "/lab"],
  },
  lab_technician: {
    label: { en: "Lab Technician", ar: "فني مختبر" },
    description: { en: "Process lab requests, enter test results, and track payment status", ar: "معالجة طلبات المختبر وإدخال نتائج الفحوصات ومتابعة حالة الدفع" },
    badgeClass: "bg-yellow-100 text-yellow-800 border border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300",
    authorities: [
      { en: "View all pending lab orders", ar: "عرض جميع طلبات المختبر المعلقة" },
      { en: "Check payment status of lab requests", ar: "التحقق من حالة الدفع لطلبات المختبر" },
      { en: "Enter and submit test result values", ar: "إدخال وتسليم قيم نتائج الفحوصات" },
      { en: "Flag critical / abnormal results", ar: "تحديد النتائج الحرجة أو غير الطبيعية" },
    ],
    allowedNav: ["/dashboard", "/lab"],
  },
  house_officer: {
    label: { en: "House Officer", ar: "طبيب مقيم" },
    description: { en: "Junior doctor providing inpatient and emergency care under supervision", ar: "طبيب مقيم يقدم رعاية للمرضى الداخليين وطوارئ تحت الإشراف" },
    badgeClass: "bg-teal-100 text-teal-800 border border-teal-200 dark:bg-teal-900/30 dark:text-teal-300",
    authorities: [
      { en: "View and update patient records under supervision", ar: "عرض وتحديث سجلات المرضى تحت الإشراف" },
      { en: "Write clinical notes and progress reports", ar: "كتابة الملاحظات السريرية وتقارير التقدم" },
      { en: "Order lab and radiology tests", ar: "طلب فحوصات المختبر والأشعة" },
      { en: "Prescribe medications under consultant approval", ar: "وصف الأدوية بموافقة الاستشاري" },
      { en: "Manage appointments and admissions", ar: "إدارة المواعيد والدخول" },
      { en: "Respond to on-call and emergency requests", ar: "الرد على النداءات والحالات الطارئة" },
    ],
    allowedNav: ["/dashboard", "/patients", "/appointments", "/clinical-notes", "/prescriptions", "/lab", "/radiology", "/units"],
  },
  medical_officer: {
    label: { en: "Medical Officer", ar: "ضابط طبي" },
    description: { en: "Experienced medical officer managing general clinical duties", ar: "ضابط طبي متمرس يدير الواجبات السريرية العامة" },
    badgeClass: "bg-indigo-100 text-indigo-800 border border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300",
    authorities: [
      { en: "Full patient record access and management", ar: "وصول كامل لسجلات المرضى وإدارتها" },
      { en: "Write clinical notes, diagnoses and referrals", ar: "كتابة الملاحظات السريرية والتشخيصات والإحالات" },
      { en: "Prescribe medications independently", ar: "وصف الأدوية بشكل مستقل" },
      { en: "Order and review lab and radiology tests", ar: "طلب ومراجعة فحوصات المختبر والأشعة" },
      { en: "Manage unit admissions and discharges", ar: "إدارة دخول وخروج مرضى الوحدة" },
      { en: "Supervise house officers", ar: "الإشراف على الأطباء المقيمين" },
    ],
    allowedNav: ["/dashboard", "/patients", "/appointments", "/clinical-notes", "/prescriptions", "/lab", "/radiology", "/vaccinations", "/growth", "/units"],
  },
  registrar: {
    label: { en: "Registrar", ar: "طبيب تخصصي" },
    description: { en: "Specialist-in-training managing ward patients and specialist clinics under consultant oversight", ar: "طبيب في التدريب التخصصي يدير مرضى الجناح والعيادات المتخصصة تحت إشراف الاستشاري" },
    badgeClass: "bg-rose-100 text-rose-800 border border-rose-200 dark:bg-rose-900/30 dark:text-rose-300",
    authorities: [
      { en: "View and manage patient records in assigned unit", ar: "عرض وإدارة سجلات المرضى في الوحدة المعينة" },
      { en: "Write clinical notes, progress notes and discharge summaries", ar: "كتابة الملاحظات السريرية وملاحظات التقدم وملخصات الخروج" },
      { en: "Prescribe medications within consultant-approved protocols", ar: "وصف الأدوية ضمن البروتوكولات المعتمدة من الاستشاري" },
      { en: "Order and review lab and radiology investigations", ar: "طلب ومراجعة الفحوصات المخبرية والأشعة" },
      { en: "Perform ward rounds and patient assessments", ar: "إجراء جولات الجناح وتقييم المرضى" },
      { en: "Manage on-call admissions under supervision", ar: "إدارة دخول مرضى النداء تحت الإشراف" },
      { en: "Supervise and teach house officers", ar: "الإشراف على الأطباء المقيمين وتدريبهم" },
      { en: "Participate in specialist outpatient clinics", ar: "المشاركة في العيادات الخارجية المتخصصة" },
    ],
    allowedNav: ["/dashboard", "/patients", "/appointments", "/clinical-notes", "/prescriptions", "/lab", "/radiology", "/vaccinations", "/growth", "/units"],
  },
};

export type PatientTab = "overview" | "notes" | "prescriptions" | "labs";

const PATIENT_TAB_ACCESS: Record<string, PatientTab[]> = {
  admin:          ["overview", "notes", "prescriptions", "labs"],
  consultant:     ["overview", "notes", "prescriptions", "labs"],
  specialist:     ["overview", "notes", "prescriptions", "labs"],
  doctor:         ["overview", "notes", "prescriptions", "labs"],
  nurse:          ["overview"],
  pharmacist:     ["overview", "prescriptions"],
  lab_specialist: ["labs"],
  lab_technician: ["labs"],
  billing:        ["overview"],
};

export function isLabRole(role: string): boolean {
  return ["lab_specialist", "lab_technician"].includes(role);
}

export function getAllowedPatientTabs(role: string): PatientTab[] {
  return PATIENT_TAB_ACCESS[role] ?? ["overview"];
}

export function canEnterLabResults(role: string): boolean {
  return ["admin", "lab_specialist", "lab_technician"].includes(role);
}

export function canWriteClinicalNotes(role: string): boolean {
  return ["admin", "consultant", "specialist", "house_officer", "medical_officer", "registrar"].includes(role);
}

export function canPrescribe(role: string): boolean {
  return ["admin", "consultant", "specialist", "house_officer", "medical_officer", "registrar"].includes(role);
}

export function canDispensePrescription(role: string): boolean {
  return ["admin", "pharmacist"].includes(role);
}

export function canManagePharmacyInventory(role: string): boolean {
  return ["admin", "pharmacist"].includes(role);
}

export function canRecordVitals(role: string): boolean {
  return ["admin", "nurse", "consultant", "specialist", "house_officer", "medical_officer"].includes(role);
}

export function canAdmitNewPatient(role: string): boolean {
  return ["admin", "consultant", "specialist", "nurse", "house_officer", "medical_officer"].includes(role);
}

export function canManageUnits(role: string): boolean {
  return ["admin"].includes(role);
}

export function getNavForRole(role: string): string[] | "all" {
  return ROLE_DEFINITIONS[role]?.allowedNav ?? "all";
}

export function getRoleLabel(role: string, lang: "en" | "ar"): string {
  return ROLE_DEFINITIONS[role]?.label[lang] ?? role;
}
