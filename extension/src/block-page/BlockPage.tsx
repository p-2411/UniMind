import { useState, useEffect } from 'react';
import QuestionCard from './QuestionCard';
import { getNextQuestion, updateAfterAnswer } from './questions';
import { submitAttempt } from '../api/client';
import logo from '../assets/logo.png';

interface Question {
  id: string;
  prompt?: string;
  question?: string;
  options: string[];
  correctAnswer: number;
  topic?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  rolling_accuracy?: number;
  attempts?: number;
  last_seen_at?: number;
}

function BlockPage() {
  // Store the current question being displayed
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);

  // Store the tab ID from the URL parameters
  const [tabId, setTabId] = useState<string | null>(null);

  // Track loading state while we fetch the initial question
  const [loading, setLoading] = useState(true);

  // Track start time for timing the answer
  const [startTime, setStartTime] = useState<number | null>(null);

  // Initialize the component when it first mounts
  useEffect(() => {
    // Extract the tab ID from the URL query parameters
    // This was added by the background script when it redirected here
    const urlParams = new URLSearchParams(window.location.search);
    const currentTabId = urlParams.get('tabId');
    setTabId(currentTabId);

    // Load the first question
    loadNewQuestion();
  }, []); // Empty dependency array means this runs once on mount

  // Load a question using the selection algorithm
  const loadNewQuestion = async () => {
    setLoading(true);
    try {
      const question = await getNextQuestion() as Question;
      setCurrentQuestion(question);
      setStartTime(Date.now());
    } catch (error) {
      console.error('Failed to load question:', error);
      // Show error state or fallback
    } finally {
      setLoading(false);
    }
  };

  // Handle when the user answers correctly
  const handleCorrectAnswer = async (answerIndex: number) => {
    if (!currentQuestion) return;

    // Calculate time taken
    const timeSeconds = startTime ? Math.floor((Date.now() - startTime) / 1000) : 0;

    // Submit the attempt to the backend
    try {
      await submitAttempt(currentQuestion.id, answerIndex, timeSeconds);
    } catch (error) {
      console.error('Failed to submit attempt:', error);
      // Continue anyway to let user through
    }

    // Update local scheduling metadata so the next question reflects the attempt
    updateAfterAnswer(currentQuestion, true);

    // Retrieve the original URL the user was trying to visit
    // This was stored by the background script before redirecting here
    chrome.storage.local.get([`pendingUrl_${tabId}`], (result) => {
      const originalUrl = result[`pendingUrl_${tabId}`];

      if (originalUrl) {
        // Clean up the stored URL since we're about to use it
        chrome.storage.local.remove([`pendingUrl_${tabId}`]);

        // Grant temporary access to the site (2 seconds)
        const hostname = new URL(originalUrl).hostname;
        chrome.storage.local.set({
          [`bypass_${hostname}`]: Date.now() + 2 * 1000
        }, () => {
          // Redirect to the site the user originally wanted to visit
          window.location.href = originalUrl;
        });
      } else {
        // Fallback in case something went wrong with storage
        console.error('No pending URL found');
      }
    });
  };

  // Show a loading state while the question is being prepared
  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-gray-950 to-[#052334]">
        <div className="text-slate-900 text-lg md:text-xl font-medium bg-white/80 backdrop-blur-xl px-6 py-4 rounded-2xl border border-white/40 shadow-lg">
          Loading your focus check...
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center px-6 py-10 md:px-12 bg-gradient-to-br from-gray-950 to-[#052334] overflow-hidden">
      <div className="w-full max-w-4xl flex flex-col items-center text-center">
        <div className="flex flex-col md:flex-row md:items-center md:justify-center gap-3 mb-10">
          <img src={logo} alt="UniMind Logo" className="w-16 h-16 md:w-20 md:h-20 drop-shadow-xl" />
          <div>
            <h1 className="text-4xl font-semibold tracking-tight bg-gradient-to-r from-yellow-300 via-orange-400 to-orange-600 text-transparent bg-clip-text drop-shadow-sm">
              UniMind
            </h1>
            <p className="text-sm md:text-base text-slate-700/80 mt-2">
              Refocus with a quick concept check before heading back.
            </p>
          </div>
        </div>

        <div className="w-full max-w-3xl">
          {currentQuestion && (
            <QuestionCard
              question={currentQuestion}
              onCorrectAnswer={handleCorrectAnswer}
            />
          )}
        </div>

        <p className="mt-10 text-sm md:text-base text-slate-100/90 bg-white/10 backdrop-blur-sm border border-white/20 px-5 py-3 rounded-2xl shadow-sm">
          This brief pause keeps you aligned with your goals. Stay sharp!
        </p>
      </div>
    </div>
  );
}

export default BlockPage;
