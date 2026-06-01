export const profileValues = ["dominant", "chasseur", "securitaire"] as const;
export type ProfileValue = (typeof profileValues)[number];

export type OnboardingStatus = "in_progress" | "completed";

export type MenuVersionSource = "manual" | "pdf_import" | "pricing_suggestion" | "csv_import";

/** Row in `restaurants` — `restaurant_name` mirrors `display_name` for legacy UI. */
export type RestaurantRecord = {
  id: string;
  user_id: string;
  owner_name: string | null;
  display_name: string | null;
  restaurant_name: string | null;
  address_line: string | null;
  city: string | null;
  postal_code: string | null;
  dominant_profile: ProfileValue | null;
  onboarding_status: OnboardingStatus;
  completed_at: string | null;
};

export type MenuItemRecord = {
  id: string;
  restaurant_id: string;
  /** @deprecated use restaurant_id */
  onboarding_id: string;
  item_name: string;
  category: string;
  price_cad: number;
  notes: string | null;
  position: number;
};

export type RestaurantSnapshot = {
  restaurant: RestaurantRecord;
  menuItems: MenuItemRecord[];
};

/** @deprecated use RestaurantSnapshot */
export type OnboardingSnapshot = {
  onboarding: RestaurantRecord;
  menuItems: MenuItemRecord[];
};
