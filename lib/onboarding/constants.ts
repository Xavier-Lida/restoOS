import { type ProfileValue } from "@/lib/onboarding/types";

export const profileOptions: Array<{
  value: ProfileValue;
  title: string;
  icon: string;
  bullets: string[];
}> = [
  {
    value: "dominant",
    title: "Dominant",
    icon: "crown",
    bullets: ["Positionnement premium", "Qualité avant volume", "Marque protégée"],
  },
  {
    value: "chasseur",
    title: "Chasseur",
    icon: "zap",
    bullets: ["Prix compétitifs", "Volume prioritaire", "Conquête de marché"],
  },
  {
    value: "securitaire",
    title: "Sécuritaire",
    icon: "shield",
    bullets: ["Ajustements progressifs", "Trajectoire stable", "Zéro surprise"],
  },
];

export const onboardingSteps = [
  { key: "owner", label: "Propriétaire", href: "/onboarding/owner" },
  { key: "restaurant", label: "Établissement", href: "/onboarding/restaurant" },
  { key: "profile", label: "Profil", href: "/onboarding/profile" },
  { key: "menu", label: "Menu", href: "/onboarding/menu" },
  { key: "review", label: "Révision", href: "/onboarding/review" },
] as const;
