export const profileValues = ["dominant", "chasseur", "securitaire"] as const;
export type ProfileValue = (typeof profileValues)[number];

export type OnboardingStatus = "in_progress" | "completed";

export type OnboardingRecord = {
  id: string;
  user_id: string;
  owner_name: string | null;
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
  onboarding_id: string;
  item_name: string;
  category: string;
  price_cad: number;
  notes: string | null;
  position: number;
};

export type OnboardingSnapshot = {
  onboarding: OnboardingRecord;
  menuItems: MenuItemRecord[];
};
