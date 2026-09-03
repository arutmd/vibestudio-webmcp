export class ValidationError extends Error {
  readonly status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "ValidationError";
    this.status = status;
  }
}

export function asObject(value: unknown, label = "request"): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ValidationError(`${label} must be an object`);
  }
  return value as Record<string, unknown>;
}

export function asText(
  value: unknown,
  label: string,
  max: number,
  options: { required?: boolean; allowEmpty?: boolean } = {},
): string {
  const required = options.required ?? true;
  if (value === undefined || value === null) {
    if (required) throw new ValidationError(`${label} is required`);
    return "";
  }
  if (typeof value !== "string") throw new ValidationError(`${label} must be text`);
  const clean = value.trim();
  if (!clean && required && !options.allowEmpty) {
    throw new ValidationError(`${label} cannot be empty`);
  }
  if (clean.length > max) throw new ValidationError(`${label} must be ${max} characters or fewer`);
  return clean;
}

export function asOptionalText(value: unknown, label: string, max: number): string | undefined {
  if (value === undefined) return undefined;
  return asText(value, label, max, { required: false, allowEmpty: true });
}

export function asEnum<T extends string>(
  value: unknown,
  label: string,
  allowed: readonly T[],
): T {
  if (typeof value !== "string" || !allowed.includes(value as T)) {
    throw new ValidationError(`${label} must be one of: ${allowed.join(", ")}`);
  }
  return value as T;
}

export function asOptionalEnum<T extends string>(
  value: unknown,
  label: string,
  allowed: readonly T[],
): T | undefined {
  if (value === undefined) return undefined;
  return asEnum(value, label, allowed);
}

export function asStringList(value: unknown, label: string, maxItems = 12, maxLength = 60): string[] {
  if (!Array.isArray(value)) throw new ValidationError(`${label} must be a list`);
  if (value.length > maxItems) throw new ValidationError(`${label} can contain at most ${maxItems} items`);
  const out = value.map((item, index) => asText(item, `${label}[${index}]`, maxLength));
  return [...new Set(out)];
}

export function asOptionalStringList(
  value: unknown,
  label: string,
  maxItems = 12,
  maxLength = 60,
): string[] | undefined {
  if (value === undefined) return undefined;
  return asStringList(value, label, maxItems, maxLength);
}

export function asHttpUrl(value: unknown, label: string, nullable = true): string | null {
  if ((value === null || value === "" || value === undefined) && nullable) return null;
  const raw = asText(value, label, 1200);
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new ValidationError(`${label} must be a valid URL`);
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new ValidationError(`${label} must use http or https`);
  }
  return parsed.toString();
}

export function asVersion(value: unknown, label = "expected_version"): number | undefined {
  if (value === undefined) return undefined;
  if (!Number.isInteger(value) || Number(value) < 1) {
    throw new ValidationError(`${label} must be a positive integer`);
  }
  return Number(value);
}

export function asIdempotencyKey(value: unknown): string | null {
  if (value === undefined || value === null || value === "") return null;
  const key = asText(value, "idempotency_key", 120);
  if (!/^[A-Za-z0-9._:-]+$/.test(key)) {
    throw new ValidationError("idempotency_key contains unsupported characters");
  }
  return key;
}

export function errorResponse(err: unknown): { error: string; status: number } {
  if (err instanceof ValidationError) return { error: err.message, status: err.status };
  return { error: err instanceof Error ? err.message : String(err), status: 500 };
}
