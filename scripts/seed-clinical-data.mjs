/**
 * Seed realistic clinical data for Almuzini Children Hospital EHR
 * Inserts: lab orders, prescriptions, appointments, clinical notes
 * Run: node scripts/seed-clinical-data.mjs
 */
import { createClient } from "@supabase/supabase-js";
import ws from "ws";

const SUPABASE_URL      = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("❌  SUPABASE_URL or SUPABASE_ANON_KEY not set.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
  realtime: { transport: ws },
});

// ── helpers ────────────────────────────────────────────────────────────────────
const rand  = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randN = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}
function daysFromNow(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString();
}
function setHour(isoString, h, m = 0) {
  const d = new Date(isoString);
  d.setHours(h, m, 0, 0);
  return d.toISOString();
}

// ── static pools ──────────────────────────────────────────────────────────────
const DOCTOR_IDS   = [1, 3, 5, 8, 18];   // admin, specialist, EM, MO, HO
const PATIENT_IDS  = Array.from({ length: 50 }, (_, i) => i + 23); // 23–72

// ── LAB TESTS ─────────────────────────────────────────────────────────────────
const LAB_PANEL = [
  { testName: "Complete Blood Count (CBC)",   testCode: "CBC",    unit: "cells/µL", referenceRange: "WBC 4–10 K/µL, Hgb 11–16 g/dL", results: ["Normal CBC", "Mild leukocytosis", "Anaemia — Hgb 8.2 g/dL", "Thrombocytopenia"] },
  { testName: "Malaria RDT",                  testCode: "MAL",    unit: null,       referenceRange: "Negative", results: ["Negative", "P. falciparum Positive", "P. vivax Positive"] },
  { testName: "Blood Culture",                testCode: "BCUL",   unit: null,       referenceRange: "No growth", results: ["No growth after 5 days", "Salmonella typhi — sensitive to ceftriaxone", "Staphylococcus aureus MSSA"] },
  { testName: "CRP (C-Reactive Protein)",     testCode: "CRP",    unit: "mg/L",     referenceRange: "< 10 mg/L", results: ["3.2", "45.7", "120.4", "8.1"] },
  { testName: "Serum Electrolytes",           testCode: "ELEC",   unit: "mEq/L",    referenceRange: "Na 135–145, K 3.5–5.0, Cl 98–106", results: ["Na 138, K 4.1, Cl 102 — Normal", "Na 128, K 3.0 — Hyponatraemia + Hypokalaemia", "Na 151 — Hypernatraemia"] },
  { testName: "Blood Glucose (Random)",       testCode: "RBG",    unit: "mmol/L",   referenceRange: "3.9–11.1 mmol/L", results: ["5.6", "3.1 — Hypoglycaemia", "18.4 — Hyperglycaemia", "7.8"] },
  { testName: "Renal Function Tests (RFT)",   testCode: "RFT",    unit: "µmol/L",   referenceRange: "Creatinine 27–88 µmol/L", results: ["Creatinine 52, Urea 4.5 — Normal", "Creatinine 210, Urea 14.2 — Elevated"] },
  { testName: "Liver Function Tests (LFT)",   testCode: "LFT",    unit: "U/L",      referenceRange: "ALT < 40, AST < 40, Bili < 17", results: ["Normal LFT", "ALT 120, AST 98 — Elevated transaminases", "Total bilirubin 85 µmol/L — Jaundice"] },
  { testName: "Urine Full Examination (UFE)", testCode: "UFE",    unit: null,       referenceRange: "No WBC/RBC cast", results: ["Normal — no significant findings", "WBC > 100/HPF — Pyuria consistent with UTI", "Proteinuria 3+ — Nephrotic range"] },
  { testName: "Stool Full Examination",       testCode: "SFE",    unit: null,       referenceRange: "No ova/cysts", results: ["No ova or parasites seen", "Giardia lamblia cysts detected", "Blood and mucus — dysentery picture"] },
  { testName: "Serum Ferritin",               testCode: "FERR",   unit: "µg/L",     referenceRange: "12–150 µg/L", results: ["8 — Iron deficiency", "24 — Low normal", "320 — Elevated"] },
  { testName: "Haemoglobin Electrophoresis",  testCode: "HbEP",   unit: null,       referenceRange: "HbA > 95%", results: ["HbSS — Sickle cell disease", "HbAS — Sickle cell trait", "HbF elevated — Thalassaemia", "Normal pattern"] },
  { testName: "Widal Test",                   testCode: "WIDAL",  unit: null,       referenceRange: "O < 1:80, H < 1:160", results: ["O 1:320, H 1:640 — Positive", "O 1:40 — Negative", "O 1:160 — Borderline"] },
  { testName: "Serum Albumin",               testCode: "ALB",    unit: "g/dL",     referenceRange: "3.5–5.0 g/dL", results: ["2.1 — Hypoalbuminaemia", "3.8 — Normal", "4.5 — Normal"] },
  { testName: "Peripheral Blood Film",        testCode: "PBF",    unit: null,       referenceRange: "Normal morphology", results: ["Normal morphology", "Sickle cells and target cells seen", "Hypochromic microcytic anaemia — IDA picture", "Ring forms (P. falciparum) 2% parasitaemia"] },
  { testName: "HbA1c",                        testCode: "HBA1C",  unit: "%",        referenceRange: "< 7.5% (paediatric target)", results: ["9.8 — Poor control", "7.2 — Acceptable control", "6.4 — Good control"] },
  { testName: "Serum Calcium",                testCode: "CA",     unit: "mmol/L",   referenceRange: "2.1–2.6 mmol/L", results: ["1.8 — Hypocalcaemia", "2.4 — Normal", "2.9 — Hypercalcaemia"] },
  { testName: "Thyroid Function Tests (TFT)", testCode: "TFT",    unit: "mIU/L",    referenceRange: "TSH 0.5–5.0", results: ["TSH 12.4, FT4 8 — Hypothyroidism", "TSH 0.1, FT4 28 — Hyperthyroidism", "TSH 2.3 — Normal"] },
  { testName: "ESR",                          testCode: "ESR",    unit: "mm/hr",    referenceRange: "< 20 mm/hr", results: ["4 — Normal", "68 — Elevated", "112 — Markedly elevated"] },
  { testName: "Urine Culture & Sensitivity",  testCode: "UCUL",   unit: null,       referenceRange: "No significant growth", results: ["No significant growth", "E. coli > 100,000 CFU/mL — sensitive to nitrofurantoin", "Klebsiella spp. — ESBL positive"] },
];

// ── PRESCRIPTIONS ─────────────────────────────────────────────────────────────
const RX_POOL = [
  { drugName: "Amoxicillin",         drugNameAr: "أموكسيسيلين",   dosage: "250 mg",  frequency: "Three times daily",  duration: "7 days",  route: "Oral",  instructions: "Take with food" },
  { drugName: "Ceftriaxone",         drugNameAr: "سيفترياكسون",    dosage: "1 g",     frequency: "Once daily",         duration: "10 days", route: "IV",    instructions: "Administer over 30 minutes" },
  { drugName: "Paracetamol",         drugNameAr: "باراسيتامول",    dosage: "15 mg/kg",frequency: "Every 6 hours PRN",  duration: "5 days",  route: "Oral",  instructions: "Do not exceed 4 doses in 24 hours" },
  { drugName: "Ibuprofen",           drugNameAr: "إيبوبروفين",     dosage: "10 mg/kg",frequency: "Every 8 hours",      duration: "5 days",  route: "Oral",  instructions: "Take with food; avoid if renal impairment" },
  { drugName: "Salbutamol Inhaler",  drugNameAr: "سالبوتامول",     dosage: "2 puffs", frequency: "Every 4–6 hours PRN",duration: "As needed",route: "Inhaled","instructions": "Shake well before use; use spacer device" },
  { drugName: "Prednisolone",        drugNameAr: "بريدنيزولون",    dosage: "1 mg/kg", frequency: "Once daily (morning)",duration: "5 days", route: "Oral",  instructions: "Do not stop abruptly; taper if course > 7 days" },
  { drugName: "Oral Rehydration Solution (ORS)", drugNameAr: "محلول الإماهة الفموية", dosage: "200 mL after each loose stool", frequency: "As required", duration: "Until diarrhoea resolves", route: "Oral", instructions: "Prepare per sachet instructions" },
  { drugName: "Zinc Sulfate",        drugNameAr: "زنك سلفات",      dosage: "20 mg",   frequency: "Once daily",         duration: "10 days", route: "Oral",  instructions: "For children > 6 months" },
  { drugName: "Chloroquine",         drugNameAr: "كلوروكين",       dosage: "10 mg/kg",frequency: "Once daily",         duration: "3 days",  route: "Oral",  instructions: "For P. vivax malaria only" },
  { drugName: "Artemether-Lumefantrine", drugNameAr: "أرتيميثر-لوميفانترين", dosage: "Weight-based (24/120 mg tab)", frequency: "Twice daily", duration: "3 days", route: "Oral", instructions: "Take with food; complete full course" },
  { drugName: "Ferrous Sulfate",     drugNameAr: "كبريتات الحديد", dosage: "6 mg/kg elemental iron", frequency: "Once daily", duration: "3 months", route: "Oral", instructions: "Take on empty stomach; juice enhances absorption" },
  { drugName: "Vitamin D3",          drugNameAr: "فيتامين د٣",     dosage: "1000 IU", frequency: "Once daily",         duration: "3 months", route: "Oral",  instructions: "Take with a fatty meal" },
  { drugName: "Metronidazole",       drugNameAr: "ميترونيدازول",   dosage: "15 mg/kg",frequency: "Three times daily",  duration: "7 days",  route: "Oral",  instructions: "Avoid alcohol during treatment" },
  { drugName: "Cefotaxime",          drugNameAr: "سيفوتاكسيم",     dosage: "50 mg/kg",frequency: "Every 8 hours",      duration: "14 days", route: "IV",    instructions: "For meningitis — continue full course" },
  { drugName: "Phenobarbitone",      drugNameAr: "فينوباربيتال",   dosage: "5 mg/kg", frequency: "Once nightly",       duration: "Long-term", route: "Oral", instructions: "Do not stop without consultant approval" },
  { drugName: "Insulin Regular",     drugNameAr: "أنسولين منتظم",  dosage: "0.1 unit/kg/hr", frequency: "Continuous infusion", duration: "Until DKA resolved", route: "IV", instructions: "Monitor blood glucose hourly; target 10–14 mmol/L" },
  { drugName: "Normal Saline 0.9%",  drugNameAr: "محلول ملحي طبيعي", dosage: "10 mL/kg over 20 min", frequency: "Once (resuscitation)", duration: "Single dose", route: "IV", instructions: "Reassess after each bolus" },
  { drugName: "Gentamicin",          drugNameAr: "جنتاميسين",      dosage: "7.5 mg/kg", frequency: "Once daily",       duration: "7 days",  route: "IV",    instructions: "Monitor renal function and hearing; avoid prolonged use" },
  { drugName: "Azithromycin",        drugNameAr: "أزيثروميسين",    dosage: "10 mg/kg",frequency: "Once daily",         duration: "3 days",  route: "Oral",  instructions: "Take 1 hour before or 2 hours after meals" },
  { drugName: "Amikacin",            drugNameAr: "أميكاسين",       dosage: "15 mg/kg",frequency: "Once daily",         duration: "7 days",  route: "IV",    instructions: "Monitor serum levels and renal function" },
  { drugName: "Fluconazole",         drugNameAr: "فلوكونازول",     dosage: "6 mg/kg", frequency: "Once daily",         duration: "14 days", route: "Oral",  instructions: "Check LFTs if prolonged use" },
  { drugName: "Cetirizine",          drugNameAr: "سيتيريزين",      dosage: "5 mg",    frequency: "Once nightly",       duration: "2 weeks", route: "Oral",  instructions: "May cause drowsiness" },
  { drugName: "Hydrocortisone",      drugNameAr: "هيدروكورتيزون",  dosage: "4 mg/kg", frequency: "Every 6 hours",      duration: "3 days",  route: "IV",    instructions: "For severe anaphylaxis or adrenal crisis" },
  { drugName: "Furosemide",          drugNameAr: "فوروسيميد",      dosage: "1 mg/kg", frequency: "Twice daily",        duration: "7 days",  route: "Oral",  instructions: "Monitor electrolytes; replace potassium if needed" },
];

// ── SOAP NOTE TEMPLATES ────────────────────────────────────────────────────────
const SOAP_TEMPLATES = [
  {
    subjective: "Mother reports child has had high-grade fever (up to 39.8°C) for 3 days with cough, runny nose, and poor oral intake. No rash or difficulty breathing noted.",
    objective: "T 39.2°C, HR 118 bpm, RR 28/min, SpO2 97% RA. Alert, mildly distressed. Pharynx hyperaemic, no exudate. Chest clear bilaterally. CXR: no consolidation.",
    assessment: "Acute upper respiratory tract infection (URTI). No evidence of bacterial pneumonia.",
    plan: "Paracetamol 15 mg/kg/dose q6h PRN fever. Push oral fluids. Return if SpO2 drops < 95% or respiratory distress develops. Review in 48 hours.",
  },
  {
    subjective: "Child presented with 4-day history of high fever (39–40°C), frontal headache, and abdominal pain. History of travel to malaria-endemic area. No vomiting.",
    objective: "T 39.6°C, HR 122 bpm, BP 96/58 mmHg, SpO2 98%. Pallor ++, no jaundice. Abdomen: splenomegaly ++ (4 cm below costal margin). Malaria RDT: P. falciparum positive.",
    assessment: "Uncomplicated P. falciparum malaria with moderate anaemia (Hgb 8.4 g/dL).",
    plan: "Artemether-Lumefantrine weight-based dosing BD × 3 days. Paracetamol PRN. Monitor Hgb after 2 weeks. Patient education on mosquito net use.",
  },
  {
    subjective: "3-year-old brought in with 2-day history of watery diarrhoea (> 8 episodes/day), vomiting × 5, and reduced urine output. No blood in stool.",
    objective: "T 37.8°C, HR 140 bpm, capillary refill 3 seconds. Eyes sunken, skin turgor decreased, dry mucous membranes. Weight loss 8% from baseline. Stool: watery, no blood.",
    assessment: "Acute gastroenteritis with moderate-severe dehydration. Likely viral aetiology (rotavirus).",
    plan: "IV Normal Saline 20 mL/kg bolus; reassess. ORS 75 mL/kg over 4 hours for rehydration. Zinc sulfate 20 mg OD × 10 days. Reassess hydration status in 4 hours. Stool culture sent.",
  },
  {
    subjective: "7-year-old known asthmatic presents with 2-hour history of worsening wheeze and chest tightness. Has been using salbutamol inhaler every 30 minutes at home with no improvement.",
    objective: "T 37.1°C, HR 105 bpm, RR 36/min, SpO2 88% RA. Marked intercostal and subcostal recession. Diffuse expiratory wheeze bilaterally. No cyanosis.",
    assessment: "Acute severe asthma exacerbation. PEFR not measurable due to child's distress.",
    plan: "O2 via mask targeting SpO2 ≥ 94%. Salbutamol 2.5 mg nebulised q20 min × 3 doses. IV hydrocortisone 4 mg/kg stat. CXR to exclude pneumothorax. Admit for monitoring. Consider MgSO4 if no improvement.",
  },
  {
    subjective: "Mother reports 5-year-old has been having daily headaches, progressive weakness of the right side, and one generalised tonic-clonic seizure yesterday lasting 2 minutes. Developmental milestones previously normal.",
    objective: "T 37.0°C, GCS 14 (E4V4M6). Right-sided facial droop. Right arm pronator drift positive. Deep tendon reflexes brisk on right. No papilloedema on fundoscopy. Kernig's and Brudzinski's signs negative.",
    assessment: "New-onset focal seizure with post-ictal right hemiparesis — space-occupying lesion vs. encephalitis to be excluded. Urgent CT head required.",
    plan: "CT head with contrast STAT. Neurology consult. IV access. Monitor GCS hourly. Keep nil by mouth pending imaging. Phenobarbitone loading dose if further seizures.",
  },
  {
    subjective: "8-year-old with known sickle cell disease (HbSS) presents with severe bilateral leg pain rated 8/10, started 12 hours ago after swimming in cold water. No fever or chest pain.",
    objective: "T 37.4°C, HR 98 bpm, RR 22/min, SpO2 95% RA. Pallor ++. Tenderness bilateral thighs and calves. No bony tenderness. Chest clear. Spleen not palpable (autosplenectomy).",
    assessment: "Sickle cell vaso-occlusive crisis (painful crisis). No evidence of acute chest syndrome.",
    plan: "Analgesia: paracetamol + ibuprofen regular; morphine 0.1 mg/kg IV if inadequate. IV hydration 1.5× maintenance. O2 if SpO2 < 95%. CBC, reticulocyte count, cross-match. Transfuse if Hgb drops > 2 g/dL below baseline. Haematology review.",
  },
  {
    subjective: "Parents report 10-month-old has had generalised oedema for 2 weeks — puffy face in the morning, swollen legs. No fever. Urine output normal. No recent illness.",
    objective: "T 37.0°C, HR 110 bpm, BP 95/60 mmHg. Periorbital and pitting pedal oedema +++. Ascites mild. No skin rash. Urine dipstick: protein 4+, no blood. Serum albumin 1.8 g/dL.",
    assessment: "Nephrotic syndrome — most likely minimal change disease at this age. Urine protein:creatinine ratio elevated.",
    plan: "Admit. 24-hour urine protein collection. Renal function, lipid profile, HBsAg. Prednisolone 2 mg/kg/day (max 60 mg) × 4 weeks. Fluid and sodium restriction. Furosemide if symptomatic oedema. Paediatric nephrology referral.",
  },
  {
    subjective: "12-year-old known T1DM, on insulin, presents with 12-hour history of nausea, vomiting × 8, abdominal pain, and polyuria. Last insulin dose 2 days ago (ran out of supply).",
    objective: "T 36.9°C, HR 130 bpm, RR 32/min (Kussmaul), BP 90/55 mmHg. Lethargic, GCS 13. Acetone breath. Dry mucous membranes. Blood glucose 27.3 mmol/L. Blood gas: pH 7.18, HCO3 8, BE -18. Ketonuria 4+.",
    assessment: "Diabetic ketoacidosis (DKA) — severe. No precipitating infection identified.",
    plan: "ICU/HDU level care. IV NS 10 mL/kg bolus × 1. Start DKA protocol: fluids at 1.5× maintenance. Insulin infusion 0.1 unit/kg/hr. Hourly glucose monitoring. Replace K+ once K < 5.5 and urine output confirmed. Endocrinology review.",
  },
  {
    subjective: "1-year-old brought in by parents with fever (38.9°C) for 2 days, crying inconsolably, and pulling at left ear. No cough or rash. Breast-feeding reduced.",
    objective: "T 38.7°C, HR 145 bpm, RR 30/min. Irritable, not consolable. Left tympanic membrane erythematous and bulging with loss of landmarks. Right ear normal. Throat clear. No neck stiffness.",
    assessment: "Acute otitis media — left ear. Bacterial aetiology likely.",
    plan: "Amoxicillin 80 mg/kg/day in 3 divided doses × 10 days. Paracetamol PRN fever and pain. Nasal saline drops. Review in 48–72 hours if no improvement. Refer to ENT if recurrent or no improvement after 5 days.",
  },
  {
    subjective: "11-year-old with 3-day history of productive cough, high fever (39.5°C), right-sided chest pain worse on inspiration, and progressive breathlessness. No TB contact.",
    objective: "T 39.4°C, HR 128 bpm, RR 38/min, SpO2 89% RA. Dull percussion right lower zone. Decreased air entry and bronchial breathing right lower lobe. CXR: right lower lobe consolidation with small effusion.",
    assessment: "Community-acquired pneumonia (CAP) — right lower lobe, moderate-severe. Pleural effusion requires monitoring.",
    plan: "Admit. O2 via mask to maintain SpO2 ≥ 95%. IV Ceftriaxone 100 mg/kg/day. IV Azithromycin for atypical cover. Blood culture × 2, sputum AFB × 3. Chest physiotherapy. Repeat CXR in 48 hours. Paediatric pulmonology consult if effusion increases.",
  },
  {
    subjective: "6-year-old presents with 5-day history of high fever, sore throat, and inability to swallow solids. Two similar episodes in the past year.",
    objective: "T 39.0°C, HR 115 bpm. Enlarged, erythematous tonsils with white exudate bilaterally. Anterior cervical lymphadenopathy. Rapid strep test positive.",
    assessment: "Acute tonsillitis — group A Streptococcal (GAS) pharyngitis confirmed.",
    plan: "Penicillin V 250 mg TDS × 10 days (or Amoxicillin 50 mg/kg/day). Paracetamol PRN. Cold fluids and ice chips for comfort. Discuss tonsillectomy with ENT if ≥ 3 episodes per year. Throat swab for culture sent.",
  },
  {
    subjective: "3-week-old neonate brought in with jaundice noted since day 2 of life, poor feeding, and dark urine. Born at home, not vaccinated, not on any medications.",
    objective: "T 36.8°C, HR 152 bpm. Jaundice extending to palms and soles (Kramer zone V). Sclerae icteric. Liver 3 cm below costal margin. Spleen 2 cm. Urine: dark. Stool: pale. Total bilirubin 278 µmol/L (direct 180).",
    assessment: "Prolonged neonatal jaundice with predominantly conjugated hyperbilirubinaemia — biliary atresia vs. neonatal hepatitis must be excluded urgently.",
    plan: "Urgent paediatric hepatology and surgical review. Liver function tests, GGT, ultrasound hepatobiliary. TORCH screen. Hepatitis B antigen. Kasai portoenterostomy to be considered if biliary atresia confirmed. Vitamin K supplementation.",
  },
];

// ── APPOINTMENT DATA ─────────────────────────────────────────────────────────
const APPOINTMENT_TYPES   = ["outpatient", "emergency", "follow-up", "inpatient-review"];
const APPOINTMENT_STATUSES = ["completed", "completed", "completed", "scheduled", "scheduled", "no-show"];
const COMPLAINTS = [
  "Fever and cough for 3 days",
  "Abdominal pain and vomiting",
  "Difficulty breathing and wheeze",
  "Generalised body swelling",
  "Bloody diarrhoea and dehydration",
  "Seizure — first episode",
  "Ear pain and fever",
  "Rash and fever",
  "Severe malaria follow-up",
  "Routine diabetic review",
  "Sickle cell crisis",
  "Post-operative review",
  "Vaccination visit",
  "Growth monitoring",
  "Anaemia workup",
  "Headache and vomiting",
  "Urinary tract infection",
  "Allergic reaction",
  "Failure to thrive",
  "Tonsillitis and sore throat",
];

// ── MAIN SEED FUNCTION ────────────────────────────────────────────────────────
let inserted = { labs: 0, prescriptions: 0, appointments: 0, notes: 0 };

async function batchInsert(table, rows) {
  const BATCH = 50;
  for (let i = 0; i < rows.length; i += BATCH) {
    const { error } = await supabase.from(table).insert(rows.slice(i, i + BATCH));
    if (error) {
      console.error(`  ⚠️  ${table} batch error:`, error.message);
    }
  }
}

// ── 1. CLINICAL NOTES ─────────────────────────────────────────────────────────
async function seedNotes() {
  console.log("📝  Seeding clinical notes…");
  const rows = [];

  for (const patientId of PATIENT_IDS) {
    const count = randN(2, 5);
    for (let i = 0; i < count; i++) {
      const tpl = rand(SOAP_TEMPLATES);
      const daysAgoN = randN(1, 120);
      const content = `S: ${tpl.subjective}\n\nO: ${tpl.objective}\n\nA: ${tpl.assessment}\n\nP: ${tpl.plan}`;
      rows.push({
        patient_id: patientId,
        author_id:  rand(DOCTOR_IDS),
        type:       "soap",
        subjective: tpl.subjective,
        objective:  tpl.objective,
        assessment: tpl.assessment,
        plan:       tpl.plan,
        content,
        created_at: daysAgo(daysAgoN),
        updated_at: daysAgo(daysAgoN),
      });
    }
  }

  await batchInsert("clinical_notes", rows);
  inserted.notes = rows.length;
  console.log(`   ✅  ${rows.length} clinical notes inserted`);
}

// ── 2. LAB ORDERS ─────────────────────────────────────────────────────────────
async function seedLabs() {
  console.log("🔬  Seeding lab orders…");
  const rows = [];

  for (const patientId of PATIENT_IDS) {
    const count = randN(3, 7);
    for (let i = 0; i < count; i++) {
      const test     = rand(LAB_PANEL);
      const daysAgoN = randN(1, 150);
      const resulted = Math.random() > 0.2;           // 80% resulted
      const isCrit   = resulted && Math.random() < 0.08; // 8% critical
      const resultTxt = rand(test.results);

      rows.push({
        patient_id:      patientId,
        ordered_by_id:   rand(DOCTOR_IDS),
        test_name:       test.testName,
        test_code:       test.testCode,
        priority:        rand(["routine", "routine", "urgent", "stat"]),
        status:          resulted ? "resulted" : rand(["pending", "collected"]),
        result:          resulted ? resultTxt : null,
        result_value:    resulted ? resultTxt.split(" ")[0] : null,
        unit:            test.unit,
        reference_range: test.referenceRange,
        is_critical:     isCrit,
        notes:           null,
        collected_at:    resulted ? daysAgo(daysAgoN)                                    : null,
        resulted_at:     resulted ? new Date(new Date(daysAgo(daysAgoN)).getTime() + 4*3600*1000).toISOString() : null,
        created_at:      daysAgo(daysAgoN),
        updated_at:      daysAgo(daysAgoN),
      });
    }
  }

  await batchInsert("lab_orders", rows);
  inserted.labs = rows.length;
  console.log(`   ✅  ${rows.length} lab orders inserted`);
}

// ── 3. PRESCRIPTIONS ──────────────────────────────────────────────────────────
async function seedPrescriptions() {
  console.log("💊  Seeding prescriptions…");
  const rows = [];

  for (const patientId of PATIENT_IDS) {
    const count = randN(2, 5);
    for (let i = 0; i < count; i++) {
      const rx       = rand(RX_POOL);
      const daysAgoN = randN(1, 180);
      const status   = rand(["active", "active", "dispensed", "dispensed", "completed", "cancelled"]);

      rows.push({
        patient_id:    patientId,
        prescriber_id: rand(DOCTOR_IDS),
        drug_name:     rx.drugName,
        drug_name_ar:  rx.drugNameAr,
        dosage:        rx.dosage,
        frequency:     rx.frequency,
        duration:      rx.duration,
        route:         rx.route,
        instructions:  rx.instructions,
        status,
        created_at:    daysAgo(daysAgoN),
        updated_at:    daysAgo(daysAgoN),
      });
    }
  }

  await batchInsert("prescriptions", rows);
  inserted.prescriptions = rows.length;
  console.log(`   ✅  ${rows.length} prescriptions inserted`);
}

// ── 4. APPOINTMENTS ───────────────────────────────────────────────────────────
async function seedAppointments() {
  console.log("📅  Seeding appointments…");
  const rows = [];

  for (const patientId of PATIENT_IDS) {
    const count = randN(2, 6);
    for (let i = 0; i < count; i++) {
      const status    = rand(APPOINTMENT_STATUSES);
      const isPast    = status === "completed" || status === "no-show";
      const dayOffset = isPast ? -randN(1, 180) : randN(1, 30);
      const hour      = randN(8, 16);
      const scheduledAt = setHour(
        isPast ? daysAgo(Math.abs(dayOffset)) : daysFromNow(dayOffset),
        hour,
        rand([0, 15, 30, 45])
      );

      rows.push({
        patient_id:      patientId,
        doctor_id:       rand(DOCTOR_IDS),
        scheduled_at:    scheduledAt,
        duration:        rand([15, 20, 30, 30, 45, 60]),
        type:            rand(APPOINTMENT_TYPES),
        status,
        chief_complaint: rand(COMPLAINTS),
        notes:           status === "completed"
          ? rand([
              "Patient reviewed; condition improving.",
              "Follow-up arranged in 2 weeks.",
              "Referred to specialist.",
              "Bloods reviewed; no acute concerns.",
              "Medication adjusted.",
            ])
          : null,
        created_at:      daysAgo(randN(1, 200)),
        updated_at:      daysAgo(randN(0, 5)),
      });
    }
  }

  await batchInsert("appointments", rows);
  inserted.appointments = rows.length;
  console.log(`   ✅  ${rows.length} appointments inserted`);
}

// ── RUN ───────────────────────────────────────────────────────────────────────
console.log("🚀  Starting clinical data seed…\n");
await seedNotes();
await seedLabs();
await seedPrescriptions();
await seedAppointments();

console.log(`
✨  Done!
   Clinical notes:  ${inserted.notes}
   Lab orders:      ${inserted.labs}
   Prescriptions:   ${inserted.prescriptions}
   Appointments:    ${inserted.appointments}
   ─────────────────────────────
   Total records:   ${Object.values(inserted).reduce((a, b) => a + b, 0)}
`);
