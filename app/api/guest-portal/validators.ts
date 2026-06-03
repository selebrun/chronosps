export function asNonEmptyString(value: unknown, fieldName: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`El campo ${fieldName} es obligatorio.`);
  }
  return value.trim();
}

export function asBoolean(value: unknown, defaultValue = false): boolean {
  return typeof value === 'boolean' ? value : defaultValue;
}

export function asRecord(value: unknown, fieldName: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`El campo ${fieldName} debe ser un objeto JSON válido.`);
  }
  return value as Record<string, unknown>;
}

export function safeJsonError(error: unknown) {
  return { error: true, message: error instanceof Error ? error.message : 'Error interno.' };
}
