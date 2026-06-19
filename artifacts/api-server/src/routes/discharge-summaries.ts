import { Router } from "express";
import fs from "fs";
import path from "path";

const router = Router();

const STORE_PATH = path.join("/tmp", "discharge_summaries.json");

interface DischargeSummary {
  id: number;
  patientId: number;
  createdBy: number | null;
  createdByName: string | null;
  admissionDate: string | null;
  dischargeDate: string;
  primaryDiagnosis: string;
  secondaryDiagnoses: string | null;
  hospitalCourse: string;
  conditionAtDischarge: string;
  dischargeMedications: string | null;
  followUpInstructions: string | null;
  dietInstructions: string | null;
  activityRestrictions: string | null;
  createdAt: string;
}

function load(): { summaries: DischargeSummary[]; nextId: number } {
  try {
    if (fs.existsSync(STORE_PATH)) {
      const raw = fs.readFileSync(STORE_PATH, "utf8");
      return JSON.parse(raw);
    }
  } catch { }
  return { summaries: [], nextId: 1 };
}

function save(summaries: DischargeSummary[], nextId: number) {
  try {
    fs.writeFileSync(STORE_PATH, JSON.stringify({ summaries, nextId }, null, 2), "utf8");
  } catch (e) {
    console.error("Failed to persist discharge summaries:", e);
  }
}

let { summaries, nextId } = load();

router.get("/discharge-summaries", (_req, res): void => {
  const patientId = _req.query.patientId ? parseInt(_req.query.patientId as string, 10) : null;
  let result = [...summaries];
  if (patientId) result = result.filter(s => s.patientId === patientId);
  result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  res.json(result);
});

router.get("/discharge-summaries/:id", (req, res): void => {
  const id = parseInt(req.params.id, 10);
  const s = summaries.find(x => x.id === id);
  if (!s) { res.status(404).json({ error: "Not found" }); return; }
  res.json(s);
});

router.post("/discharge-summaries", (req, res): void => {
  const {
    patientId, createdBy, createdByName,
    admissionDate, dischargeDate, primaryDiagnosis, secondaryDiagnoses,
    hospitalCourse, conditionAtDischarge, dischargeMedications,
    followUpInstructions, dietInstructions, activityRestrictions,
  } = req.body;

  if (!patientId || !primaryDiagnosis || !dischargeDate || !hospitalCourse) {
    res.status(400).json({ error: "patientId, primaryDiagnosis, dischargeDate, hospitalCourse are required" });
    return;
  }

  const entry: DischargeSummary = {
    id: nextId++,
    patientId: Number(patientId),
    createdBy: createdBy ?? null,
    createdByName: createdByName ?? null,
    admissionDate: admissionDate ?? null,
    dischargeDate,
    primaryDiagnosis,
    secondaryDiagnoses: secondaryDiagnoses ?? null,
    hospitalCourse,
    conditionAtDischarge: conditionAtDischarge ?? "good",
    dischargeMedications: dischargeMedications ?? null,
    followUpInstructions: followUpInstructions ?? null,
    dietInstructions: dietInstructions ?? null,
    activityRestrictions: activityRestrictions ?? null,
    createdAt: new Date().toISOString(),
  };

  summaries.push(entry);
  save(summaries, nextId);
  res.status(201).json(entry);
});

export default router;
