import { useCallback, useEffect, useRef, useState } from "react";

const TYPING_FRAME_MS = 28;
const TYPING_SLOW_WINDOW_MS = 380;
const MAX_TYPING_DURATION_MS = 1500;

function splitGraphemes(value: string) {
  if (!value) {
    return [];
  }

  if (typeof Intl !== "undefined" && typeof Intl.Segmenter === "function") {
    const segmenter = new Intl.Segmenter("ko", {
      granularity: "grapheme",
    });

    return Array.from(segmenter.segment(value), (segment) => segment.segment);
  }

  return Array.from(value);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function getDrainChunkSize(backlogSize: number, elapsedMs: number) {
  if (backlogSize <= 0) {
    return 0;
  }

  if (elapsedMs < TYPING_SLOW_WINDOW_MS) {
    return backlogSize > 72 ? 2 : 1;
  }

  const remainingBudgetMs = Math.max(
    MAX_TYPING_DURATION_MS - elapsedMs,
    TYPING_FRAME_MS,
  );
  const remainingFrames = Math.max(
    1,
    Math.ceil(remainingBudgetMs / TYPING_FRAME_MS),
  );
  const catchUpChunkSize = Math.ceil(backlogSize / remainingFrames);
  const backlogFloor =
    backlogSize > 180
      ? 12
      : backlogSize > 120
        ? 9
        : backlogSize > 72
          ? 7
          : backlogSize > 36
            ? 5
            : backlogSize > 18
              ? 3
              : 2;

  return clamp(Math.max(backlogFloor, catchUpChunkSize), 2, 12);
}

export function useStreamingText(content: string) {
  const queueRef = useRef<string[]>(splitGraphemes(content));
  const visibleContentRef = useRef("");
  const pendingSyncContentRef = useRef<string | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastDrainAtRef = useRef(0);
  const typingStartedAtRef = useRef(0);
  const [visibleContent, setVisibleContent] = useState("");

  const stopDrain = useCallback(() => {
    if (animationFrameRef.current) {
      window.cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  }, []);

  const scheduleDrain = useCallback(() => {
    if (animationFrameRef.current) {
      return;
    }

    if (pendingSyncContentRef.current === null && !queueRef.current.length) {
      return;
    }

    function step(timestamp: number) {
      if (!lastDrainAtRef.current) {
        lastDrainAtRef.current = timestamp - TYPING_FRAME_MS;
      }

      if (!typingStartedAtRef.current) {
        typingStartedAtRef.current = timestamp;
      }

      let nextVisibleContent: string | null = null;

      if (pendingSyncContentRef.current !== null) {
        nextVisibleContent = pendingSyncContentRef.current;
        visibleContentRef.current = pendingSyncContentRef.current;
        pendingSyncContentRef.current = null;
      }

      if (
        timestamp - lastDrainAtRef.current >= TYPING_FRAME_MS &&
        queueRef.current.length
      ) {
        lastDrainAtRef.current = timestamp;

        const elapsedMs = timestamp - typingStartedAtRef.current;
        const nextChunk = queueRef.current
          .splice(0, getDrainChunkSize(queueRef.current.length, elapsedMs))
          .join("");

        if (nextChunk) {
          visibleContentRef.current += nextChunk;
          nextVisibleContent = visibleContentRef.current;
        }
      }

      if (nextVisibleContent !== null) {
        setVisibleContent(nextVisibleContent);
      }

      if (pendingSyncContentRef.current !== null || queueRef.current.length) {
        animationFrameRef.current = window.requestAnimationFrame(step);
        return;
      }

      animationFrameRef.current = null;
    }

    animationFrameRef.current = window.requestAnimationFrame(step);
  }, []);

  useEffect(() => {
    const knownContent = [
      visibleContentRef.current,
      queueRef.current.join(""),
    ].join("");

    if (content === knownContent) {
      return;
    }

    if (content.startsWith(knownContent)) {
      const nextChunk = content.slice(knownContent.length);

      if (!nextChunk) {
        return;
      }

      queueRef.current.push(...splitGraphemes(nextChunk));
      scheduleDrain();
      return;
    }

    if (content.startsWith(visibleContentRef.current)) {
      queueRef.current = splitGraphemes(
        content.slice(visibleContentRef.current.length),
      );
      lastDrainAtRef.current = 0;
      typingStartedAtRef.current = 0;
      scheduleDrain();
      return;
    }

    queueRef.current = [];
    lastDrainAtRef.current = 0;
    typingStartedAtRef.current = 0;
    pendingSyncContentRef.current = content;
    scheduleDrain();
  }, [content, scheduleDrain]);

  useEffect(() => {
    scheduleDrain();
    return stopDrain;
  }, [scheduleDrain, stopDrain]);

  useEffect(() => {
    return stopDrain;
  }, [stopDrain]);

  return {
    visibleContent,
    isDrained: visibleContent === content,
  };
}
