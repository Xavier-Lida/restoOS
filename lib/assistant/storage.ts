import {
  ASSISTANT_STORAGE_KEY,
  type AssistantPersistedState,
} from "@/lib/schemas/assistant-turn";

export function loadAssistantState(): AssistantPersistedState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(ASSISTANT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AssistantPersistedState;
    if (!Array.isArray(parsed.messages) || !Array.isArray(parsed.charts)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function saveAssistantState(state: AssistantPersistedState): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(ASSISTANT_STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* quota or private mode */
  }
}

export function clearAssistantState(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(ASSISTANT_STORAGE_KEY);
}
