/** Bucket Supabase (privé) pour les PDF de menu onboarding. Créer le bucket et les policies (voir docs/sql). */
export const ONBOARDING_MENU_PDF_BUCKET =
  process.env.NEXT_PUBLIC_ONBOARDING_MENU_BUCKET ?? "onboarding-menu-pdfs";

export const ONBOARDING_MENU_PDF_MAX_BYTES = 10 * 1024 * 1024;
