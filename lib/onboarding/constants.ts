import { type ProfileValue } from "@/lib/onboarding/types";

export const profileOptions: Array<{
  value: ProfileValue;
  title: string;
  subtitle: string;
  guidance: string;
}> = [
  {
    value: "dominant",
    title: "Le Dominant",
    subtitle: "Positionnement premium et prix affirmes",
    guidance:
      "Vous valorisez la qualite et assumez un positionnement haut de gamme pour proteger la perception de votre marque.",
  },
  {
    value: "chasseur",
    title: "Le Chasseur",
    subtitle: "Conquete volume et agressivite commerciale",
    guidance:
      "Vous cherchez a capter le marche avec des prix competitifs pour faire grossir rapidement votre volume de ventes.",
  },
  {
    value: "securitaire",
    title: "Le Securitaire",
    subtitle: "Stabilite, previsibilite et maitrise du risque",
    guidance:
      "Vous privilegiez des ajustements prudents afin de conserver une trajectoire stable et previsible pour votre entreprise.",
  },
];

export const onboardingSteps = [
  { key: "owner", label: "Propriétaire", href: "/onboarding/owner" },
  { key: "restaurant", label: "Établissement", href: "/onboarding/restaurant" },
  { key: "profile", label: "Profil", href: "/onboarding/profile" },
  { key: "menu", label: "Menu", href: "/onboarding/menu" },
  { key: "review", label: "Révision", href: "/onboarding/review" },
] as const;
