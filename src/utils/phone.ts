export const SYRIAN_PHONE_REGEX = /^\+9639\d{8}$/;

export function normalizePhone(input: string): string {
  const cleaned = input.replace(/[\s\-()]/g, '');
  return cleaned;
}

export function isValidSyrianPhone(input: string): boolean {
  return SYRIAN_PHONE_REGEX.test(normalizePhone(input));
}

export function formatSyrianPhone(input: string): string {
  const n = normalizePhone(input);
  if (!SYRIAN_PHONE_REGEX.test(n)) return input;
  const country = n.slice(0, 4);
  const national = n.slice(4);
  return `${country} ${national.slice(0, 2)} ${national.slice(2, 5)} ${national.slice(5)}`;
}

export function localPhone(input: string): string {
  const n = normalizePhone(input);
  return SYRIAN_PHONE_REGEX.test(n) ? `0${n.slice(4)}` : n;
}
