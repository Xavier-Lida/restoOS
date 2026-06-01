import type { AssistantSseEvent, AssistantTurnDone } from "@/lib/schemas/assistant-turn";

export type AssistantStreamHandlers = {
  onStatus: (message: string) => void;
  onDelta: (text: string) => void;
  onDone: (payload: AssistantTurnDone) => void;
  onError: (message: string) => void;
};

export async function consumeAssistantStream(
  response: Response,
  handlers: AssistantStreamHandlers,
): Promise<void> {
  if (!response.ok) {
    let message = "Erreur réseau.";
    try {
      const data = (await response.json()) as { error?: string };
      message = data.error ?? message;
    } catch {
      /* ignore */
    }
    handlers.onError(message);
    return;
  }

  const reader = response.body?.getReader();
  if (!reader) {
    handlers.onError("Flux de réponse indisponible.");
    return;
  }

  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split("\n");
      buffer = parts.pop() ?? "";
      for (const line of parts) {
        if (!line.startsWith("data: ")) continue;
        try {
          const event = JSON.parse(line.slice(6)) as AssistantSseEvent;
          if (event.phase === "status") handlers.onStatus(event.message);
          else if (event.phase === "delta") handlers.onDelta(event.text);
          else if (event.phase === "done") handlers.onDone(event.payload);
          else if (event.phase === "error") handlers.onError(event.message);
        } catch {
          /* malformed chunk */
        }
      }
    }
  } catch {
    handlers.onError("Connexion interrompue.");
  }
}
