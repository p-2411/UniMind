import { useState, useEffect } from 'react';
import QuestionCard from './QuestionCard';
import { getRandomQuestion } from './questions';
import logo from '../assets/logo.png';

function BlockPage() {
  // Store the current question being displayed
  const [currentQuestion, setCurrentQuestion] = useState(null);

  // Store the tab ID from the URL parameters
  const [tabId, setTabId] = useState(null);

  // Track loading state while we fetch the initial question
  const [loading, setLoading] = useState(true);

  // Initialize the component when it first mounts
  useEffect(() => {
    // Extract the tab ID from the URL query parameters
    // This was added by the background script when it redirected here
    const urlParams = new URLSearchParams(window.location.search);
    const currentTabId = urlParams.get('tabId');
    setTabId(currentTabId);

    // Load the first random question
    loadNewQuestion();
  }, []); // Empty dependency array means this runs once on mount

  // Load a random question from the question bank
  const loadNewQuestion = () => {
    setLoading(true);
    const question = getRandomQuestion();
    setCurrentQuestion(question);
    setLoading(false);
  };

  // Handle when the user answers correctly
  const handleCorrectAnswer = () => {
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
      <div className="fixed inset-0 w-screen h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-white text-xl">Loading your focus check...</div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 w-screen h-screen bg-[#0a0a0a] flex flex-col items-center justify-center p-8 overflow-hidden">
      <div className="w-full h-full flex flex-col items-center justify-center">
        <div className="flex items-center gap-1 mb-12">
          <img src={logo} alt="UniMind Logo" className="w-20 h-20" />
          <h1 className="text-white text-4xl font-semibold">UniMind</h1>
        </div>

        <div className="w-full max-w-3xl">
          {currentQuestion && (
            <QuestionCard
              question={currentQuestion}
              onCorrectAnswer={handleCorrectAnswer}
            />
          )}
        </div>

        <p className="text-gray-500 text-center mt-8 text-sm">
          This interruption helps you stay focused on what matters.
        </p>
      </div>
    </div>
  );
}

export default BlockPage;