export function toNumber(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

export function toInteger(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.trunc(value);
  }

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

export function toText(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

export function firstText(...values: unknown[]) {
  for (const value of values) {
    const text = toText(value);
    if (text) {
      return text;
    }
  }

  return null;
}

export function toBoolean(value: unknown) {
  if (typeof value === 'boolean') {
    return value;
  }
  if (value === 'true') return true;
  if (value === 'false') return false;
  return false;
}

export function toSubGrades(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const record = value as Record<string, unknown>;
  const subGrades = {
    centering: toNumber(record.centering) ?? undefined,
    corners: toNumber(record.corners) ?? undefined,
    edges: toNumber(record.edges) ?? undefined,
    surface: toNumber(record.surface) ?? undefined,
  };

  if (Object.values(subGrades).every((item) => item === undefined)) {
    return null;
  }

  return subGrades;
}
