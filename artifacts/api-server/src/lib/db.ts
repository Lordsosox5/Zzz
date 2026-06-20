export { db } from "@workspace/db";
export {
  usersTable,
  patientsTable,
  appointmentsTable,
  clinicalNotesTable,
  diagnosesTable,
  prescriptionsTable,
  labOrdersTable,
  radiologyOrdersTable,
  invoicesTable,
  drugsTable,
  vaccinationsTable,
  growthRecordsTable,
  activityLogTable,
  alertsTable,
  admissionAssessmentsTable,
  dischargeSummariesTable,
  unitsTable,
} from "@workspace/db";

export function dbError(
  error: unknown,
  res: import("express").Response,
  status = 500,
): boolean {
  if (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(status).json({ error: message });
    return true;
  }
  return false;
}
