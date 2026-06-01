"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { AssistantBetaBadge } from "@/components/dashboard/assistant-beta-badge";
import { AssistantChartCard } from "@/components/dashboard/assistant-chart-card";
import { AssistantChatPanel } from "@/components/dashboard/assistant-chat-panel";
import { Button } from "@/components/ui/button";
import { consumeAssistantStream } from "@/lib/assistant/consume-assistant-stream";
import { clearAssistantState, loadAssistantState, saveAssistantState } from "@/lib/assistant/storage";
import { useSmoothedStream } from "@/lib/hooks/use-smoothed-stream";
import type {
  AssistantChatMessage,
  AssistantTurnDone,
  StoredAssistantChart,
} from "@/lib/schemas/assistant-turn";
import { cn } from "@/lib/utils";

type AssistantWorkspaceProps = {
  restaurantName: string;
};

export function AssistantWorkspace({ restaurantName }: AssistantWorkspaceProps) {
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

  const smoothedContent = useSmoothedStream(streamingContent);

  const hasConversation =
    messages.some((m) => m.role === "assistant") ||
    (smoothedContent !== null && smoothedContent.length > 0);
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

  // Persist whenever messages or charts change (debounced)
  useEffect(() => {
    if (!hydrated) return;
    if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
    persistTimerRef.current = setTimeout(() => {
      saveAssistantState({ messages, charts, updatedAt: new Date().toISOString() });
    }, 300);
  }, [messages, charts, hydrated]);

  const schedulePersist = useCallback(
    (nextMessages: AssistantChatMessage[], nextCharts: StoredAssistantChart[]) => {
      if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
      persistTimerRef.current = setTimeout(() => {
        saveAssistantState({ messages: nextMessages, charts: nextCharts, updatedAt: new Date().toISOString() });
      }, 300);
    },
    [],
  );

  const handleNewChat = useCallback(() => {
    if (
      messages.length > 0 &&
      !window.confirm("Démarrer une nouvelle discussion ? L'historique local sera effacé.")
    ) {
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

      // Keep setMessages and setCharts as separate calls — never nest setState
      // inside another updater; React Strict Mode runs updaters twice and would
      // duplicate the charts.
      setMessages((prev) => [...prev, assistantMessage]);
      if (stamped.length > 0) {
        setCharts((prev) => [...prev, ...stamped]);
      }

      setChips(done.suggestions);
      setFollowUps(done.followUpQuestions);
      setStreamingContent(null);
      setStatusMessage(null);
    },
    [],
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
          onDone: (payload) => applyTurnDone(payload),
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

  const handleSend = useCallback(() => void sendMessage(input), [input, sendMessage]);
  const handleChipSelect = useCallback(
    (text: string) => { setInput(text); void sendMessage(text); },
    [sendMessage],
  );

  if (!hydrated) {
    return (
      <div className="flex min-h-[420px] items-center justify-center text-sm text-muted-foreground">
        Chargement…
      </div>
    );
  }

  if (!hasConversation) {
    return (
      <AssistantChatPanel
        messages={messages}
        streamingContent={smoothedContent}
        statusMessage={statusMessage}
        busy={busy}
        error={error}
        chips={chips}
        followUps={followUps}
        input={input}
        onInputChange={setInput}
        onSend={handleSend}
        onChipSelect={handleChipSelect}
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-semibold tracking-tight text-foreground/80">Assistant IA</h1>
          <AssistantBetaBadge />
        </div>
        <Button type="button" variant="outline" size="sm" onClick={handleNewChat} disabled={busy}>
          Nouvelle discussion
        </Button>
      </div>

      <div
        className={cn(
          "grid min-h-[min(72vh,720px)] gap-6 transition-[grid-template-columns] duration-300 ease-out",
          hasCharts ? "lg:grid-cols-[1fr_min(380px,32%)]" : "grid-cols-1",
        )}
      >
        {hasCharts ? (
          <section className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-border/70 bg-card/40">
            <div className="flex-1 overflow-y-auto p-4">
              <div className="mx-auto flex max-w-2xl flex-col gap-6">
                {charts.map((chart) => (
                  <AssistantChartCard key={`${chart.id}-${chart.createdAt}`} chart={chart} />
                ))}
              </div>
            </div>
          </section>
        ) : null}

        <section className="flex min-h-0 h-[min(72vh,720px)] flex-col overflow-hidden rounded-xl border border-border/70 bg-card p-4">
          <AssistantChatPanel
            messages={messages}
            streamingContent={smoothedContent}
            statusMessage={statusMessage}
            busy={busy}
            error={error}
            chips={chips}
            followUps={followUps}
            input={input}
            onInputChange={setInput}
            onSend={handleSend}
            onChipSelect={handleChipSelect}
            compact
          />
        </section>
      </div>
    </div>
  );
}
