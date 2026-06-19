// In-memory unit assignment store
// NOTE: Resets on server restart. Migrate to DB columns for production.

// userId → unitId
export const userUnitMap = new Map<number, number>();

// unitId → Set of patientIds
export const unitPatientsMap = new Map<number, Set<number>>();

// patientId → unitId  (reverse lookup)
export const patientUnitMap = new Map<number, number>();

export function assignUserToUnit(userId: number, unitId: number): void {
  userUnitMap.set(userId, unitId);
}

export function assignPatientToUnit(patientId: number, unitId: number): void {
  // Remove from old unit if present
  const prevUnitId = patientUnitMap.get(patientId);
  if (prevUnitId !== undefined && prevUnitId !== unitId) {
    unitPatientsMap.get(prevUnitId)?.delete(patientId);
  }
  // Add to new unit
  if (!unitPatientsMap.has(unitId)) {
    unitPatientsMap.set(unitId, new Set());
  }
  unitPatientsMap.get(unitId)!.add(patientId);
  patientUnitMap.set(patientId, unitId);
}

export function removePatientFromUnit(patientId: number): void {
  const unitId = patientUnitMap.get(patientId);
  if (unitId !== undefined) {
    unitPatientsMap.get(unitId)?.delete(patientId);
    patientUnitMap.delete(patientId);
  }
}

export function getPatientsInUnit(unitId: number): number[] {
  return [...(unitPatientsMap.get(unitId) ?? [])];
}

export function getUnitForUser(userId: number): number | undefined {
  return userUnitMap.get(userId);
}

export function getUnitForPatient(patientId: number): number | undefined {
  return patientUnitMap.get(patientId);
}
