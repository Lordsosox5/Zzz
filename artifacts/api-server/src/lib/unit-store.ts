// In-memory unit assignment store
// NOTE: Resets on server restart. Migrate to DB columns for production.

// userId → unitId
export const userUnitMap = new Map<number, number>();

// unitId → Set of patientIds
export const unitPatientsMap = new Map<number, Set<number>>();

export function assignUserToUnit(userId: number, unitId: number): void {
  userUnitMap.set(userId, unitId);
}

export function assignPatientToUnit(patientId: number, unitId: number): void {
  if (!unitPatientsMap.has(unitId)) {
    unitPatientsMap.set(unitId, new Set());
  }
  unitPatientsMap.get(unitId)!.add(patientId);
}

export function getPatientsInUnit(unitId: number): number[] {
  return [...(unitPatientsMap.get(unitId) ?? [])];
}

export function getUnitForUser(userId: number): number | undefined {
  return userUnitMap.get(userId);
}
