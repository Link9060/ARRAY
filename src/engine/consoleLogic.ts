/** Deliberately fictional software dispatch ritual. No hardware interface. */
export const SOFTWARE_CHECK_COUNT = 3;
export function toggleDispatchCheck(enabled: readonly number[], index: number): number[] {
  if (!Number.isInteger(index) || index < 0 || index > 5) return [...enabled];
  if (enabled.includes(index)) return enabled.filter(value => value !== index);
  return enabled.length >= SOFTWARE_CHECK_COUNT ? [...enabled] : [...enabled, index];
}
export function dispatchReady(checks: readonly number[], keyA: boolean, keyB: boolean, coverOpen: boolean, hasObjective: boolean) {
  return checks.length === SOFTWARE_CHECK_COUNT
    && new Set(checks).size === SOFTWARE_CHECK_COUNT
    && checks.every(n => Number.isInteger(n) && n >= 0 && n < 6)
    && keyA && keyB && coverOpen && hasObjective;
}
