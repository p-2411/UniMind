import { useEffect, useLayoutEffect, useRef, useState } from "react";
import QuestionCard from "./QuestionCard";
import { getNextQuestion, updateAfterAnswer } from "./questions";
import { submitAttempt } from "../api/client";
import logo from "../assets/logo.png";

interface Question {
  id: string;
  prompt?: string;
  question?: string;
  options: string[];
  correctAnswer: number;
  topic?: string;
  difficulty?: "easy" | "medium" | "hard";
  rolling_accuracy?: number;
  attempts?: number;
  last_seen_at?: number;
}

function BlockPage() {
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [tabId, setTabId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [startTime, setStartTime] = useState<number | null>(null);

  // Scale-to-fit for the card so the page never scrolls
  const cardOuterRef = useRef<HTMLDivElement | null>(null);
  const cardInnerRef = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const currentTabId = urlParams.get("tabId");
    setTabId(currentTabId);
    loadNewQuestion();
  }, []);

  useLayoutEffect(() => {
    function fit() {
      if (!cardOuterRef.current || !cardInnerRef.current) return;
      const available = cardOuterRef.current.clientHeight;
      const natural = cardInnerRef.current.scrollHeight;
      const buffer = 8;
      const factor = Math.min(1, (available - buffer) / Math.max(1, natural));
      setScale(Number.isFinite(factor) ? Math.max(0.6, factor) : 1);
    }
    fit();

    const ro = new ResizeObserver(fit);
    if (cardOuterRef.current) ro.observe(cardOuterRef.current);
    if (cardInnerRef.current) ro.observe(cardInnerRef.current);
    window.addEventListener("resize", fit);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", fit);
    };
  }, [currentQuestion]);

  const loadNewQuestion = async () => {
    setLoading(true);
    try {
      const question = (await getNextQuestion()) as Question;
      setCurrentQuestion(question);
      setStartTime(Date.now());
    } catch (error) {
      console.error("Failed to load question:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCorrectAnswer = async (answerIndex: number) => {
    if (!currentQuestion) return;
    const timeSeconds = startTime ? Math.floor((Date.now() - startTime) / 1000) : 0;

    try {
      await submitAttempt(currentQuestion.id, answerIndex, timeSeconds);
    } catch (error) {
      console.error("Failed to submit attempt:", error);
    }

    updateAfterAnswer(currentQuestion, true);

    chrome.storage.local.get([`pendingUrl_${tabId}`], (result) => {
      const originalUrl = result[`pendingUrl_${tabId}`];
      if (originalUrl) {
        chrome.storage.local.remove([`pendingUrl_${tabId}`]);
        const hostname = new URL(originalUrl).hostname;
        chrome.storage.local.set(
          { [`bypass_${hostname}`]: Date.now() + 2 * 1000 },
          () => (window.location.href = originalUrl)
        );
      } else {
        console.error("No pending URL found");
      }
    });
  };

  if (loading) {
    return (
      <div className="fixed inset-0 grid place-items-center bg-[#061423]">
        <div className="text-slate-900 text-base md:text-lg font-medium bg-yellow-400/80 backdrop-blur-xl px-5 py-3 rounded-2xl border border-white/40 shadow-lg">
          Loading your focus check...
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 overflow-hidden">
      {/* Ambient background & subtle grid grain */}
      <div className="absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_10%,rgba(255,200,80,0.12)_0%,rgba(255,200,80,0)_60%),radial-gradient(70%_60%_at_50%_120%,rgba(56,189,248,0.10)_0%,rgba(2,6,23,0)_60%)] bg-[#061423]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.06] mix-blend-overlay [background-image:linear-gradient(transparent_95%,rgba(255,255,255,.3)_95%),linear-gradient(90deg,transparent_95%,rgba(255,255,255,.3)_95%)] [background-size:24px_24px]" />

      {/* 3-row page grid: header / content / footer */}
      <div className="relative mx-auto h-dvh max-h-dvh w-full max-w-5xl grid grid-rows-[auto,1fr,auto] px-4 sm:px-6 py-4 sm:py-6">
        {/* Header with halo */}
        <header className="relative grid place-items-center gap-3 sm:gap-4 text-center">
          <div className="pointer-events-none absolute -z-10 h-28 w-28 rounded-full bg-amber-400/20 blur-3xl" />
          <div className="flex items-center justify-center gap-3 sm:gap-4">
            <img
              src={logo}
              alt="UniMind Logo"
              className="w-12 h-12 sm:w-14 sm:h-14 drop-shadow-xl"
            />
            <div>
              <h1
                className="font-semibold tracking-tight drop-shadow-sm 
                           bg-yellow-400 bg-clip-text text-transparent
                           text-[clamp(1.5rem,4vw,2.25rem)]"
              >
                UniMind
              </h1>
              <p className="mt-1 text-[clamp(0.8rem,1.6vw,0.95rem)] text-slate-200/90 hidden xs:block">
                Refocus with a quick concept check before heading back.
              </p>
            </div>
          </div>
        </header>

        {/* Content — auto-scaling QuestionCard so page never scrolls */}
        <main ref={cardOuterRef} className="min-h-0 flex items-center justify-center px-0 sm:px-2">
          <div
            ref={cardInnerRef}
            style={{ transform: `scale(${scale})`, transformOrigin: "top center", willChange: "transform" }}
            className="w-full max-w-3xl"
          >
            {currentQuestion && (
              <QuestionCard question={currentQuestion} onCorrectAnswer={handleCorrectAnswer} />
            )}
          </div>
        </main>

        {/* Footer chip */}
        <footer className="grid place-items-center">
        </footer>
      </div>
    </div>
  );
}

export default BlockPage;
