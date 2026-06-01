import "server-only";

export function getRestoOsSubscriptionCad(): number {
  const raw =
    process.env.RESTOOS_SUBSCRIPTION_CAD ?? process.env.RESTOPRIX_SUBSCRIPTION_CAD;
  const value = raw ? Number.parseFloat(raw) : 179;
  if (!Number.isFinite(value) || value <= 0) {
    return 179;
  }
  return value;
}
