import "server-only";

export function getRestoprixSubscriptionCad(): number {
  const raw = process.env.RESTOPRIX_SUBSCRIPTION_CAD;
  const value = raw ? Number.parseFloat(raw) : 179;
  if (!Number.isFinite(value) || value <= 0) {
    return 179;
  }
  return value;
}
