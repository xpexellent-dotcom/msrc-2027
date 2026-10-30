import { ABSTRACT_RUBRIC, abstractWeightedTotal } from "../../features/staff-portal/abstract-rubric.ts";

export type GateObservation = { gate: number; observation: string };
export function fixedAbstractRubric(criteria: readonly { id: string; min: number; max: number; weight?: number }[]): boolean {
  return criteria.length === 7 && ABSTRACT_RUBRIC.every(c => criteria.some(r => r.id === c.id && r.min === 1 && r.max === 4 && r.weight === c.weight));
}
export function decodeGateObservations(value: unknown): GateObservation[] | null {
  if (!Array.isArray(value) || value.length !== 6) return null;
  const rows: GateObservation[] = [];
  for (const v of value) {
    if (!v || typeof v !== "object" || Object.keys(v).sort().join() !== "gate,observation"
      || !Number.isInteger(v.gate) || v.gate < 1 || v.gate > 6 || typeof v.observation !== "string"
      || !v.observation.trim() || v.observation.length > 1000 || /[\u0000-\u001f\u007f]/.test(v.observation)) return null;
    rows.push({ gate: v.gate, observation: v.observation });
  }
  return new Set(rows.map(r => r.gate)).size === 6 ? rows : null;
}
export { abstractWeightedTotal };
