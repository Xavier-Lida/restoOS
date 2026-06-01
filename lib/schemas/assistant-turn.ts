import { z } from "zod";

export const refusalKindSchema = z.enum(["off_topic", "missing_data"]);

export const salesBarPointSchema = z.object({
  day: z.string(),
  netSales: z.number(),
  transactions: z.number(),
});

export const multiLineSeriesSchema = z.object({
  id: z.string(),
  label: z.string(),
  values: z.array(z.number()),
  color: z.string().optional(),
  dashed: z.boolean().optional(),
});

export const horizontalBarRowSchema = z.object({
  label: z.string(),
  value: z.number(),
  color: z.string().optional(),
});

export const assistantChartSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("revenue_bars"),
    id: z.string(),
    title: z.string(),
    points: z.array(salesBarPointSchema),
  }),
  z.object({
    kind: z.literal("multi_line"),
    id: z.string(),
    title: z.string(),
    labels: z.array(z.string()),
    series: z.array(multiLineSeriesSchema),
  }),
  z.object({
    kind: z.literal("horizontal_bars"),
    id: z.string(),
    title: z.string(),
    rows: z.array(horizontalBarRowSchema),
    valueSuffix: z.string().optional(),
  }),
]);

export type AssistantChart = z.infer<typeof assistantChartSchema>;

export const assistantTurnDoneSchema = z.object({
  refused: z.boolean().optional(),
  refusalKind: refusalKindSchema.optional(),
  answerMarkdown: z.string(),
  charts: z.array(assistantChartSchema),
  suggestions: z.array(z.string().max(120)).max(6),
  followUpQuestions: z.array(z.string().max(200)).max(4),
});

export type AssistantTurnDone = z.infer<typeof assistantTurnDoneSchema>;

export const finalizeTurnToolInputSchema = z.object({
  refused: z.boolean().optional(),
  refusalKind: refusalKindSchema.optional(),
  chartIds: z.array(z.string()).max(4).optional(),
  chartTitles: z.record(z.string(), z.string()).optional(),
  suggestions: z.array(z.string()).max(6).optional(),
  followUpQuestions: z.array(z.string()).max(4).optional(),
});

export type FinalizeTurnToolInput = z.infer<typeof finalizeTurnToolInputSchema>;

export type AssistantSseEvent =
  | { phase: "status"; message: string }
  | { phase: "delta"; text: string }
  | { phase: "done"; payload: AssistantTurnDone }
  | { phase: "error"; message: string };

export type AssistantChatMessage = {
  role: "user" | "assistant";
  content: string;
  refused?: boolean;
  refusalKind?: z.infer<typeof refusalKindSchema>;
};

export type StoredAssistantChart = AssistantChart & {
  turnIndex: number;
  createdAt: string;
};

export type AssistantPersistedState = {
  messages: AssistantChatMessage[];
  charts: StoredAssistantChart[];
  updatedAt: string;
};

export const ASSISTANT_STORAGE_KEY = "restoprix:assistant:v1";
