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
  "generic.back": { en: "Back", ar: "السابق" },
  "generic.next": { en: "Next", ar: "التالي" },
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
  "patient.contactGuardian": { en: "Contact & Guardian", ar: "التواصل والوالد/ة" },
  "patient.homePhone": { en: "Patient/Home Phone", ar: "هاتف المريض / المنزل" },
  "patient.guardianName": { en: "Guardian Name", ar: "اسم الوالد/ة" },
  "patient.guardianRelation": { en: "Guardian Relation", ar: "صلة الوالد/ة" },
  "patient.guardianPhone": { en: "Guardian Phone", ar: "هاتف الوالد/ة" },
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
  "patient.guardian": { en: "Guardian", ar: "الوالد/ة" },
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
  "growth.newRecord": { en: "New Record", ar: "قياس جديد" },
  "growth.addRecord": { en: "Add Growth Record", ar: "إضافة قياس نمو" },
  "growth.patientId": { en: "Patient ID", ar: "رقم المريض" },
  "growth.measurementDate": { en: "Measurement Date", ar: "تاريخ القياس" },
  "growth.weight": { en: "Weight (kg)", ar: "الوزن (كجم)" },
  "growth.height": { en: "Height (cm)", ar: "الطول (سم)" },
  "growth.headCirc": { en: "Head Circumference (cm)", ar: "محيط الرأس (سم)" },
  "growth.noRecords": { en: "No growth records found.", ar: "لا توجد سجلات نمو." },
  "growth.date": { en: "Date", ar: "التاريخ" },
  "growth.bmi": { en: "BMI", ar: "مؤشر كتلة الجسم" },

  // Generic extras
  "generic.priority": { en: "Priority", ar: "الأولوية" },
  "generic.notes": { en: "Notes", ar: "الملاحظات" },
  "generic.success": { en: "Success", ar: "تم بنجاح" },
  "generic.error": { en: "Error", ar: "خطأ" },
  "generic.addSuccess": { en: "Added successfully", ar: "تمت الإضافة بنجاح" },
  "generic.addError": { en: "Failed to add record", ar: "فشل إضافة السجل" },
  "generic.patientId": { en: "Patient ID", ar: "رقم المريض" },
  "generic.result": { en: "Result", ar: "النتيجة" },
  "generic.email": { en: "Email", ar: "البريد الإلكتروني" },
  "generic.department": { en: "Department", ar: "القسم" },
  "generic.role": { en: "Role", ar: "الدور" },
  "generic.quantity": { en: "Quantity", ar: "الكمية" },
  "generic.description": { en: "Description", ar: "الوصف" },
  "generic.total": { en: "Total", ar: "الإجمالي" },
  "generic.selectPriority": { en: "Select priority", ar: "اختر الأولوية" },
  "generic.routine": { en: "Routine", ar: "روتيني" },
  "generic.urgent": { en: "Urgent", ar: "عاجل" },
  "generic.stat": { en: "STAT", ar: "فوري" },

  // Appointments dialog
  "appt.doctorId": { en: "Doctor ID", ar: "رقم الطبيب" },
  "appt.dateTime": { en: "Date & Time", ar: "التاريخ والوقت" },
  "appt.chiefComplaint": { en: "Chief Complaint", ar: "الشكوى الرئيسية" },
  "appt.duration": { en: "Duration (min)", ar: "المدة (دقيقة)" },
  "appt.selectType": { en: "Select type", ar: "اختر النوع" },
  "appt.followUp": { en: "Follow-up", ar: "متابعة" },
  "appt.consultation": { en: "Consultation", ar: "استشارة" },
  "appt.emergency": { en: "Emergency", ar: "طارئ" },
  "appt.checkup": { en: "Check-up", ar: "فحص دوري" },
  "appt.procedure": { en: "Procedure", ar: "إجراء طبي" },

  // Prescriptions dialog
  "rx.patientId": { en: "Patient ID", ar: "رقم المريض" },
  "rx.drugName": { en: "Drug Name", ar: "اسم الدواء" },
  "rx.frequency": { en: "Frequency", ar: "التكرار" },
  "rx.duration": { en: "Duration", ar: "مدة العلاج" },
  "rx.route": { en: "Route", ar: "طريقة الإعطاء" },
  "rx.instructions": { en: "Instructions", ar: "التعليمات" },

  // Lab dialog
  "lab.testName": { en: "Test Name", ar: "اسم الفحص" },
  "lab.testCode": { en: "Test Code", ar: "رمز الفحص" },
  "lab.orderedBy": { en: "Ordered By", ar: "أمر بـ" },
  "lab.noOrders": { en: "No lab orders found.", ar: "لا توجد طلبات مختبر." },

  // Radiology dialog
  "radiology.modality": { en: "Modality", ar: "طريقة التصوير" },
  "radiology.studyDesc": { en: "Study Description", ar: "وصف الدراسة" },
  "radiology.xray": { en: "X-Ray", ar: "أشعة سينية" },
  "radiology.ct": { en: "CT Scan", ar: "أشعة مقطعية" },
  "radiology.mri": { en: "MRI", ar: "رنين مغناطيسي" },
  "radiology.ultrasound": { en: "Ultrasound", ar: "موجات صوتية" },
  "radiology.noOrders": { en: "No radiology orders found.", ar: "لا توجد طلبات أشعة." },

  // Pharmacy dialog
  "pharmacy.drugName": { en: "Drug Name", ar: "اسم الدواء" },
  "pharmacy.genericName": { en: "Generic Name", ar: "الاسم العام" },
  "pharmacy.stockQty": { en: "Stock Quantity", ar: "كمية المخزون" },
  "pharmacy.minStock": { en: "Min Stock Level", ar: "الحد الأدنى للمخزون" },
  "pharmacy.unit": { en: "Unit", ar: "الوحدة" },
  "pharmacy.unitPrice": { en: "Unit Price", ar: "سعر الوحدة" },

  // Billing dialog
  "billing.patientId": { en: "Patient ID", ar: "رقم المريض" },
  "billing.paymentMethod": { en: "Payment Method", ar: "طريقة الدفع" },
  "billing.cash": { en: "Cash", ar: "نقد" },
  "billing.card": { en: "Card", ar: "بطاقة" },
  "billing.insurance": { en: "Insurance", ar: "تأمين" },
  "billing.selectPayment": { en: "Select payment method", ar: "اختر طريقة الدفع" },
  "billing.itemDescription": { en: "Item Description", ar: "وصف البند" },
  "billing.unitPrice": { en: "Unit Price", ar: "سعر الوحدة" },
  "billing.patient": { en: "Patient", ar: "المريض" },
  "billing.amount": { en: "Amount", ar: "المبلغ" },
  "billing.method": { en: "Method", ar: "طريقة الدفع" },
  "billing.noInvoicesFound": { en: "No invoices found.", ar: "لا توجد فواتير." },

  // Staff dialog
  "staff.nameEn": { en: "Full Name (English)", ar: "الاسم الكامل (إنجليزي)" },
  "staff.nameAr": { en: "Full Name (Arabic)", ar: "الاسم الكامل (عربي)" },
  "staff.selectRole": { en: "Select role", ar: "اختر الدور" },
  "staff.consultant": { en: "Consultant", ar: "استشاري" },
  "staff.specialist": { en: "Specialist", ar: "أخصائي" },
  "staff.nurse": { en: "Nurse", ar: "ممرض/ة" },
  "staff.pharmacist": { en: "Pharmacist", ar: "صيدلاني" },
  "staff.admin": { en: "Admin", ar: "مدير نظام" },
  "staff.noStaff": { en: "No staff members found.", ar: "لا يوجد موظفون." },

  // Vaccinations dialog
  "vacc.newRecord": { en: "Record Vaccination", ar: "تسجيل تطعيم" },
  "vacc.vaccineName": { en: "Vaccine Name", ar: "اسم اللقاح" },
  "vacc.doseNumber": { en: "Dose #", ar: "رقم الجرعة" },
  "vacc.administeredDate": { en: "Date Given", ar: "تاريخ التطعيم" },
  "vacc.nextDueDate": { en: "Next Due Date", ar: "تاريخ الجرعة التالية" },
  "vacc.batchNumber": { en: "Batch #", ar: "رقم الدفعة" },
  "vacc.noRecords": { en: "No vaccination records found.", ar: "لا توجد سجلات تطعيم." },
  "vacc.vaccine": { en: "Vaccine", ar: "اللقاح" },
  "vacc.dose": { en: "Dose", ar: "الجرعة" },
  "vacc.given": { en: "Date Given", ar: "تاريخ التطعيم" },
  "vacc.nextDue": { en: "Next Due", ar: "الجرعة التالية" },

  // Lab result entry
  "lab.enterResult": { en: "Enter Result", ar: "إدخال نتيجة" },
  "lab.resultValue": { en: "Result Value", ar: "قيمة النتيجة" },
  "lab.unit": { en: "Unit", ar: "الوحدة" },
  "lab.referenceRange": { en: "Reference Range", ar: "النطاق الطبيعي" },
  "lab.isCritical": { en: "Critical Result", ar: "نتيجة حرجة" },
  "lab.resultedAt": { en: "Result Date & Time", ar: "تاريخ ووقت النتيجة" },
  "lab.updateResult": { en: "Submit Result", ar: "تسليم النتيجة" },
  "lab.normal": { en: "Normal", ar: "طبيعي" },
  "lab.abnormal": { en: "Abnormal", ar: "غير طبيعي" },
  "lab.critical": { en: "Critical", ar: "حرج" },
  "lab.pending": { en: "Pending", ar: "معلق" },
  "lab.resulted": { en: "Resulted", ar: "لها نتيجة" },
  "lab.collected": { en: "Collected", ar: "تم الجمع" },
  "lab.orderedOn": { en: "Ordered On", ar: "تاريخ الطلب" },
  "lab.noLabOrders": { en: "No lab orders for this patient.", ar: "لا توجد طلبات مختبر لهذا المريض." },
  "lab.noRadOrders": { en: "No radiology orders for this patient.", ar: "لا توجد طلبات أشعة لهذا المريض." },
  "lab.report": { en: "Report", ar: "التقرير" },

  // Patient detail tabs
  "patient.labResults": { en: "Lab Results", ar: "نتائج المختبر" },
  "patient.radiologyOrders": { en: "Radiology Orders", ar: "طلبات الأشعة" },

  // Section 1 — New patient demographics extras
  "patient.weight": { en: "Weight (kg)", ar: "الوزن (كغ)" },
  "patient.height": { en: "Height (cm)", ar: "الطول (سم)" },
  "patient.residence": { en: "Residence", ar: "مكان الإقامة" },
  "patient.admissionDate": { en: "Date of Admission", ar: "تاريخ الدخول" },
  "patient.dischargeDate": { en: "Date of Discharge", ar: "تاريخ الخروج" },
  "patient.age": { en: "Age", ar: "العمر" },

  // Admission form sections
  "admit.newPatientTitle": { en: "New Patient Admission", ar: "قبول مريض جديد" },
  "admit.section1": { en: "Section 1 — Patient Demographics", ar: "القسم ١ — بيانات المريض" },
  "admit.section2": { en: "Section 2 — Patient History", ar: "القسم ٢ — التاريخ المرضي" },
  "admit.section3": { en: "Section 3 — On Examination", ar: "القسم ٣ — عند الفحص" },
  "admit.section4": { en: "Section 4 — Investigations & Management", ar: "القسم ٤ — الفحوصات والخطة العلاجية" },
  "admit.section5": { en: "Section 5 — Follow-up & Discharge", ar: "القسم ٥ — المتابعة والخروج" },
  "admit.sectionOptional": { en: "All fields in this section are optional and can be filled later.", ar: "جميع حقول هذا القسم اختيارية ويمكن تعبئتها لاحقاً." },
  "admit.registerAndSave": { en: "Register Patient & Save", ar: "تسجيل المريض وحفظ" },

  // History fields
  "admit.mainComplaint": { en: "Main Complaint", ar: "الشكوى الرئيسية" },
  "admit.analysisTitle": { en: "Analysis of Main Complaint", ar: "تحليل الشكوى الرئيسية" },
  "admit.site": { en: "Site", ar: "الموقع" },
  "admit.onset": { en: "Onset", ar: "البداية" },
  "admit.character": { en: "Character", ar: "الطابع" },
  "admit.radiation": { en: "Radiation", ar: "الانتشار" },
  "admit.aggravation": { en: "Aggravating Factors", ar: "عوامل التفاقم" },
  "admit.relieving": { en: "Relieving Factors", ar: "عوامل التحسن" },
  "admit.associations": { en: "Associations", ar: "المرتبطات" },
  "admit.systemicReview": { en: "Systemic Review", ar: "المراجعة المنظومية" },
  "admit.pastMedicalHistory": { en: "Past Medical History", ar: "التاريخ الطبي السابق" },
  "admit.familyHistory": { en: "Family History", ar: "التاريخ العائلي" },
  "admit.drugHistory": { en: "Drug History", ar: "تاريخ الأدوية" },
  "admit.socialHistory": { en: "Social History", ar: "التاريخ الاجتماعي" },
  "admit.developmentalHistory": { en: "Developmental History", ar: "التاريخ التطوري" },
  "admit.summary": { en: "Summary", ar: "الملخص" },
  "admit.provisionalDiagnosis": { en: "Provisional Diagnosis", ar: "التشخيص المبدئي" },

  // Examination fields
  "admit.examinationSummary": { en: "General Examination Summary", ar: "ملخص الفحص العام" },
  "admit.systemsTitle": { en: "Examination by System", ar: "الفحص بحسب الجهاز" },
  "admit.chestExam": { en: "Chest Examination", ar: "فحص الصدر" },
  "admit.cnsExam": { en: "CNS Examination", ar: "فحص الجهاز العصبي" },
  "admit.abdomenExam": { en: "Abdomen Examination", ar: "فحص البطن" },
  "admit.vitalsTitle": { en: "Vital Signs", ar: "العلامات الحيوية" },
  "admit.bp": { en: "Blood Pressure (BP)", ar: "ضغط الدم" },
  "admit.pr": { en: "Pulse Rate (PR)", ar: "معدل النبض" },
  "admit.rr": { en: "Respiratory Rate (RR)", ar: "معدل التنفس" },
  "admit.gcs": { en: "GCS Score", ar: "مقياس غلاسكو" },
  "admit.rbg": { en: "Random Blood Glucose (RBG)", ar: "سكر الدم العشوائي" },

  // Investigations & plan
  "admit.investigationsOrdered": { en: "Investigations Ordered", ar: "الفحوصات المطلوبة" },
  "admit.managementPlan": { en: "Plan of Management", ar: "خطة العلاج" },

  // Follow-up & discharge
  "admit.morningFollowUp": { en: "Morning Follow-up", ar: "متابعة الصباح" },
  "admit.eveningFollowUp": { en: "Evening Follow-up", ar: "متابعة المساء" },
  "admit.dischargeLetter": { en: "Discharge / Referral Letter", ar: "رسالة الخروج أو التحويل" },

  // Staff role authorities
  "staff.roleAuthorities": { en: "Role Authorities", ar: "صلاحيات الدور" },
  "staff.labSpecialist": { en: "Laboratory Specialist", ar: "أخصائي مختبر" },
  "staff.permissions": { en: "Permissions", ar: "الصلاحيات" },
  "staff.roleCapabilities": { en: "Capabilities of each role", ar: "قدرات كل دور" },
  "staff.allowedModules": { en: "Allowed Modules", ar: "الوحدات المسموح بها" },
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
