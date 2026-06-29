-- ============================================================
-- Almuzini Children Hospital EHR — Supabase Schema + Seed
-- Run this entire script in: Supabase Dashboard > SQL Editor
-- ============================================================

-- ─── TABLES ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  username      TEXT NOT NULL UNIQUE,
  password      TEXT NOT NULL,
  name_en       TEXT NOT NULL,
  name_ar       TEXT,
  role          TEXT NOT NULL DEFAULT 'nurse',
  department    TEXT,
  email         TEXT,
  phone         TEXT,
  avatar_url    TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS patients (
  id                SERIAL PRIMARY KEY,
  mrn               TEXT NOT NULL UNIQUE,
  name_en           TEXT NOT NULL,
  name_ar           TEXT,
  date_of_birth     TEXT NOT NULL,
  gender            TEXT NOT NULL,
  blood_group       TEXT,
  nationality       TEXT,
  national_id       TEXT,
  phone             TEXT,
  address           TEXT,
  residence         TEXT,
  weight            TEXT,
  height            TEXT,
  admission_date    TEXT,
  discharge_date    TEXT,
  guardian_name     TEXT,
  guardian_relation TEXT,
  guardian_phone    TEXT,
  allergies         TEXT,
  status            TEXT NOT NULL DEFAULT 'active',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS appointments (
  id               SERIAL PRIMARY KEY,
  patient_id       INTEGER NOT NULL,
  doctor_id        INTEGER NOT NULL,
  scheduled_at     TIMESTAMPTZ NOT NULL,
  duration         INTEGER NOT NULL DEFAULT 30,
  type             TEXT NOT NULL DEFAULT 'outpatient',
  status           TEXT NOT NULL DEFAULT 'scheduled',
  notes            TEXT,
  chief_complaint  TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS clinical_notes (
  id          SERIAL PRIMARY KEY,
  patient_id  INTEGER NOT NULL,
  author_id   INTEGER NOT NULL,
  type        TEXT NOT NULL DEFAULT 'soap',
  subjective  TEXT,
  objective   TEXT,
  assessment  TEXT,
  plan        TEXT,
  content     TEXT NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS diagnoses (
  id              SERIAL PRIMARY KEY,
  patient_id      INTEGER NOT NULL,
  icd10_code      TEXT NOT NULL,
  description     TEXT NOT NULL,
  description_ar  TEXT,
  status          TEXT NOT NULL DEFAULT 'active',
  onset_date      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS prescriptions (
  id              SERIAL PRIMARY KEY,
  patient_id      INTEGER NOT NULL,
  prescriber_id   INTEGER NOT NULL,
  drug_name       TEXT NOT NULL,
  drug_name_ar    TEXT,
  dosage          TEXT NOT NULL,
  frequency       TEXT NOT NULL,
  duration        TEXT,
  route           TEXT,
  instructions    TEXT,
  status          TEXT NOT NULL DEFAULT 'active',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lab_orders (
  id               SERIAL PRIMARY KEY,
  patient_id       INTEGER NOT NULL,
  ordered_by_id    INTEGER NOT NULL,
  test_name        TEXT NOT NULL,
  test_code        TEXT,
  priority         TEXT NOT NULL DEFAULT 'routine',
  status           TEXT NOT NULL DEFAULT 'pending',
  result           TEXT,
  result_value     TEXT,
  unit             TEXT,
  reference_range  TEXT,
  is_critical      BOOLEAN NOT NULL DEFAULT FALSE,
  notes            TEXT,
  collected_at     TIMESTAMPTZ,
  resulted_at      TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS radiology_orders (
  id                SERIAL PRIMARY KEY,
  patient_id        INTEGER NOT NULL,
  ordered_by_id     INTEGER NOT NULL,
  modality          TEXT NOT NULL,
  study_description TEXT NOT NULL,
  priority          TEXT NOT NULL DEFAULT 'routine',
  status            TEXT NOT NULL DEFAULT 'pending',
  report            TEXT,
  radiologist_id    INTEGER,
  scheduled_at      TIMESTAMPTZ,
  completed_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS invoices (
  id              SERIAL PRIMARY KEY,
  invoice_number  TEXT NOT NULL UNIQUE,
  patient_id      INTEGER NOT NULL,
  total_amount    NUMERIC(10,2) NOT NULL DEFAULT 0,
  paid_amount     NUMERIC(10,2) NOT NULL DEFAULT 0,
  discount        NUMERIC(10,2) NOT NULL DEFAULT 0,
  status          TEXT NOT NULL DEFAULT 'pending',
  payment_method  TEXT NOT NULL DEFAULT 'cash',
  insurance_id    TEXT,
  notes           TEXT,
  items           JSONB NOT NULL DEFAULT '[]',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS drugs (
  id               SERIAL PRIMARY KEY,
  name             TEXT NOT NULL,
  name_ar          TEXT,
  generic_name     TEXT,
  category         TEXT NOT NULL DEFAULT 'general',
  stock_quantity   INTEGER NOT NULL DEFAULT 0,
  min_stock_level  INTEGER NOT NULL DEFAULT 10,
  unit             TEXT NOT NULL DEFAULT 'tablet',
  unit_price       NUMERIC(10,2) NOT NULL DEFAULT 0,
  batch_number     TEXT,
  expiry_date      TEXT,
  manufacturer     TEXT,
  is_controlled    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS vaccinations (
  id                   SERIAL PRIMARY KEY,
  patient_id           INTEGER NOT NULL,
  vaccine_name         TEXT NOT NULL,
  vaccine_name_ar      TEXT,
  dose_number          INTEGER,
  administered_date    TEXT NOT NULL,
  next_due_date        TEXT,
  batch_number         TEXT,
  administered_by_id   INTEGER,
  notes                TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS growth_records (
  id                  SERIAL PRIMARY KEY,
  patient_id          INTEGER NOT NULL,
  measurement_date    TEXT NOT NULL,
  weight              NUMERIC(5,2),
  height              NUMERIC(5,2),
  head_circumference  NUMERIC(5,2),
  bmi                 NUMERIC(5,2),
  weight_percentile   NUMERIC(5,2),
  height_percentile   NUMERIC(5,2),
  bmi_percentile      NUMERIC(5,2),
  notes               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS activity_log (
  id              SERIAL PRIMARY KEY,
  type            TEXT NOT NULL,
  description     TEXT NOT NULL,
  description_ar  TEXT,
  patient_name    TEXT,
  staff_name      TEXT,
  timestamp       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS alerts (
  id           SERIAL PRIMARY KEY,
  type         TEXT NOT NULL,
  severity     TEXT NOT NULL DEFAULT 'info',
  message      TEXT NOT NULL,
  message_ar   TEXT,
  patient_name TEXT,
  is_read      BOOLEAN NOT NULL DEFAULT FALSE,
  timestamp    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admission_assessments (
  id                       SERIAL PRIMARY KEY,
  patient_id               INTEGER NOT NULL,
  author_id                INTEGER NOT NULL,
  main_complaint           TEXT,
  analysis_site            TEXT,
  analysis_onset           TEXT,
  analysis_character       TEXT,
  analysis_radiation       TEXT,
  analysis_aggravation     TEXT,
  analysis_relieving       TEXT,
  analysis_associations    TEXT,
  systemic_review          TEXT,
  past_medical_history     TEXT,
  family_history           TEXT,
  drug_history             TEXT,
  social_history           TEXT,
  developmental_history    TEXT,
  history_summary          TEXT,
  provisional_diagnosis    TEXT,
  examination_summary      TEXT,
  chest_exam               TEXT,
  cns_exam                 TEXT,
  abdomen_exam             TEXT,
  vital_bp                 TEXT,
  vital_pr                 TEXT,
  vital_rr                 TEXT,
  vital_gcs                TEXT,
  vital_rbg                TEXT,
  investigations_ordered   TEXT,
  management_plan          TEXT,
  morning_follow_up        TEXT,
  evening_follow_up        TEXT,
  discharge_letter         TEXT,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── DISABLE ROW LEVEL SECURITY (anon key access) ────────────

ALTER TABLE users                DISABLE ROW LEVEL SECURITY;
ALTER TABLE patients             DISABLE ROW LEVEL SECURITY;
ALTER TABLE appointments         DISABLE ROW LEVEL SECURITY;
ALTER TABLE clinical_notes       DISABLE ROW LEVEL SECURITY;
ALTER TABLE diagnoses            DISABLE ROW LEVEL SECURITY;
ALTER TABLE prescriptions        DISABLE ROW LEVEL SECURITY;
ALTER TABLE lab_orders           DISABLE ROW LEVEL SECURITY;
ALTER TABLE radiology_orders     DISABLE ROW LEVEL SECURITY;
ALTER TABLE invoices             DISABLE ROW LEVEL SECURITY;
ALTER TABLE drugs                DISABLE ROW LEVEL SECURITY;
ALTER TABLE vaccinations         DISABLE ROW LEVEL SECURITY;
ALTER TABLE growth_records       DISABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log         DISABLE ROW LEVEL SECURITY;
ALTER TABLE alerts               DISABLE ROW LEVEL SECURITY;
ALTER TABLE admission_assessments DISABLE ROW LEVEL SECURITY;

-- ─── GRANT FULL ACCESS TO ANON ROLE ──────────────────────────

GRANT ALL ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon;

-- ─── SEED: DEMO USERS ─────────────────────────────────────────

INSERT INTO users (username, password, name_en, name_ar, role, department, email) VALUES
  ('admin',            'admin123',    'System Administrator',   'مدير النظام',          'super_admin',           'Administration',  'admin@almuzini.sa'),
  ('dr.sarah',         'password123', 'Dr. Sarah Al-Rashidi',   'د. سارة الراشدي',      'pediatric_consultant',  'Pediatrics',      'sarah@almuzini.sa'),
  ('dr.khalid',        'password123', 'Dr. Khalid Al-Otaibi',   'د. خالد العتيبي',      'pediatric_specialist',  'Pediatrics',      'khalid@almuzini.sa'),
  ('nurse.fatima',     'password123', 'Fatima Al-Zahrani',      'فاطمة الزهراني',       'nurse',                 'General Ward',    'fatima@almuzini.sa'),
  ('dr.omar',          'password123', 'Dr. Omar Al-Ghamdi',     'د. عمر الغامدي',       'emergency_physician',   'Emergency',       'omar@almuzini.sa'),
  ('pharmacist.noor',  'password123', 'Noor Al-Harbi',          'نور الحربي',           'pharmacist',            'Pharmacy',        'noor@almuzini.sa'),
  ('lab.tech',         'password123', 'Ahmed Al-Qahtani',       'أحمد القحطاني',        'lab_technician',        'Laboratory',      'lab@almuzini.sa'),
  ('billing.officer',  'password123', 'Maha Al-Shehri',         'مها الشهري',           'billing_officer',       'Billing',         'billing@almuzini.sa')
ON CONFLICT (username) DO NOTHING;

-- ─── SEED: SAMPLE PATIENTS ────────────────────────────────────

INSERT INTO patients (mrn, name_en, name_ar, date_of_birth, gender, blood_group, nationality, guardian_name, guardian_relation, guardian_phone, status) VALUES
  ('AMH-00001', 'Yusuf Al-Mutairi',    'يوسف المطيري',    '2018-03-14', 'male',   'A+', 'Saudi',   'Abdullah Al-Mutairi', 'Father', '+966501234567', 'active'),
  ('AMH-00002', 'Layan Al-Dosari',     'ليان الدوسري',    '2020-07-22', 'female', 'O+', 'Saudi',   'Reem Al-Dosari',      'Mother', '+966502345678', 'active'),
  ('AMH-00003', 'Omar Al-Harbi',       'عمر الحربي',      '2015-11-05', 'male',   'B+', 'Saudi',   'Waleed Al-Harbi',     'Father', '+966503456789', 'active'),
  ('AMH-00004', 'Norah Al-Shammari',   'نورة الشمري',     '2019-01-30', 'female', 'AB+','Saudi',  'Hana Al-Shammari',    'Mother', '+966504567890', 'active'),
  ('AMH-00005', 'Faisal Al-Qahtani',   'فيصل القحطاني',   '2017-09-18', 'male',   'A-', 'Saudi',   'Saad Al-Qahtani',     'Father', '+966505678901', 'active')
ON CONFLICT (mrn) DO NOTHING;

-- ─── SEED: SAMPLE APPOINTMENTS ───────────────────────────────

INSERT INTO appointments (patient_id, doctor_id, scheduled_at, type, status, chief_complaint) VALUES
  (1, 2, NOW() + INTERVAL '2 hours',   'outpatient', 'scheduled', 'Fever and cough'),
  (2, 3, NOW() + INTERVAL '4 hours',   'outpatient', 'scheduled', 'Follow-up checkup'),
  (3, 2, NOW() - INTERVAL '1 hour',    'outpatient', 'completed', 'Ear infection'),
  (4, 5, NOW() + INTERVAL '6 hours',   'emergency',  'scheduled', 'Abdominal pain'),
  (5, 3, NOW() - INTERVAL '30 minutes','outpatient', 'in_progress','Routine checkup');

-- ─── SEED: SAMPLE DRUGS ───────────────────────────────────────

INSERT INTO drugs (name, name_ar, generic_name, category, stock_quantity, min_stock_level, unit, unit_price, is_controlled) VALUES
  ('Paracetamol 500mg',   'باراسيتامول',    'Paracetamol',   'analgesic',   500, 50,  'tablet', 0.50,  false),
  ('Amoxicillin 250mg',   'أموكسيسيلين',    'Amoxicillin',   'antibiotic',  200, 30,  'capsule', 1.20, false),
  ('Ibuprofen Syrup',     'إيبوبروفين',     'Ibuprofen',     'analgesic',   80,  20,  'bottle',  8.00, false),
  ('Cetirizine 10mg',     'سيتريزين',       'Cetirizine',    'antihistamine',150,25,  'tablet',  0.75, false),
  ('Salbutamol Inhaler',  'سالبوتامول',     'Salbutamol',    'bronchodilator',40,15, 'inhaler', 25.00, false),
  ('Morphine 10mg/ml',    'مورفين',         'Morphine',      'opioid',      20,  10,  'vial',   45.00, true),
  ('Vitamin D Drops',     'فيتامين د',      'Cholecalciferol','vitamin',    300, 40,  'bottle',  15.00, false),
  ('ORS Sachet',          'محلول إماهة',    'ORS',           'electrolyte', 8,   30, 'sachet',   2.50, false)
ON CONFLICT DO NOTHING;

-- ─── SEED: SAMPLE ALERTS ──────────────────────────────────────

INSERT INTO alerts (type, severity, message, message_ar, patient_name, is_read) VALUES
  ('critical_lab',  'critical', 'Critical potassium level for Yusuf Al-Mutairi', 'مستوى بوتاسيوم حرج ليوسف المطيري', 'Yusuf Al-Mutairi', false),
  ('low_stock',     'warning',  'ORS Sachet stock below minimum level',           'مخزون محلول الإماهة أقل من الحد الأدنى', null,               false),
  ('appointment',   'info',     'Dr. Sarah has 3 appointments in the next hour',  'للدكتورة سارة 3 مواعيد في الساعة القادمة', null,             false);

-- ─── SEED: SAMPLE ACTIVITY LOG ────────────────────────────────

INSERT INTO activity_log (type, description, description_ar, patient_name, staff_name) VALUES
  ('admission',    'Patient Yusuf Al-Mutairi admitted to General Ward', 'تم قبول يوسف المطيري في الجناح العام', 'Yusuf Al-Mutairi',  'Fatima Al-Zahrani'),
  ('lab_order',    'Lab order created: CBC for Layan Al-Dosari',        'طلب مختبر: CBC لليان الدوسري',          'Layan Al-Dosari',   'Dr. Sarah Al-Rashidi'),
  ('prescription', 'Prescription issued: Amoxicillin for Omar Al-Harbi','وصفة طبية: أموكسيسيلين لعمر الحربي',   'Omar Al-Harbi',     'Dr. Khalid Al-Otaibi'),
  ('appointment',  'Appointment completed: Norah Al-Shammari',          'اكتمل الموعد: نورة الشمري',             'Norah Al-Shammari', 'Dr. Sarah Al-Rashidi');

-- ─── MIGRATION: Add mother_blood_group column ────────────────────────────────
ALTER TABLE patients ADD COLUMN IF NOT EXISTS mother_blood_group text;
