export {
  getAuthedUser,
  getOrCreateRestaurant,
  getOrCreateRestaurant as getOrCreateOnboarding,
  getRestaurantSnapshot,
  getOnboardingSnapshot,
  getOnboardingCompletion,
  getNextOnboardingStep,
  getStepIndex,
  getMaxUnlockedStepIndex,
  shouldRedirectOnboardingPath,
} from "@/lib/restaurant/server";
