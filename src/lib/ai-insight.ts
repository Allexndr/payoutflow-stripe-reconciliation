import type { MatchResult } from "@/lib/match";
import type { Messages } from "@/i18n";
import type { Locale } from "@/i18n/config";
import { formatMoney } from "@/lib/format";

type InsightInput = {
  payoutId: string;
  expectedNetCents: number;
  arrivalDate: string;
  txnCount: number;
  match: MatchResult;
  locale?: Locale;
  messages?: Messages;
};

export type ReconciliationInsight = {
  title: string;
  summary: string;
  actions: string[];
  confidence: "high" | "medium";
  source: "heuristic" | "hf";
};

const MODEL = process.env.HF_LLM_MODEL ?? "google/flan-t5-small";
const API_URL =
  process.env.HF_INFERENCE_URL ??
  `https://api-inference.huggingface.co/models/${MODEL}`;
const TOKEN = process.env.HF_API_TOKEN;
const TIMEOUT_MS = 2500;

const cache = new Map<string, ReconciliationInsight>();

function buildHeuristicInsight(
  input: InsightInput,
): ReconciliationInsight {
  const m = input.messages?.aiInsight;

  if (input.match.status === "matched") {
    const delta = Math.abs(input.match.actualCents - input.match.expectedCents);
    const deltaPct =
      input.match.expectedCents > 0
        ? Math.abs((delta / input.match.expectedCents) * 100)
        : 0;
    const deltaStr = formatMoney(delta, "USD", input.locale);
    const deltaPctStr = deltaPct.toFixed(2);
    const actionTemplate =
      m?.matchedActionKeep ??
      "Keep as matched; difference is {{delta}} ({{deltaPct}}%).";
    return {
      title: m?.matchedTitle ?? "AI reconciliation verdict: healthy match",
      summary:
        m?.matchedSummary ??
        "This payout is already reconciled with a bank transaction inside the configured date and amount window.",
      actions: [
        actionTemplate
          .replace("{{delta}}", deltaStr)
          .replace("{{deltaPct}}", deltaPctStr),
        m?.matchedActionTemplate ??
          "Use this payout as a template when reviewing similar future cases.",
      ],
      confidence: "high",
      source: "heuristic",
    };
  }

  if (input.match.reason === "no_candidate") {
    return {
      title:
        m?.noCandidateTitle ??
        "AI reconciliation verdict: no bank candidate found",
      summary:
        m?.noCandidateSummary ??
        "No transaction matched the payout in the current tolerance (±3 days, ±1%). This is often timing drift, payout split/merge, or manual bank movement.",
      actions: [
        m?.noCandidateAction1 ??
          "Run Sync bank first, then re-check this payout.",
        m?.noCandidateAction2 ??
          "Search bank lines in a wider date window (up to +7 days) and close amount to expected net.",
        m?.noCandidateAction3 ??
          "If still missing, mark as exception and add an accounting note.",
      ],
      confidence: "medium",
      source: "heuristic",
    };
  }

  return {
    title:
      m?.ambiguousTitle ?? "AI reconciliation verdict: ambiguous candidates",
    summary:
      m?.ambiguousSummary ??
      "Multiple bank transactions look equally plausible. Manual confirmation is required to prevent silent mismatch.",
    actions: [
      m?.ambiguousAction1 ??
        "Prioritize the candidate with the closest amount to expected net.",
      m?.ambiguousAction2 ??
        "If amounts tie, choose the transaction with date closest to arrival date.",
      m?.ambiguousAction3 ??
        "Add a short note after manual selection for audit clarity.",
    ],
    confidence: "medium",
    source: "heuristic",
  };
}

async function callHuggingFace(prompt: string): Promise<string | null> {
  if (!TOKEN) return null;
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: {
          max_new_tokens: 120,
          temperature: 0.2,
          return_full_text: false,
        },
      }),
      signal: controller.signal,
      cache: "no-store",
    });
    if (!res.ok) return null;
    const json = (await res.json()) as
      | { generated_text?: string }[]
      | { generated_text?: string };
    const text = Array.isArray(json)
      ? json[0]?.generated_text
      : json.generated_text;
    return text?.trim() || null;
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

function hfPrompt(input: InsightInput, base: ReconciliationInsight): string {
  return [
    "You are a fintech reconciliation assistant.",
    "Write concise output in 3 lines:",
    "1) Short verdict sentence.",
    "2) Most likely reason.",
    "3) Next best action.",
    `Payout ID: ${input.payoutId}`,
    `Arrival date: ${input.arrivalDate}`,
    `Expected net: ${input.expectedNetCents} cents`,
    `Txn count in payout: ${input.txnCount}`,
    `Current match status: ${input.match.status}`,
    `Current heuristic summary: ${base.summary}`,
    `Output language: ${input.locale ?? "en"}. No markdown, plain text.`,
  ].join("\n");
}

export async function getReconciliationInsight(
  input: InsightInput,
): Promise<ReconciliationInsight> {
  const key = `${input.locale ?? "en"}:${input.payoutId}:${input.match.status}:${input.expectedNetCents}:${input.arrivalDate}`;
  const cached = cache.get(key);
  if (cached) return cached;

  const base = buildHeuristicInsight(input);
  const hf = await callHuggingFace(hfPrompt(input, base));
  if (!hf) {
    cache.set(key, base);
    return base;
  }

  const polished: ReconciliationInsight = {
    ...base,
    summary: hf,
    source: "hf",
  };
  cache.set(key, polished);
  return polished;
}
