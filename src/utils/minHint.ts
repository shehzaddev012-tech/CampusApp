/** Helper line under a field with a minimum length: tells the person why the button is still off. */
export function minHint(value: string, min: number, max?: number): string {
  const n = value.trim().length;
  if (n < min) {
    return `Write at least ${min} characters (${n}/${min})`;
  }
  return max ? `${value.length}/${max}` : '';
}
