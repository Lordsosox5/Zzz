export type FieldType = "number" | "text" | "select";

export interface ResultField {
  key: string;
  label: string;
  unit?: string;
  refRange?: string;
  refMin?: number;
  refMax?: number;
  criticalLow?: number;
  criticalHigh?: number;
  type: FieldType;
  options?: string[];
  required?: boolean;
}

export interface LabTest {
  id: string;
  name: string;
  nameAr: string;
  code: string;
  category: string;
  categoryAr: string;
  fields: ResultField[];
}

export const LAB_CATEGORIES = [
  { id: "hematology", en: "Hematology", ar: "أمراض الدم" },
  { id: "coagulation", en: "Coagulation", ar: "التخثر" },
  { id: "chemistry", en: "Chemistry", ar: "الكيمياء الحيوية" },
  { id: "metabolic", en: "Metabolic Panels", ar: "اللوحات الأيضية" },
  { id: "liver", en: "Liver Function", ar: "وظائف الكبد" },
  { id: "renal", en: "Renal Function", ar: "وظائف الكلى" },
  { id: "lipids", en: "Lipids", ar: "الدهون" },
  { id: "cardiac", en: "Cardiac Markers", ar: "المؤشرات القلبية" },
  { id: "thyroid", en: "Thyroid & Endocrine", ar: "الغدة الدرقية والغدد الصماء" },
  { id: "inflammation", en: "Inflammation & Immunology", ar: "الالتهاب والمناعة" },
  { id: "vitamins", en: "Vitamins & Minerals", ar: "الفيتامينات والمعادن" },
  { id: "bloodgas", en: "Blood Gas", ar: "غازات الدم" },
  { id: "urinalysis", en: "Urinalysis", ar: "تحليل البول" },
  { id: "microbiology", en: "Microbiology", ar: "الأحياء الدقيقة" },
  { id: "csf", en: "CSF Analysis", ar: "تحليل السائل النخاعي" },
  { id: "pediatric", en: "Pediatric & Neonatal", ar: "طب الأطفال وحديثي الولادة" },
  { id: "tumor", en: "Tumor Markers", ar: "مؤشرات الأورام" },
  { id: "hormones", en: "Hormones", ar: "الهرمونات" },
] as const;

export const LAB_TESTS: LabTest[] = [
  // ─── HEMATOLOGY ──────────────────────────────────────────────────────────────
  {
    id: "cbc",
    name: "Complete Blood Count (CBC)",
    nameAr: "صورة الدم الكاملة",
    code: "CBC",
    category: "hematology",
    categoryAr: "أمراض الدم",
    fields: [
      { key: "wbc", label: "WBC", unit: "10³/µL", refRange: "4.5 – 11.0", refMin: 4.5, refMax: 11.0, criticalLow: 2.0, criticalHigh: 30.0, type: "number", required: true },
      { key: "rbc", label: "RBC", unit: "10⁶/µL", refRange: "4.0 – 5.5", refMin: 4.0, refMax: 5.5, criticalLow: 3.0, type: "number", required: true },
      { key: "hgb", label: "Hemoglobin (Hgb)", unit: "g/dL", refRange: "11.5 – 17.5", refMin: 11.5, refMax: 17.5, criticalLow: 7.0, criticalHigh: 20.0, type: "number", required: true },
      { key: "hct", label: "Hematocrit (Hct)", unit: "%", refRange: "35 – 52", refMin: 35, refMax: 52, type: "number" },
      { key: "mcv", label: "MCV", unit: "fL", refRange: "80 – 100", refMin: 80, refMax: 100, type: "number" },
      { key: "mch", label: "MCH", unit: "pg", refRange: "27 – 33", refMin: 27, refMax: 33, type: "number" },
      { key: "mchc", label: "MCHC", unit: "g/dL", refRange: "32 – 36", refMin: 32, refMax: 36, type: "number" },
      { key: "rdw", label: "RDW", unit: "%", refRange: "11.5 – 14.5", refMin: 11.5, refMax: 14.5, type: "number" },
      { key: "plt", label: "Platelets (PLT)", unit: "10³/µL", refRange: "150 – 400", refMin: 150, refMax: 400, criticalLow: 50, criticalHigh: 1000, type: "number", required: true },
      { key: "neutro", label: "Neutrophils", unit: "%", refRange: "50 – 70", refMin: 50, refMax: 70, type: "number" },
      { key: "lympho", label: "Lymphocytes", unit: "%", refRange: "20 – 40", refMin: 20, refMax: 40, type: "number" },
      { key: "mono", label: "Monocytes", unit: "%", refRange: "2 – 8", refMin: 2, refMax: 8, type: "number" },
      { key: "eosino", label: "Eosinophils", unit: "%", refRange: "1 – 4", refMin: 1, refMax: 4, type: "number" },
      { key: "baso", label: "Basophils", unit: "%", refRange: "0 – 1", refMin: 0, refMax: 1, type: "number" },
    ],
  },
  {
    id: "cbc_diff",
    name: "CBC with Differential",
    nameAr: "صورة الدم الكاملة مع التفريق",
    code: "CBC-DIFF",
    category: "hematology",
    categoryAr: "أمراض الدم",
    fields: [
      { key: "wbc", label: "WBC", unit: "10³/µL", refRange: "4.5 – 11.0", refMin: 4.5, refMax: 11.0, criticalLow: 2.0, criticalHigh: 30.0, type: "number", required: true },
      { key: "rbc", label: "RBC", unit: "10⁶/µL", refRange: "4.0 – 5.5", refMin: 4.0, refMax: 5.5, criticalLow: 3.0, type: "number", required: true },
      { key: "hgb", label: "Hemoglobin", unit: "g/dL", refRange: "11.5 – 17.5", refMin: 11.5, refMax: 17.5, criticalLow: 7.0, criticalHigh: 20.0, type: "number", required: true },
      { key: "hct", label: "Hematocrit", unit: "%", refRange: "35 – 52", refMin: 35, refMax: 52, type: "number" },
      { key: "mcv", label: "MCV", unit: "fL", refRange: "80 – 100", refMin: 80, refMax: 100, type: "number" },
      { key: "mch", label: "MCH", unit: "pg", refRange: "27 – 33", refMin: 27, refMax: 33, type: "number" },
      { key: "mchc", label: "MCHC", unit: "g/dL", refRange: "32 – 36", refMin: 32, refMax: 36, type: "number" },
      { key: "plt", label: "Platelets", unit: "10³/µL", refRange: "150 – 400", refMin: 150, refMax: 400, criticalLow: 50, criticalHigh: 1000, type: "number", required: true },
      { key: "neutro_abs", label: "Neutrophils (Abs)", unit: "10³/µL", refRange: "1.8 – 7.7", refMin: 1.8, refMax: 7.7, criticalLow: 0.5, type: "number" },
      { key: "neutro_pct", label: "Neutrophils %", unit: "%", refRange: "50 – 70", refMin: 50, refMax: 70, type: "number" },
      { key: "lympho_abs", label: "Lymphocytes (Abs)", unit: "10³/µL", refRange: "1.0 – 4.8", refMin: 1.0, refMax: 4.8, type: "number" },
      { key: "lympho_pct", label: "Lymphocytes %", unit: "%", refRange: "20 – 40", refMin: 20, refMax: 40, type: "number" },
      { key: "mono_pct", label: "Monocytes %", unit: "%", refRange: "2 – 8", refMin: 2, refMax: 8, type: "number" },
      { key: "eosino_pct", label: "Eosinophils %", unit: "%", refRange: "1 – 4", refMin: 1, refMax: 4, type: "number" },
      { key: "baso_pct", label: "Basophils %", unit: "%", refRange: "0 – 1", refMin: 0, refMax: 1, type: "number" },
      { key: "bands", label: "Band Neutrophils", unit: "%", refRange: "0 – 10", refMin: 0, refMax: 10, type: "number" },
      { key: "nrbc", label: "NRBC", unit: "/100 WBC", refRange: "0", type: "number" },
    ],
  },
  {
    id: "esr",
    name: "ESR (Erythrocyte Sedimentation Rate)",
    nameAr: "سرعة الترسيب",
    code: "ESR",
    category: "hematology",
    categoryAr: "أمراض الدم",
    fields: [
      { key: "esr", label: "ESR", unit: "mm/hr", refRange: "M: 0–15  F: 0–20", refMin: 0, refMax: 20, type: "number", required: true },
    ],
  },
  {
    id: "retic",
    name: "Reticulocyte Count",
    nameAr: "عدد الخلايا الشبكية",
    code: "RETIC",
    category: "hematology",
    categoryAr: "أمراض الدم",
    fields: [
      { key: "retic_pct", label: "Reticulocytes %", unit: "%", refRange: "0.5 – 2.5", refMin: 0.5, refMax: 2.5, type: "number", required: true },
      { key: "retic_abs", label: "Reticulocytes (Abs)", unit: "10³/µL", refRange: "25 – 75", refMin: 25, refMax: 75, type: "number" },
    ],
  },
  {
    id: "blood_group",
    name: "Blood Group & Rh Typing",
    nameAr: "فصيلة الدم وعامل Rh",
    code: "BG-RH",
    category: "hematology",
    categoryAr: "أمراض الدم",
    fields: [
      { key: "blood_group", label: "Blood Group", unit: "", type: "select", options: ["A", "B", "AB", "O"], required: true },
      { key: "rh_factor", label: "Rh Factor", unit: "", type: "select", options: ["Positive (+)", "Negative (-)"], required: true },
    ],
  },
  {
    id: "hgb_electro",
    name: "Hemoglobin Electrophoresis",
    nameAr: "رحلان الهيموغلوبين",
    code: "HGB-ELEC",
    category: "hematology",
    categoryAr: "أمراض الدم",
    fields: [
      { key: "hba", label: "HbA", unit: "%", refRange: "95 – 98", refMin: 95, refMax: 98, type: "number", required: true },
      { key: "hba2", label: "HbA2", unit: "%", refRange: "1.5 – 3.5", refMin: 1.5, refMax: 3.5, criticalHigh: 5.0, type: "number" },
      { key: "hbf", label: "HbF", unit: "%", refRange: "< 2", refMax: 2, type: "number" },
      { key: "hbs", label: "HbS", unit: "%", refRange: "0", refMax: 0, type: "number" },
      { key: "interpretation", label: "Interpretation", type: "text" },
    ],
  },
  {
    id: "g6pd",
    name: "G6PD Screen",
    nameAr: "فحص نقص G6PD",
    code: "G6PD",
    category: "hematology",
    categoryAr: "أمراض الدم",
    fields: [
      { key: "g6pd_level", label: "G6PD Level", unit: "U/gHb", refRange: "6.97 – 20.5", refMin: 6.97, refMax: 20.5, criticalLow: 3.5, type: "number", required: true },
      { key: "interpretation", label: "Interpretation", type: "select", options: ["Normal", "Deficient", "Borderline"] },
    ],
  },
  {
    id: "sickle_cell",
    name: "Sickle Cell Screen",
    nameAr: "فحص فقر الدم المنجلي",
    code: "SICKLE",
    category: "hematology",
    categoryAr: "أمراض الدم",
    fields: [
      { key: "result_qual", label: "Result", type: "select", options: ["Negative", "Positive"], required: true },
      { key: "notes", label: "Notes", type: "text" },
    ],
  },

  // ─── COAGULATION ─────────────────────────────────────────────────────────────
  {
    id: "pt_inr",
    name: "PT / INR",
    nameAr: "زمن البروثرومبين / INR",
    code: "PT-INR",
    category: "coagulation",
    categoryAr: "التخثر",
    fields: [
      { key: "pt", label: "PT", unit: "sec", refRange: "11 – 13.5", refMin: 11, refMax: 13.5, criticalHigh: 30, type: "number", required: true },
      { key: "inr", label: "INR", unit: "", refRange: "0.8 – 1.2", refMin: 0.8, refMax: 1.2, criticalHigh: 5.0, type: "number", required: true },
    ],
  },
  {
    id: "aptt",
    name: "aPTT",
    nameAr: "وقت الثرومبوبلاستين الجزئي المنشط",
    code: "APTT",
    category: "coagulation",
    categoryAr: "التخثر",
    fields: [
      { key: "aptt", label: "aPTT", unit: "sec", refRange: "25 – 35", refMin: 25, refMax: 35, criticalHigh: 100, type: "number", required: true },
      { key: "control", label: "Control", unit: "sec", type: "number" },
    ],
  },
  {
    id: "fibrinogen",
    name: "Fibrinogen",
    nameAr: "الفيبرينوجين",
    code: "FIB",
    category: "coagulation",
    categoryAr: "التخثر",
    fields: [
      { key: "fibrinogen", label: "Fibrinogen", unit: "mg/dL", refRange: "200 – 400", refMin: 200, refMax: 400, criticalLow: 100, type: "number", required: true },
    ],
  },
  {
    id: "d_dimer",
    name: "D-Dimer",
    nameAr: "D-Dimer",
    code: "D-DIMER",
    category: "coagulation",
    categoryAr: "التخثر",
    fields: [
      { key: "d_dimer", label: "D-Dimer", unit: "µg/mL FEU", refRange: "< 0.5", refMax: 0.5, criticalHigh: 4.0, type: "number", required: true },
    ],
  },
  {
    id: "coag_full",
    name: "Coagulation Profile",
    nameAr: "بروفايل التخثر الكامل",
    code: "COAG",
    category: "coagulation",
    categoryAr: "التخثر",
    fields: [
      { key: "pt", label: "PT", unit: "sec", refRange: "11 – 13.5", refMin: 11, refMax: 13.5, criticalHigh: 30, type: "number", required: true },
      { key: "inr", label: "INR", unit: "", refRange: "0.8 – 1.2", refMin: 0.8, refMax: 1.2, criticalHigh: 5.0, type: "number", required: true },
      { key: "aptt", label: "aPTT", unit: "sec", refRange: "25 – 35", refMin: 25, refMax: 35, criticalHigh: 100, type: "number", required: true },
      { key: "fibrinogen", label: "Fibrinogen", unit: "mg/dL", refRange: "200 – 400", refMin: 200, refMax: 400, criticalLow: 100, type: "number" },
      { key: "d_dimer", label: "D-Dimer", unit: "µg/mL FEU", refRange: "< 0.5", refMax: 0.5, type: "number" },
      { key: "thrombin_time", label: "Thrombin Time", unit: "sec", refRange: "14 – 21", refMin: 14, refMax: 21, type: "number" },
    ],
  },

  // ─── METABOLIC PANELS ────────────────────────────────────────────────────────
  {
    id: "bmp",
    name: "Basic Metabolic Panel (BMP)",
    nameAr: "لوحة الاستقلاب الأساسية",
    code: "BMP",
    category: "metabolic",
    categoryAr: "اللوحات الأيضية",
    fields: [
      { key: "glucose", label: "Glucose", unit: "mg/dL", refRange: "70 – 100", refMin: 70, refMax: 100, criticalLow: 40, criticalHigh: 500, type: "number", required: true },
      { key: "bun", label: "BUN", unit: "mg/dL", refRange: "7 – 20", refMin: 7, refMax: 20, criticalHigh: 100, type: "number", required: true },
      { key: "creatinine", label: "Creatinine", unit: "mg/dL", refRange: "0.5 – 1.2", refMin: 0.5, refMax: 1.2, criticalHigh: 10, type: "number", required: true },
      { key: "egfr", label: "eGFR", unit: "mL/min/1.73m²", refRange: "> 60", refMin: 60, type: "number" },
      { key: "sodium", label: "Sodium (Na⁺)", unit: "mEq/L", refRange: "136 – 145", refMin: 136, refMax: 145, criticalLow: 120, criticalHigh: 160, type: "number", required: true },
      { key: "potassium", label: "Potassium (K⁺)", unit: "mEq/L", refRange: "3.5 – 5.0", refMin: 3.5, refMax: 5.0, criticalLow: 2.5, criticalHigh: 6.5, type: "number", required: true },
      { key: "chloride", label: "Chloride (Cl⁻)", unit: "mEq/L", refRange: "98 – 107", refMin: 98, refMax: 107, type: "number" },
      { key: "co2", label: "CO₂ / HCO₃⁻", unit: "mEq/L", refRange: "22 – 29", refMin: 22, refMax: 29, criticalLow: 10, type: "number" },
      { key: "calcium", label: "Calcium (Ca²⁺)", unit: "mg/dL", refRange: "8.5 – 10.5", refMin: 8.5, refMax: 10.5, criticalLow: 6.5, criticalHigh: 14.0, type: "number" },
      { key: "anion_gap", label: "Anion Gap", unit: "mEq/L", refRange: "8 – 16", refMin: 8, refMax: 16, type: "number" },
    ],
  },
  {
    id: "cmp",
    name: "Comprehensive Metabolic Panel (CMP)",
    nameAr: "لوحة الاستقلاب الشاملة",
    code: "CMP",
    category: "metabolic",
    categoryAr: "اللوحات الأيضية",
    fields: [
      { key: "glucose", label: "Glucose", unit: "mg/dL", refRange: "70 – 100", refMin: 70, refMax: 100, criticalLow: 40, criticalHigh: 500, type: "number", required: true },
      { key: "bun", label: "BUN", unit: "mg/dL", refRange: "7 – 20", refMin: 7, refMax: 20, criticalHigh: 100, type: "number", required: true },
      { key: "creatinine", label: "Creatinine", unit: "mg/dL", refRange: "0.5 – 1.2", refMin: 0.5, refMax: 1.2, criticalHigh: 10, type: "number", required: true },
      { key: "egfr", label: "eGFR", unit: "mL/min/1.73m²", refRange: "> 60", refMin: 60, type: "number" },
      { key: "sodium", label: "Sodium (Na⁺)", unit: "mEq/L", refRange: "136 – 145", refMin: 136, refMax: 145, criticalLow: 120, criticalHigh: 160, type: "number", required: true },
      { key: "potassium", label: "Potassium (K⁺)", unit: "mEq/L", refRange: "3.5 – 5.0", refMin: 3.5, refMax: 5.0, criticalLow: 2.5, criticalHigh: 6.5, type: "number", required: true },
      { key: "chloride", label: "Chloride (Cl⁻)", unit: "mEq/L", refRange: "98 – 107", refMin: 98, refMax: 107, type: "number" },
      { key: "co2", label: "CO₂ / HCO₃⁻", unit: "mEq/L", refRange: "22 – 29", refMin: 22, refMax: 29, criticalLow: 10, type: "number" },
      { key: "calcium", label: "Calcium (Ca²⁺)", unit: "mg/dL", refRange: "8.5 – 10.5", refMin: 8.5, refMax: 10.5, criticalLow: 6.5, criticalHigh: 14.0, type: "number" },
      { key: "total_protein", label: "Total Protein", unit: "g/dL", refRange: "6.3 – 8.2", refMin: 6.3, refMax: 8.2, type: "number" },
      { key: "albumin", label: "Albumin", unit: "g/dL", refRange: "3.5 – 5.0", refMin: 3.5, refMax: 5.0, criticalLow: 2.0, type: "number" },
      { key: "total_bili", label: "Total Bilirubin", unit: "mg/dL", refRange: "0.2 – 1.2", refMin: 0.2, refMax: 1.2, criticalHigh: 15, type: "number" },
      { key: "alt", label: "ALT (SGPT)", unit: "U/L", refRange: "7 – 56", refMin: 7, refMax: 56, criticalHigh: 1000, type: "number" },
      { key: "ast", label: "AST (SGOT)", unit: "U/L", refRange: "10 – 40", refMin: 10, refMax: 40, criticalHigh: 1000, type: "number" },
      { key: "alp", label: "ALP", unit: "U/L", refRange: "44 – 147", refMin: 44, refMax: 147, type: "number" },
    ],
  },
  {
    id: "electrolytes",
    name: "Electrolytes Panel",
    nameAr: "لوحة الكهارل",
    code: "ELEC",
    category: "metabolic",
    categoryAr: "اللوحات الأيضية",
    fields: [
      { key: "sodium", label: "Sodium (Na⁺)", unit: "mEq/L", refRange: "136 – 145", refMin: 136, refMax: 145, criticalLow: 120, criticalHigh: 160, type: "number", required: true },
      { key: "potassium", label: "Potassium (K⁺)", unit: "mEq/L", refRange: "3.5 – 5.0", refMin: 3.5, refMax: 5.0, criticalLow: 2.5, criticalHigh: 6.5, type: "number", required: true },
      { key: "chloride", label: "Chloride (Cl⁻)", unit: "mEq/L", refRange: "98 – 107", refMin: 98, refMax: 107, type: "number", required: true },
      { key: "bicarb", label: "Bicarbonate (HCO₃⁻)", unit: "mEq/L", refRange: "22 – 29", refMin: 22, refMax: 29, criticalLow: 10, type: "number", required: true },
      { key: "anion_gap", label: "Anion Gap", unit: "mEq/L", refRange: "8 – 16", refMin: 8, refMax: 16, type: "number" },
    ],
  },
  {
    id: "glucose",
    name: "Glucose (Fasting / Random)",
    nameAr: "سكر الدم (صيام / عشوائي)",
    code: "GLU",
    category: "chemistry",
    categoryAr: "الكيمياء الحيوية",
    fields: [
      { key: "glucose", label: "Glucose", unit: "mg/dL", refRange: "70 – 100 (fasting)", refMin: 70, refMax: 100, criticalLow: 40, criticalHigh: 500, type: "number", required: true },
      { key: "type", label: "Type", type: "select", options: ["Fasting", "Random", "2h Post-prandial", "2h Post-OGTT"] },
    ],
  },
  {
    id: "hba1c",
    name: "HbA1c",
    nameAr: "السكر التراكمي",
    code: "HBA1C",
    category: "chemistry",
    categoryAr: "الكيمياء الحيوية",
    fields: [
      { key: "hba1c", label: "HbA1c", unit: "%", refRange: "< 5.7", refMax: 5.7, type: "number", required: true },
      { key: "estimated_avg_glucose", label: "Est. Average Glucose", unit: "mg/dL", type: "number" },
    ],
  },

  // ─── LIVER FUNCTION ───────────────────────────────────────────────────────────
  {
    id: "lft",
    name: "Liver Function Tests (LFT)",
    nameAr: "وظائف الكبد",
    code: "LFT",
    category: "liver",
    categoryAr: "وظائف الكبد",
    fields: [
      { key: "alt", label: "ALT (SGPT)", unit: "U/L", refRange: "7 – 56", refMin: 7, refMax: 56, criticalHigh: 1000, type: "number", required: true },
      { key: "ast", label: "AST (SGOT)", unit: "U/L", refRange: "10 – 40", refMin: 10, refMax: 40, criticalHigh: 1000, type: "number", required: true },
      { key: "alp", label: "ALP", unit: "U/L", refRange: "44 – 147", refMin: 44, refMax: 147, type: "number", required: true },
      { key: "ggt", label: "GGT", unit: "U/L", refRange: "9 – 48", refMin: 9, refMax: 48, type: "number" },
      { key: "total_bili", label: "Total Bilirubin", unit: "mg/dL", refRange: "0.2 – 1.2", refMin: 0.2, refMax: 1.2, criticalHigh: 15, type: "number", required: true },
      { key: "direct_bili", label: "Direct Bilirubin", unit: "mg/dL", refRange: "0.0 – 0.3", refMin: 0, refMax: 0.3, type: "number" },
      { key: "indirect_bili", label: "Indirect Bilirubin", unit: "mg/dL", refRange: "0.2 – 0.9", refMin: 0.2, refMax: 0.9, type: "number" },
      { key: "albumin", label: "Albumin", unit: "g/dL", refRange: "3.5 – 5.0", refMin: 3.5, refMax: 5.0, criticalLow: 2.0, type: "number" },
      { key: "total_protein", label: "Total Protein", unit: "g/dL", refRange: "6.3 – 8.2", refMin: 6.3, refMax: 8.2, type: "number" },
    ],
  },
  {
    id: "bilirubin",
    name: "Bilirubin (Total & Fractions)",
    nameAr: "البيليروبين الكلي والكسري",
    code: "BILI",
    category: "liver",
    categoryAr: "وظائف الكبد",
    fields: [
      { key: "total_bili", label: "Total Bilirubin", unit: "mg/dL", refRange: "0.2 – 1.2", refMin: 0.2, refMax: 1.2, criticalHigh: 15, type: "number", required: true },
      { key: "direct_bili", label: "Direct (Conjugated)", unit: "mg/dL", refRange: "0.0 – 0.3", refMin: 0, refMax: 0.3, type: "number" },
      { key: "indirect_bili", label: "Indirect (Unconjugated)", unit: "mg/dL", refRange: "0.2 – 0.9", refMin: 0.2, refMax: 0.9, type: "number" },
    ],
  },
  {
    id: "ammonia",
    name: "Ammonia",
    nameAr: "الأمونيا",
    code: "NH3",
    category: "liver",
    categoryAr: "وظائف الكبد",
    fields: [
      { key: "ammonia", label: "Ammonia", unit: "µmol/L", refRange: "11 – 35", refMin: 11, refMax: 35, criticalHigh: 150, type: "number", required: true },
    ],
  },

  // ─── RENAL FUNCTION ───────────────────────────────────────────────────────────
  {
    id: "rft",
    name: "Renal Function Tests (RFT)",
    nameAr: "وظائف الكلى",
    code: "RFT",
    category: "renal",
    categoryAr: "وظائف الكلى",
    fields: [
      { key: "bun", label: "BUN (Blood Urea Nitrogen)", unit: "mg/dL", refRange: "7 – 20", refMin: 7, refMax: 20, criticalHigh: 100, type: "number", required: true },
      { key: "creatinine", label: "Creatinine", unit: "mg/dL", refRange: "0.5 – 1.2", refMin: 0.5, refMax: 1.2, criticalHigh: 10, type: "number", required: true },
      { key: "egfr", label: "eGFR (CKD-EPI)", unit: "mL/min/1.73m²", refRange: "> 60", refMin: 60, type: "number" },
      { key: "bun_cr_ratio", label: "BUN:Creatinine Ratio", unit: "", refRange: "10 – 20", refMin: 10, refMax: 20, type: "number" },
      { key: "uric_acid", label: "Uric Acid", unit: "mg/dL", refRange: "3.5 – 7.2", refMin: 3.5, refMax: 7.2, criticalHigh: 12, type: "number" },
    ],
  },
  {
    id: "cystatin_c",
    name: "Cystatin C",
    nameAr: "سيستاتين C",
    code: "CYST-C",
    category: "renal",
    categoryAr: "وظائف الكلى",
    fields: [
      { key: "cystatin_c", label: "Cystatin C", unit: "mg/L", refRange: "0.53 – 0.95", refMin: 0.53, refMax: 0.95, type: "number", required: true },
    ],
  },

  // ─── LIPIDS ───────────────────────────────────────────────────────────────────
  {
    id: "lipid_panel",
    name: "Lipid Panel",
    nameAr: "لوحة الدهون",
    code: "LIPID",
    category: "lipids",
    categoryAr: "الدهون",
    fields: [
      { key: "total_chol", label: "Total Cholesterol", unit: "mg/dL", refRange: "< 200", refMax: 200, type: "number", required: true },
      { key: "ldl", label: "LDL Cholesterol", unit: "mg/dL", refRange: "< 130", refMax: 130, type: "number", required: true },
      { key: "hdl", label: "HDL Cholesterol", unit: "mg/dL", refRange: "> 40 (M) / > 50 (F)", refMin: 40, type: "number", required: true },
      { key: "trig", label: "Triglycerides", unit: "mg/dL", refRange: "< 150", refMax: 150, criticalHigh: 1000, type: "number", required: true },
      { key: "vldl", label: "VLDL", unit: "mg/dL", refRange: "5 – 40", refMin: 5, refMax: 40, type: "number" },
      { key: "non_hdl", label: "Non-HDL Cholesterol", unit: "mg/dL", refRange: "< 160", refMax: 160, type: "number" },
      { key: "chol_hdl_ratio", label: "Total:HDL Ratio", unit: "", refRange: "< 5.0", refMax: 5.0, type: "number" },
    ],
  },

  // ─── CARDIAC MARKERS ─────────────────────────────────────────────────────────
  {
    id: "troponin_i",
    name: "Troponin I (cTnI)",
    nameAr: "تروبونين I",
    code: "TROP-I",
    category: "cardiac",
    categoryAr: "المؤشرات القلبية",
    fields: [
      { key: "troponin_i", label: "Troponin I", unit: "ng/mL", refRange: "< 0.04", refMax: 0.04, criticalHigh: 0.4, type: "number", required: true },
    ],
  },
  {
    id: "hs_troponin",
    name: "High-Sensitivity Troponin T (hsTnT)",
    nameAr: "تروبونين T عالي الحساسية",
    code: "HS-TROP",
    category: "cardiac",
    categoryAr: "المؤشرات القلبية",
    fields: [
      { key: "hs_tnt", label: "hsTroponin T", unit: "ng/L", refRange: "< 14", refMax: 14, criticalHigh: 52, type: "number", required: true },
    ],
  },
  {
    id: "ck_mb",
    name: "CK-MB",
    nameAr: "CK-MB القلبي",
    code: "CK-MB",
    category: "cardiac",
    categoryAr: "المؤشرات القلبية",
    fields: [
      { key: "ck_mb", label: "CK-MB", unit: "U/L", refRange: "0 – 25", refMax: 25, type: "number", required: true },
      { key: "total_ck", label: "Total CK", unit: "U/L", refRange: "M: 52–336  F: 38–176", refMax: 336, type: "number" },
    ],
  },
  {
    id: "bnp",
    name: "BNP (B-type Natriuretic Peptide)",
    nameAr: "الببتيد الأذيني المدر للصوديوم",
    code: "BNP",
    category: "cardiac",
    categoryAr: "المؤشرات القلبية",
    fields: [
      { key: "bnp", label: "BNP", unit: "pg/mL", refRange: "< 100", refMax: 100, criticalHigh: 900, type: "number", required: true },
    ],
  },
  {
    id: "nt_probnp",
    name: "NT-proBNP",
    nameAr: "NT-proBNP",
    code: "NT-BNP",
    category: "cardiac",
    categoryAr: "المؤشرات القلبية",
    fields: [
      { key: "nt_probnp", label: "NT-proBNP", unit: "pg/mL", refRange: "< 125", refMax: 125, criticalHigh: 5000, type: "number", required: true },
    ],
  },
  {
    id: "ldh",
    name: "LDH (Lactate Dehydrogenase)",
    nameAr: "ديهيدروجيناز حمض اللاكتيك",
    code: "LDH",
    category: "cardiac",
    categoryAr: "المؤشرات القلبية",
    fields: [
      { key: "ldh", label: "LDH", unit: "U/L", refRange: "135 – 225", refMin: 135, refMax: 225, type: "number", required: true },
    ],
  },

  // ─── THYROID & ENDOCRINE ──────────────────────────────────────────────────────
  {
    id: "tft",
    name: "Thyroid Function Tests (TFT)",
    nameAr: "وظائف الغدة الدرقية",
    code: "TFT",
    category: "thyroid",
    categoryAr: "الغدة الدرقية والغدد الصماء",
    fields: [
      { key: "tsh", label: "TSH", unit: "mIU/L", refRange: "0.4 – 4.0", refMin: 0.4, refMax: 4.0, criticalLow: 0.1, criticalHigh: 20, type: "number", required: true },
      { key: "ft4", label: "Free T4", unit: "ng/dL", refRange: "0.8 – 1.8", refMin: 0.8, refMax: 1.8, type: "number", required: true },
      { key: "ft3", label: "Free T3", unit: "pg/mL", refRange: "2.3 – 4.2", refMin: 2.3, refMax: 4.2, type: "number" },
      { key: "total_t4", label: "Total T4", unit: "µg/dL", refRange: "5.0 – 12.0", refMin: 5.0, refMax: 12.0, type: "number" },
      { key: "total_t3", label: "Total T3", unit: "ng/dL", refRange: "80 – 200", refMin: 80, refMax: 200, type: "number" },
      { key: "anti_tpo", label: "Anti-TPO", unit: "IU/mL", refRange: "< 35", refMax: 35, type: "number" },
      { key: "anti_tg", label: "Anti-Thyroglobulin", unit: "IU/mL", refRange: "< 40", refMax: 40, type: "number" },
    ],
  },
  {
    id: "tsh",
    name: "TSH",
    nameAr: "هرمون TSH",
    code: "TSH",
    category: "thyroid",
    categoryAr: "الغدة الدرقية والغدد الصماء",
    fields: [
      { key: "tsh", label: "TSH", unit: "mIU/L", refRange: "0.4 – 4.0", refMin: 0.4, refMax: 4.0, criticalLow: 0.1, criticalHigh: 20, type: "number", required: true },
    ],
  },
  {
    id: "cortisol",
    name: "Cortisol (AM / PM)",
    nameAr: "الكورتيزول",
    code: "CORTISOL",
    category: "thyroid",
    categoryAr: "الغدة الدرقية والغدد الصماء",
    fields: [
      { key: "cortisol", label: "Cortisol", unit: "µg/dL", refRange: "AM: 6–23  PM: 3–16", refMin: 3, refMax: 23, criticalLow: 1, type: "number", required: true },
      { key: "timing", label: "Timing", type: "select", options: ["8:00 AM (Peak)", "4:00 PM", "11:00 PM (Nadir)", "Random"] },
    ],
  },
  {
    id: "insulin",
    name: "Insulin + C-Peptide",
    nameAr: "الأنسولين والببتيد C",
    code: "INS-CPEP",
    category: "thyroid",
    categoryAr: "الغدة الدرقية والغدد الصماء",
    fields: [
      { key: "insulin", label: "Fasting Insulin", unit: "µIU/mL", refRange: "2.6 – 24.9", refMin: 2.6, refMax: 24.9, type: "number", required: true },
      { key: "c_peptide", label: "C-Peptide", unit: "ng/mL", refRange: "0.8 – 3.1", refMin: 0.8, refMax: 3.1, type: "number" },
      { key: "homa_ir", label: "HOMA-IR", unit: "", refRange: "< 2.5", refMax: 2.5, type: "number" },
    ],
  },
  {
    id: "growth_hormone",
    name: "Growth Hormone (GH)",
    nameAr: "هرمون النمو",
    code: "GH",
    category: "thyroid",
    categoryAr: "الغدة الدرقية والغدد الصماء",
    fields: [
      { key: "gh", label: "Growth Hormone", unit: "ng/mL", refRange: "< 5.0 (basal)", refMax: 5.0, type: "number", required: true },
      { key: "igf1", label: "IGF-1", unit: "ng/mL", refRange: "Age-dependent", type: "number" },
      { key: "igfbp3", label: "IGFBP-3", unit: "mg/L", type: "number" },
    ],
  },
  {
    id: "ohp_17",
    name: "17-Hydroxyprogesterone (17-OHP)",
    nameAr: "17-هيدروكسي بروجسترون",
    code: "17-OHP",
    category: "thyroid",
    categoryAr: "الغدة الدرقية والغدد الصماء",
    fields: [
      { key: "ohp_17", label: "17-OHP", unit: "ng/mL", refRange: "< 2.0 (follicular)", refMax: 2.0, criticalHigh: 30, type: "number", required: true },
    ],
  },
  {
    id: "pth",
    name: "Parathyroid Hormone (PTH)",
    nameAr: "هرمون الغدة جارة الدرقية",
    code: "PTH",
    category: "thyroid",
    categoryAr: "الغدة الدرقية والغدد الصماء",
    fields: [
      { key: "pth", label: "Intact PTH", unit: "pg/mL", refRange: "15 – 65", refMin: 15, refMax: 65, type: "number", required: true },
    ],
  },

  // ─── INFLAMMATION & IMMUNOLOGY ────────────────────────────────────────────────
  {
    id: "crp",
    name: "CRP (C-Reactive Protein)",
    nameAr: "البروتين التفاعلي C",
    code: "CRP",
    category: "inflammation",
    categoryAr: "الالتهاب والمناعة",
    fields: [
      { key: "crp", label: "CRP", unit: "mg/L", refRange: "< 10", refMax: 10, criticalHigh: 200, type: "number", required: true },
    ],
  },
  {
    id: "hs_crp",
    name: "hsCRP (High-Sensitivity CRP)",
    nameAr: "CRP عالي الحساسية",
    code: "HSCRP",
    category: "inflammation",
    categoryAr: "الالتهاب والمناعة",
    fields: [
      { key: "hs_crp", label: "hsCRP", unit: "mg/L", refRange: "< 1.0 (low risk)", refMax: 1.0, type: "number", required: true },
    ],
  },
  {
    id: "pct",
    name: "Procalcitonin (PCT)",
    nameAr: "البروكالسيتونين",
    code: "PCT",
    category: "inflammation",
    categoryAr: "الالتهاب والمناعة",
    fields: [
      { key: "pct", label: "Procalcitonin", unit: "ng/mL", refRange: "< 0.5", refMax: 0.5, criticalHigh: 10, type: "number", required: true },
    ],
  },
  {
    id: "immunoglobulins",
    name: "Immunoglobulins (IgA, IgG, IgM, IgE)",
    nameAr: "الغلوبيولينات المناعية",
    code: "IMMUNO-G",
    category: "inflammation",
    categoryAr: "الالتهاب والمناعة",
    fields: [
      { key: "igg", label: "IgG", unit: "mg/dL", refRange: "700 – 1600", refMin: 700, refMax: 1600, type: "number", required: true },
      { key: "iga", label: "IgA", unit: "mg/dL", refRange: "70 – 400", refMin: 70, refMax: 400, type: "number", required: true },
      { key: "igm", label: "IgM", unit: "mg/dL", refRange: "40 – 230", refMin: 40, refMax: 230, type: "number", required: true },
      { key: "ige", label: "IgE", unit: "IU/mL", refRange: "< 100", refMax: 100, type: "number" },
    ],
  },
  {
    id: "complement",
    name: "Complement C3 & C4",
    nameAr: "مكملات C3 و C4",
    code: "COMPL",
    category: "inflammation",
    categoryAr: "الالتهاب والمناعة",
    fields: [
      { key: "c3", label: "Complement C3", unit: "mg/dL", refRange: "90 – 180", refMin: 90, refMax: 180, type: "number", required: true },
      { key: "c4", label: "Complement C4", unit: "mg/dL", refRange: "16 – 47", refMin: 16, refMax: 47, type: "number", required: true },
    ],
  },
  {
    id: "ana",
    name: "ANA (Antinuclear Antibody)",
    nameAr: "الأجسام المضادة للنواة",
    code: "ANA",
    category: "inflammation",
    categoryAr: "الالتهاب والمناعة",
    fields: [
      { key: "ana_result", label: "ANA Result", type: "select", options: ["Negative", "Weakly Positive", "Positive", "Strongly Positive"], required: true },
      { key: "titer", label: "Titer", type: "text" },
      { key: "pattern", label: "Pattern", type: "select", options: ["Homogeneous", "Speckled", "Nucleolar", "Centromere", "Cytoplasmic", "Peripheral"] },
    ],
  },

  // ─── VITAMINS & MINERALS ──────────────────────────────────────────────────────
  {
    id: "vit_d",
    name: "Vitamin D (25-OH)",
    nameAr: "فيتامين D",
    code: "VIT-D",
    category: "vitamins",
    categoryAr: "الفيتامينات والمعادن",
    fields: [
      { key: "vit_d", label: "25-OH Vitamin D", unit: "ng/mL", refRange: "30 – 100", refMin: 30, refMax: 100, criticalLow: 10, type: "number", required: true },
    ],
  },
  {
    id: "vit_b12",
    name: "Vitamin B12",
    nameAr: "فيتامين B12",
    code: "VIT-B12",
    category: "vitamins",
    categoryAr: "الفيتامينات والمعادن",
    fields: [
      { key: "vit_b12", label: "Vitamin B12", unit: "pg/mL", refRange: "200 – 900", refMin: 200, refMax: 900, criticalLow: 100, type: "number", required: true },
    ],
  },
  {
    id: "folate",
    name: "Folate (Folic Acid)",
    nameAr: "حمض الفوليك",
    code: "FOLATE",
    category: "vitamins",
    categoryAr: "الفيتامينات والمعادن",
    fields: [
      { key: "folate", label: "Folate", unit: "ng/mL", refRange: "> 5.9", refMin: 5.9, type: "number", required: true },
    ],
  },
  {
    id: "iron_studies",
    name: "Iron Studies",
    nameAr: "دراسات الحديد",
    code: "IRON",
    category: "vitamins",
    categoryAr: "الفيتامينات والمعادن",
    fields: [
      { key: "serum_iron", label: "Serum Iron", unit: "µg/dL", refRange: "60 – 170", refMin: 60, refMax: 170, type: "number", required: true },
      { key: "tibc", label: "TIBC", unit: "µg/dL", refRange: "250 – 370", refMin: 250, refMax: 370, type: "number", required: true },
      { key: "ferritin", label: "Ferritin", unit: "ng/mL", refRange: "M: 12–300  F: 12–150", refMin: 12, refMax: 300, criticalLow: 5, type: "number", required: true },
      { key: "transferrin_sat", label: "Transferrin Saturation", unit: "%", refRange: "20 – 50", refMin: 20, refMax: 50, type: "number" },
    ],
  },
  {
    id: "magnesium",
    name: "Magnesium",
    nameAr: "المغنيسيوم",
    code: "MG",
    category: "vitamins",
    categoryAr: "الفيتامينات والمعادن",
    fields: [
      { key: "magnesium", label: "Magnesium", unit: "mg/dL", refRange: "1.7 – 2.2", refMin: 1.7, refMax: 2.2, criticalLow: 0.8, criticalHigh: 4.9, type: "number", required: true },
    ],
  },
  {
    id: "phosphorus",
    name: "Phosphorus",
    nameAr: "الفوسفور",
    code: "PHOS",
    category: "vitamins",
    categoryAr: "الفيتامينات والمعادن",
    fields: [
      { key: "phosphorus", label: "Phosphorus", unit: "mg/dL", refRange: "2.5 – 4.5", refMin: 2.5, refMax: 4.5, criticalLow: 1.0, criticalHigh: 8.9, type: "number", required: true },
    ],
  },
  {
    id: "zinc",
    name: "Zinc",
    nameAr: "الزنك",
    code: "ZN",
    category: "vitamins",
    categoryAr: "الفيتامينات والمعادن",
    fields: [
      { key: "zinc", label: "Zinc", unit: "µg/dL", refRange: "70 – 120", refMin: 70, refMax: 120, criticalLow: 40, type: "number", required: true },
    ],
  },

  // ─── BLOOD GAS ────────────────────────────────────────────────────────────────
  {
    id: "abg",
    name: "Arterial Blood Gas (ABG)",
    nameAr: "غازات الدم الشرياني",
    code: "ABG",
    category: "bloodgas",
    categoryAr: "غازات الدم",
    fields: [
      { key: "ph", label: "pH", unit: "", refRange: "7.35 – 7.45", refMin: 7.35, refMax: 7.45, criticalLow: 7.20, criticalHigh: 7.60, type: "number", required: true },
      { key: "paco2", label: "PaCO₂", unit: "mmHg", refRange: "35 – 45", refMin: 35, refMax: 45, criticalLow: 20, criticalHigh: 70, type: "number", required: true },
      { key: "pao2", label: "PaO₂", unit: "mmHg", refRange: "80 – 100", refMin: 80, refMax: 100, criticalLow: 50, type: "number", required: true },
      { key: "hco3", label: "HCO₃⁻", unit: "mEq/L", refRange: "22 – 26", refMin: 22, refMax: 26, criticalLow: 10, type: "number", required: true },
      { key: "base_excess", label: "Base Excess", unit: "mEq/L", refRange: "-2 to +2", refMin: -2, refMax: 2, type: "number" },
      { key: "spo2", label: "SpO₂", unit: "%", refRange: "95 – 100", refMin: 95, refMax: 100, criticalLow: 85, type: "number" },
      { key: "fio2", label: "FiO₂", unit: "%", type: "number" },
      { key: "lactate", label: "Lactate", unit: "mmol/L", refRange: "0.5 – 2.0", refMin: 0.5, refMax: 2.0, criticalHigh: 5.0, type: "number" },
      { key: "interpretation", label: "Interpretation", type: "select", options: ["Normal", "Metabolic Acidosis", "Metabolic Alkalosis", "Respiratory Acidosis", "Respiratory Alkalosis", "Mixed Disorder", "Compensated"] },
    ],
  },
  {
    id: "vbg",
    name: "Venous Blood Gas (VBG)",
    nameAr: "غازات الدم الوريدي",
    code: "VBG",
    category: "bloodgas",
    categoryAr: "غازات الدم",
    fields: [
      { key: "ph", label: "pH (venous)", unit: "", refRange: "7.31 – 7.41", refMin: 7.31, refMax: 7.41, criticalLow: 7.20, criticalHigh: 7.55, type: "number", required: true },
      { key: "pvco2", label: "PvCO₂", unit: "mmHg", refRange: "41 – 51", refMin: 41, refMax: 51, type: "number", required: true },
      { key: "hco3", label: "HCO₃⁻", unit: "mEq/L", refRange: "22 – 26", refMin: 22, refMax: 26, criticalLow: 10, type: "number", required: true },
      { key: "base_excess", label: "Base Excess", unit: "mEq/L", refRange: "-2 to +2", refMin: -2, refMax: 2, type: "number" },
      { key: "lactate", label: "Lactate", unit: "mmol/L", refRange: "0.5 – 2.0", refMin: 0.5, refMax: 2.0, criticalHigh: 5.0, type: "number" },
    ],
  },
  {
    id: "lactate",
    name: "Lactate",
    nameAr: "حمض اللاكتيك",
    code: "LAC",
    category: "bloodgas",
    categoryAr: "غازات الدم",
    fields: [
      { key: "lactate", label: "Lactate", unit: "mmol/L", refRange: "0.5 – 2.0", refMin: 0.5, refMax: 2.0, criticalHigh: 5.0, type: "number", required: true },
    ],
  },

  // ─── URINALYSIS ───────────────────────────────────────────────────────────────
  {
    id: "ua",
    name: "Complete Urinalysis",
    nameAr: "تحليل البول الكامل",
    code: "UA",
    category: "urinalysis",
    categoryAr: "تحليل البول",
    fields: [
      { key: "color", label: "Color", type: "select", options: ["Yellow", "Pale Yellow", "Dark Yellow", "Amber", "Orange", "Red", "Brown", "Clear"], required: true },
      { key: "clarity", label: "Clarity", type: "select", options: ["Clear", "Slightly Turbid", "Turbid", "Cloudy"] },
      { key: "ph", label: "pH", unit: "", refRange: "4.5 – 8.0", refMin: 4.5, refMax: 8.0, type: "number" },
      { key: "sp_gravity", label: "Specific Gravity", unit: "", refRange: "1.005 – 1.030", type: "number" },
      { key: "protein", label: "Protein", type: "select", options: ["Negative", "Trace", "1+", "2+", "3+", "4+"] },
      { key: "glucose_ua", label: "Glucose", type: "select", options: ["Negative", "Trace", "1+", "2+", "3+"] },
      { key: "ketones", label: "Ketones", type: "select", options: ["Negative", "Trace", "1+", "2+", "3+"] },
      { key: "blood", label: "Blood", type: "select", options: ["Negative", "Trace", "1+", "2+", "3+"] },
      { key: "bilirubin_ua", label: "Bilirubin", type: "select", options: ["Negative", "1+", "2+", "3+"] },
      { key: "urobilinogen", label: "Urobilinogen", type: "select", options: ["Normal", "2+", "4+", "8+"] },
      { key: "nitrites", label: "Nitrites", type: "select", options: ["Negative", "Positive"] },
      { key: "le", label: "Leukocyte Esterase", type: "select", options: ["Negative", "Trace", "1+", "2+", "3+"] },
      { key: "wbc_ua", label: "WBC", unit: "/hpf", refRange: "0 – 5", refMax: 5, type: "number" },
      { key: "rbc_ua", label: "RBC", unit: "/hpf", refRange: "0 – 2", refMax: 2, type: "number" },
      { key: "bacteria", label: "Bacteria", type: "select", options: ["None seen", "Few", "Moderate", "Many"] },
      { key: "casts", label: "Casts", type: "text" },
    ],
  },
  {
    id: "microalbumin",
    name: "Urine Microalbumin / Creatinine Ratio",
    nameAr: "نسبة الزلال الصغري في البول",
    code: "MACRO",
    category: "urinalysis",
    categoryAr: "تحليل البول",
    fields: [
      { key: "microalbumin", label: "Urine Microalbumin", unit: "mg/L", refRange: "< 30", refMax: 30, type: "number", required: true },
      { key: "urine_cr", label: "Urine Creatinine", unit: "mg/dL", type: "number" },
      { key: "acr", label: "Albumin:Creatinine Ratio", unit: "mg/g", refRange: "< 30", refMax: 30, type: "number" },
    ],
  },
  {
    id: "urine_culture",
    name: "Urine Culture & Sensitivity",
    nameAr: "زرع البول والحساسية",
    code: "UC-S",
    category: "microbiology",
    categoryAr: "الأحياء الدقيقة",
    fields: [
      { key: "colony_count", label: "Colony Count", unit: "CFU/mL", type: "text", required: true },
      { key: "organism", label: "Organism", type: "text" },
      { key: "sensitivity", label: "Sensitivity / Resistance", type: "text" },
      { key: "growth", label: "Growth", type: "select", options: ["No Growth (48h)", "No Significant Growth", "Significant Growth", "Mixed Growth"] },
    ],
  },

  // ─── MICROBIOLOGY ────────────────────────────────────────────────────────────
  {
    id: "blood_culture",
    name: "Blood Culture",
    nameAr: "زرع الدم",
    code: "BC",
    category: "microbiology",
    categoryAr: "الأحياء الدقيقة",
    fields: [
      { key: "growth", label: "Growth", type: "select", options: ["No Growth (5 days)", "Growth (Aerobic)", "Growth (Anaerobic)", "Contaminant"], required: true },
      { key: "organism", label: "Organism", type: "text" },
      { key: "sensitivity", label: "Sensitivity (Antibiotics)", type: "text" },
      { key: "resistance", label: "Resistance", type: "text" },
      { key: "incubation_days", label: "Days to Positivity", unit: "days", type: "number" },
    ],
  },
  {
    id: "csf_culture",
    name: "CSF Culture & Sensitivity",
    nameAr: "زرع السائل النخاعي",
    code: "CSF-C",
    category: "microbiology",
    categoryAr: "الأحياء الدقيقة",
    fields: [
      { key: "growth", label: "Growth", type: "select", options: ["No Growth (5 days)", "Growth detected", "Contaminant"], required: true },
      { key: "organism", label: "Organism", type: "text" },
      { key: "sensitivity", label: "Sensitivity", type: "text" },
    ],
  },
  {
    id: "throat_culture",
    name: "Throat / Nasopharyngeal Culture",
    nameAr: "زرع البلعوم",
    code: "THROAT-C",
    category: "microbiology",
    categoryAr: "الأحياء الدقيقة",
    fields: [
      { key: "growth", label: "Growth", type: "select", options: ["No Pathogen Isolated", "Group A Streptococcus", "Growth detected", "Normal Flora"], required: true },
      { key: "organism", label: "Organism", type: "text" },
      { key: "sensitivity", label: "Sensitivity", type: "text" },
    ],
  },
  {
    id: "stool_culture",
    name: "Stool Culture",
    nameAr: "زرع البراز",
    code: "STOOL-C",
    category: "microbiology",
    categoryAr: "الأحياء الدقيقة",
    fields: [
      { key: "growth", label: "Growth", type: "select", options: ["No Pathogen Isolated", "Salmonella spp.", "Shigella spp.", "E. coli O157", "Campylobacter spp.", "Growth detected"], required: true },
      { key: "organism", label: "Organism", type: "text" },
      { key: "ova_parasites", label: "Ova & Parasites", type: "text" },
    ],
  },
  {
    id: "wound_culture",
    name: "Wound / Swab Culture",
    nameAr: "زرع الجرح / المسحة",
    code: "WOUND-C",
    category: "microbiology",
    categoryAr: "الأحياء الدقيقة",
    fields: [
      { key: "growth", label: "Growth", type: "select", options: ["No Growth", "Growth detected", "MRSA", "Pseudomonas"], required: true },
      { key: "organism", label: "Organism(s)", type: "text" },
      { key: "sensitivity", label: "Sensitivity / Resistance", type: "text" },
    ],
  },
  {
    id: "cdiff",
    name: "C. difficile Toxin A & B",
    nameAr: "سموم C. difficile",
    code: "CDIFF",
    category: "microbiology",
    categoryAr: "الأحياء الدقيقة",
    fields: [
      { key: "toxin_ab", label: "Toxin A & B", type: "select", options: ["Not Detected", "Detected"], required: true },
      { key: "gdh", label: "GDH Antigen", type: "select", options: ["Not Detected", "Detected"] },
    ],
  },
  {
    id: "h_pylori",
    name: "H. pylori Antigen / Antibody",
    nameAr: "هيليكوباكتر بيلوري",
    code: "HPYL",
    category: "microbiology",
    categoryAr: "الأحياء الدقيقة",
    fields: [
      { key: "stool_ag", label: "Stool Antigen", type: "select", options: ["Negative", "Positive"], required: true },
      { key: "igg", label: "IgG Antibody", type: "select", options: ["Negative", "Equivocal", "Positive"] },
      { key: "igm", label: "IgM Antibody", type: "select", options: ["Negative", "Positive"] },
    ],
  },

  // ─── CSF ANALYSIS ─────────────────────────────────────────────────────────────
  {
    id: "csf",
    name: "CSF Analysis",
    nameAr: "تحليل السائل الدماغي الشوكي",
    code: "CSF",
    category: "csf",
    categoryAr: "تحليل السائل النخاعي",
    fields: [
      { key: "color", label: "Color / Appearance", type: "select", options: ["Clear & Colorless", "Cloudy", "Xanthochromic", "Bloody", "Pink"], required: true },
      { key: "opening_pressure", label: "Opening Pressure", unit: "cmH₂O", refRange: "6 – 25", refMin: 6, refMax: 25, type: "number" },
      { key: "wbc_csf", label: "WBC Count", unit: "cells/µL", refRange: "0 – 5", refMax: 5, criticalHigh: 100, type: "number", required: true },
      { key: "neutro_pct", label: "Neutrophils %", unit: "%", refRange: "0", type: "number" },
      { key: "lympho_pct", label: "Lymphocytes %", unit: "%", refRange: "60 – 70", type: "number" },
      { key: "rbc_csf", label: "RBC Count", unit: "cells/µL", refRange: "0", type: "number" },
      { key: "glucose_csf", label: "Glucose", unit: "mg/dL", refRange: "45 – 80 (≥2/3 serum)", refMin: 45, refMax: 80, criticalLow: 20, type: "number", required: true },
      { key: "protein_csf", label: "Protein", unit: "mg/dL", refRange: "15 – 45", refMin: 15, refMax: 45, criticalHigh: 200, type: "number", required: true },
      { key: "ldh_csf", label: "LDH", unit: "U/L", type: "number" },
      { key: "gram_stain", label: "Gram Stain", type: "text" },
      { key: "india_ink", label: "India Ink", type: "select", options: ["Not Done", "Negative", "Positive"] },
    ],
  },

  // ─── PEDIATRIC & NEONATAL ─────────────────────────────────────────────────────
  {
    id: "newborn_tsh",
    name: "Neonatal TSH Screen",
    nameAr: "فحص TSH لحديثي الولادة",
    code: "NEO-TSH",
    category: "pediatric",
    categoryAr: "طب الأطفال وحديثي الولادة",
    fields: [
      { key: "neo_tsh", label: "Neonatal TSH", unit: "mIU/L", refRange: "< 20 (day 3-5)", refMax: 20, criticalHigh: 40, type: "number", required: true },
    ],
  },
  {
    id: "blood_lead",
    name: "Blood Lead Level",
    nameAr: "مستوى الرصاص في الدم",
    code: "LEAD",
    category: "pediatric",
    categoryAr: "طب الأطفال وحديثي الولادة",
    fields: [
      { key: "lead", label: "Blood Lead Level", unit: "µg/dL", refRange: "< 3.5", refMax: 3.5, criticalHigh: 45, type: "number", required: true },
    ],
  },
  {
    id: "sweat_chloride",
    name: "Sweat Chloride Test (Cystic Fibrosis)",
    nameAr: "اختبار كلوريد العرق",
    code: "SWEAT-CL",
    category: "pediatric",
    categoryAr: "طب الأطفال وحديثي الولادة",
    fields: [
      { key: "chloride", label: "Sweat Chloride", unit: "mmol/L", refRange: "< 30 (normal)  30–59 (intermediate)  ≥60 (CF)", refMax: 30, criticalHigh: 60, type: "number", required: true },
      { key: "volume", label: "Sweat Volume", unit: "mg/30min", refRange: "> 75", type: "number" },
      { key: "interpretation", label: "Interpretation", type: "select", options: ["Normal (< 30)", "Intermediate (30–59)", "CF Positive (≥ 60)"] },
    ],
  },
  {
    id: "neonatal_bilirubin",
    name: "Neonatal Bilirubin",
    nameAr: "بيليروبين حديث الولادة",
    code: "NEO-BILI",
    category: "pediatric",
    categoryAr: "طب الأطفال وحديثي الولادة",
    fields: [
      { key: "total_bili", label: "Total Bilirubin", unit: "mg/dL", refRange: "Age & gestational age dependent", criticalHigh: 20, type: "number", required: true },
      { key: "direct_bili", label: "Direct Bilirubin", unit: "mg/dL", refRange: "< 2.0", refMax: 2.0, type: "number" },
      { key: "age_hours", label: "Age at Sample", unit: "hours", type: "number" },
      { key: "phototherapy", label: "On Phototherapy?", type: "select", options: ["No", "Single", "Double", "Intensive"] },
    ],
  },
  {
    id: "torch",
    name: "TORCH Panel",
    nameAr: "لوحة TORCH",
    code: "TORCH",
    category: "pediatric",
    categoryAr: "طب الأطفال وحديثي الولادة",
    fields: [
      { key: "toxo_igg", label: "Toxoplasma IgG", type: "select", options: ["Negative", "Equivocal", "Positive"], required: true },
      { key: "toxo_igm", label: "Toxoplasma IgM", type: "select", options: ["Negative", "Equivocal", "Positive"], required: true },
      { key: "rubella_igg", label: "Rubella IgG", type: "select", options: ["Negative", "Equivocal", "Positive"], required: true },
      { key: "rubella_igm", label: "Rubella IgM", type: "select", options: ["Negative", "Positive"], required: true },
      { key: "cmv_igg", label: "CMV IgG", type: "select", options: ["Negative", "Equivocal", "Positive"], required: true },
      { key: "cmv_igm", label: "CMV IgM", type: "select", options: ["Negative", "Equivocal", "Positive"], required: true },
      { key: "hsv_igg", label: "HSV IgG", type: "select", options: ["Negative", "Positive"], required: true },
    ],
  },

  // ─── TUMOR MARKERS ────────────────────────────────────────────────────────────
  {
    id: "afp",
    name: "AFP (Alpha-Fetoprotein)",
    nameAr: "ألفا فيتوبروتين",
    code: "AFP",
    category: "tumor",
    categoryAr: "مؤشرات الأورام",
    fields: [
      { key: "afp", label: "AFP", unit: "ng/mL", refRange: "< 10 (adults)", refMax: 10, criticalHigh: 400, type: "number", required: true },
    ],
  },
  {
    id: "cea",
    name: "CEA (Carcinoembryonic Antigen)",
    nameAr: "المستضد السرطاني الجنيني",
    code: "CEA",
    category: "tumor",
    categoryAr: "مؤشرات الأورام",
    fields: [
      { key: "cea", label: "CEA", unit: "ng/mL", refRange: "< 3.0 (NS)  < 5.0 (S)", refMax: 3.0, type: "number", required: true },
    ],
  },
  {
    id: "beta_hcg",
    name: "Beta-hCG",
    nameAr: "هرمون الحمل",
    code: "BHCG",
    category: "tumor",
    categoryAr: "مؤشرات الأورام",
    fields: [
      { key: "beta_hcg", label: "Beta-hCG", unit: "mIU/mL", refRange: "Non-pregnant: < 5", refMax: 5, type: "number", required: true },
    ],
  },

  // ─── HORMONES ─────────────────────────────────────────────────────────────────
  {
    id: "sex_hormones",
    name: "Sex Hormones Panel",
    nameAr: "لوحة الهرمونات الجنسية",
    code: "SEX-HOR",
    category: "hormones",
    categoryAr: "الهرمونات",
    fields: [
      { key: "fsh", label: "FSH", unit: "mIU/mL", refRange: "Variable by age/sex", type: "number" },
      { key: "lh", label: "LH", unit: "mIU/mL", type: "number" },
      { key: "estradiol", label: "Estradiol (E2)", unit: "pg/mL", type: "number" },
      { key: "testosterone", label: "Total Testosterone", unit: "ng/dL", type: "number" },
      { key: "progesterone", label: "Progesterone", unit: "ng/mL", type: "number" },
      { key: "dheas", label: "DHEA-S", unit: "µg/dL", type: "number" },
      { key: "prolactin", label: "Prolactin", unit: "ng/mL", refRange: "M: 2–18  F: 2–29", type: "number" },
      { key: "shbg", label: "SHBG", unit: "nmol/L", type: "number" },
    ],
  },
  {
    id: "uric_acid",
    name: "Uric Acid",
    nameAr: "حمض اليوريك",
    code: "UA-URIC",
    category: "renal",
    categoryAr: "وظائف الكلى",
    fields: [
      { key: "uric_acid", label: "Uric Acid", unit: "mg/dL", refRange: "M: 3.4–7.0  F: 2.4–6.0", refMin: 2.4, refMax: 7.0, criticalHigh: 12, type: "number", required: true },
    ],
  },
  {
    id: "amylase_lipase",
    name: "Amylase & Lipase",
    nameAr: "الأميليز والليباز",
    code: "AMY-LIP",
    category: "chemistry",
    categoryAr: "الكيمياء الحيوية",
    fields: [
      { key: "amylase", label: "Amylase", unit: "U/L", refRange: "30 – 110", refMin: 30, refMax: 110, criticalHigh: 1000, type: "number", required: true },
      { key: "lipase", label: "Lipase", unit: "U/L", refRange: "10 – 140", refMin: 10, refMax: 140, criticalHigh: 1000, type: "number", required: true },
    ],
  },
];

export function findTest(nameOrCode: string): LabTest | undefined {
  const q = nameOrCode.trim().toLowerCase();
  return LAB_TESTS.find(
    (t) =>
      t.name.toLowerCase() === q ||
      t.code.toLowerCase() === q ||
      t.id.toLowerCase() === q ||
      t.name.toLowerCase().includes(q) ||
      t.code.toLowerCase().includes(q)
  );
}

export function assessResult(
  fields: ResultField[],
  values: Record<string, string>
): "normal" | "abnormal" | "critical" {
  let worst: "normal" | "abnormal" | "critical" = "normal";
  for (const field of fields) {
    if (field.type !== "number") continue;
    const raw = values[field.key];
    if (!raw) continue;
    const n = parseFloat(raw);
    if (isNaN(n)) continue;
    if (
      (field.criticalLow !== undefined && n < field.criticalLow) ||
      (field.criticalHigh !== undefined && n > field.criticalHigh)
    ) {
      return "critical";
    }
    if (
      (field.refMin !== undefined && n < field.refMin) ||
      (field.refMax !== undefined && n > field.refMax)
    ) {
      worst = "abnormal";
    }
  }
  return worst;
}

export function fieldStatus(field: ResultField, value: string): "normal" | "abnormal" | "critical" | null {
  if (field.type !== "number" || !value) return null;
  const n = parseFloat(value);
  if (isNaN(n)) return null;
  if (
    (field.criticalLow !== undefined && n < field.criticalLow) ||
    (field.criticalHigh !== undefined && n > field.criticalHigh)
  ) return "critical";
  if (
    (field.refMin !== undefined && n < field.refMin) ||
    (field.refMax !== undefined && n > field.refMax)
  ) return "abnormal";
  return "normal";
}
