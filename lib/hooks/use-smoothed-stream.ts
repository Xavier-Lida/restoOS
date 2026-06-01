"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Smooths streamed text so it appears at a constant character-per-second rate
 * instead of arriving in unpredictable bursts from the LLM.
 *
 * Returns null when no stream is active; returns the progressively-revealed
 * string while streaming.
 */
export function useSmoothedStream(raw: string | null, cps = 50): string | null {
  const [shown, setShown] = useState<string | null>(null);
  const bufRef = useRef(""); // chars received but not yet displayed
  const consumedRef = useRef(0); // chars already moved to shown OR buf
  const activeRef = useRef(false);

  // Track incoming chars
  useEffect(() => {
    if (raw === null) {
      if (!activeRef.current) return;
      activeRef.current = false;
      // Flush remaining buffer so the final render matches the committed message
      const remaining = bufRef.current;
      bufRef.current = "";
      consumedRef.current = 0;
      if (remaining) {
        setShown((prev) => (prev ?? "") + remaining);
      }
      // Clear shown; parent will render the committed message instead
      setShown(null);
      return;
    }

    if (!activeRef.current) {
      activeRef.current = true;
      bufRef.current = "";
      consumedRef.current = 0;
      setShown("");
    }

    const newChars = raw.slice(consumedRef.current + bufRef.current.length);
    if (newChars) bufRef.current += newChars;
  }, [raw]);

  // Drain buffer at constant rate (~30 fps)
  useEffect(() => {
    const charsPerTick = Math.max(1, Math.round(cps / 30));
    const id = setInterval(() => {
      if (!bufRef.current) return;
      const chunk = bufRef.current.slice(0, charsPerTick);
      bufRef.current = bufRef.current.slice(charsPerTick);
      consumedRef.current += chunk.length;
      setShown((prev) => (prev === null ? chunk : prev + chunk));
    }, Math.round(1000 / 30));
    return () => clearInterval(id);
  }, [cps]);

  return shown;
}
