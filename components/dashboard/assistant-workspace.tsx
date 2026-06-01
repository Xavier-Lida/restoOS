"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { AssistantChartCard } from "@/components/dashboard/assistant-chart-card";
import { AssistantChatPanel } from "@/components/dashboard/assistant-chat-panel";
import { Button } from "@/components/ui/button";
import { consumeAssistantStream } from "@/lib/assistant/consume-assistant-stream";
import { clearAssistantState, loadAssistantState, saveAssistantState } from "@/lib/assistant/storage";
import type {
  AssistantChatMessage,
  AssistantTurnDone,
  StoredAssistantChart,
} from "@/lib/schemas/assistant-turn";
import { cn } from "@/lib/utils";

export function AssistantWorkspace() {
  const [hydrated, setHydrated] = useState(false);
  const [messages, setMessages] = useState<AssistantChatMessage[]>([]);
  const [charts, setCharts] = useState<StoredAssistantChart[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [streamingContent, setStreamingContent] = useState<string | null>(null);
  const [chips, setChips] = useState<string[]>([]);
  const [followUps, setFollowUps] = useState<string[]>([]);
  const turnIndexRef = useRef(0);
  const persistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hasConversation =
    messages.some((m) => m.role === "assistant") ||
    (streamingContent !== null && streamingContent.length > 0);
  const hasCharts = charts.length > 0;

  useEffect(() => {
    const stored = loadAssistantState();
    if (stored) {
      setMessages(stored.messages);
      setCharts(stored.charts);
      turnIndexRef.current = stored.messages.filter((m) => m.role === "assistant").length;
    }
    setHydrated(true);
  }, []);

  const schedulePersist = useCallback((nextMessages: AssistantChatMessage[], nextCharts: StoredAssistantChart[]) => {
    if (persistTimerRef.current) {
      clearTimeout(persistTimerRef.current);
    }
    persistTimerRef.current = setTimeout(() => {
      saveAssistantState({
        messages: nextMessages,
        charts: nextCharts,
        updatedAt: new Date().toISOString(),
      });
    }, 300);
  }, []);

  const handleNewChat = useCallback(() => {
    if (messages.length > 0 && !window.confirm("Démarrer une nouvelle discussion ? L'historique local sera effacé.")) {
      return;
    }
    clearAssistantState();
    setMessages([]);
    setCharts([]);
    setChips([]);
    setFollowUps([]);
    setInput("");
    setError(null);
    setStreamingContent(null);
    setStatusMessage(null);
    turnIndexRef.current = 0;
  }, [messages.length]);

  const applyTurnDone = useCallback(
    (done: AssistantTurnDone) => {
      const assistantMessage: AssistantChatMessage = {
        role: "assistant",
        content: done.answerMarkdown,
        refused: done.refused,
        refusalKind: done.refusalKind,
      };

      const turnIndex = turnIndexRef.current;
      turnIndexRef.current += 1;

      const stamped: StoredAssistantChart[] = done.charts.map((c) => ({
        ...c,
        turnIndex,
        createdAt: new Date().toISOString(),
      }));

      setMessages((prev) => {
        const nextMsgs = [...prev, assistantMessage];
        setCharts((prevCharts) => {
          const nextCharts = stamped.length > 0 ? [...prevCharts, ...stamped] : prevCharts;
          schedulePersist(nextMsgs, nextCharts);
          return nextCharts;
        });
        return nextMsgs;
      });

      setChips(done.suggestions);
      setFollowUps(done.followUpQuestions);
      setStreamingContent(null);
      setStatusMessage(null);
    },
    [schedulePersist],
  );

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || busy) return;

      setError(null);
      setBusy(true);
      setChips([]);
      setFollowUps([]);
      setStreamingContent("");
      setStatusMessage("Préparation…");

      const userMessage: AssistantChatMessage = { role: "user", content: trimmed };
      const nextMessages = [...messages, userMessage];
      setMessages(nextMessages);
      setInput("");

      let streamAccum = "";

      try {
        const res = await fetch("/api/dashboard/assistant/stream", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: nextMessages }),
        });

        await consumeAssistantStream(res, {
          onStatus: (message) => setStatusMessage(message),
          onDelta: (delta) => {
            streamAccum += delta;
            setStreamingContent(streamAccum);
            setStatusMessage(null);
          },
          onDone: (payload) => {
            applyTurnDone(payload);
          },
          onError: (message) => {
            setError(message);
            setMessages(messages);
            setStreamingContent(null);
            setStatusMessage(null);
          },
        });
      } catch {
        setError("Impossible de joindre le serveur.");
        setMessages(messages);
        setStreamingContent(null);
        setStatusMessage(null);
      } finally {
        setBusy(false);
      }
    },
    [applyTurnDone, busy, messages],
  );

  const handleSend = useCallback(() => {
    void sendMessage(input);
  }, [input, sendMessage]);

  const handleChipSelect = useCallback(
    (text: string) => {
      setInput(text);
      void sendMessage(text);
    },
    [sendMessage],
  );

  if (!hydrated) {
    return (
      <div className="flex min-h-[420px] items-center justify-center text-sm text-muted-foreground">
        Chargement…
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-end">
        <Button type="button" variant="outline" size="sm" onClick={handleNewChat} disabled={busy}>
          Nouvelle discussion
        </Button>
      </div>

      <div
        className={cn(
          "grid min-h-[min(72vh,720px)] gap-6 transition-[grid-template-columns] duration-300 ease-out",
          hasConversation
            ? "lg:grid-cols-[1fr_min(380px,32%)]"
            : "grid-cols-1",
        )}
      >
        {hasConversation ? (
          <section
            className={cn(
              "flex min-h-0 flex-col overflow-hidden rounded-xl border border-border/70 bg-card/40",
              hasCharts ? "opacity-100" : "hidden lg:flex lg:opacity-100",
            )}
            aria-label="Graphiques"
          >
            <div className="flex-1 overflow-y-auto p-4">
              {hasCharts ? (
                <div className="mx-auto flex max-w-2xl flex-col gap-6">
                  {charts.map((chart) => (
                    <AssistantChartCard key={`${chart.id}-${chart.createdAt}`} chart={chart} />
                  ))}
                </div>
              ) : (
                <div className="flex h-full min-h-[200px] items-center justify-center px-6 text-center text-sm text-muted-foreground">
                  Les graphiques apparaîtront ici lorsqu&apos;ils accompagneront une réponse.
                </div>
              )}
            </div>
          </section>
        ) : null}

        <section
          className={cn(
            "flex min-h-0 flex-col",
            hasConversation ? "lg:max-h-[min(72vh,720px)]" : "mx-auto w-full max-w-xl justify-center",
          )}
        >
          <div
            className={cn(
              "flex min-h-[min(72vh,720px)] flex-col rounded-xl border border-border/70 bg-card p-4",
              !hasConversation && "shadow-sm",
            )}
          >
            <AssistantChatPanel
              messages={messages}
              streamingContent={streamingContent}
              statusMessage={statusMessage}
              busy={busy}
              error={error}
              chips={chips}
              followUps={followUps}
              input={input}
              onInputChange={setInput}
              onSend={handleSend}
              onChipSelect={handleChipSelect}
              compact={hasConversation}
            />
          </div>
        </section>
      </div>
    </div>
  );
}
