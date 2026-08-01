export function uniqueSuffix(): string {
  return `${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
}

export function randomTestEmail(): string {
  return `e2e-${uniqueSuffix()}@example.com`;
}

export function randomTestName(): string {
  return `E2E User ${uniqueSuffix()}`;
}
