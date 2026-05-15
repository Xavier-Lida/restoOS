import { ONBOARDING_MENU_PDF_BUCKET } from "@/lib/onboarding/menu-import-constants";

const onboardingMenuPdfStorageErrorHandlers: ReadonlyArray<{
  test: (raw: string) => boolean;
  message: string;
}> = [
  {
    test: (raw) => /bucket.*not found/i.test(raw),
    message: `Le bucket Supabase Storage «${ONBOARDING_MENU_PDF_BUCKET}» est absent. Appliquez la migration «onboarding_menu_pdf_storage» (supabase db push / link) ou exécutez la section Storage dans docs/sql/onboarding_supabase.sql.`,
  },
];

/** User-facing message for failed onboarding menu PDF uploads to Storage. */
export function onboardingMenuPdfStorageUploadMessage(rawMessage: string): string {
  const handler = onboardingMenuPdfStorageErrorHandlers.find((h) => h.test(rawMessage));
  return handler?.message ?? rawMessage;
}
