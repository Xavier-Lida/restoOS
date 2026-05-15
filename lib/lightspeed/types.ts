/** Row shape for `public.lightspeed_connections` (see docs/sql/lightspeed_supabase.sql). */
export type LightspeedConnectionRow = {
  id: string;
  user_id: string;
  environment: "staging" | "prod";
  status: "active" | "needs_reauth" | "revoked";
  last_sync_at: string | null;
  last_backfill_at: string | null;
  last_error: string | null;
  consecutive_failures: number;
  business_id: string | null;
};
