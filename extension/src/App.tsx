import { useState, useEffect } from 'react';
import LoginPage from './login/LoginPage';
import BlockPage from './block-page/BlockPage';
import DashboardPage from './dashboard/DashboardPage';
import './App.css';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isBlockPage, setIsBlockPage] = useState(false);

  useEffect(() => {
    // Check if this is the block page or login page
    const urlParams = new URLSearchParams(window.location.search);
    const tabId = urlParams.get('tabId');
    setIsBlockPage(!!tabId);

    // Check if user is authenticated
    chrome.storage.local.get(['access_token', 'user'], (result) => {
      setIsAuthenticated(!!(result.access_token && result.user));
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-gray-950 to-[#052334]">
        <div className="text-white text-lg">Loading...</div>
      </div>
    );
  }

  // If it's the block page and user is authenticated, show BlockPage
  if (isBlockPage && isAuthenticated) {
    return <BlockPage />;
  }

  // If it's the block page but not authenticated, show login
  if (isBlockPage && !isAuthenticated) {
    return <LoginPage onLoginSuccess={() => setIsAuthenticated(true)} />;
  }

  // If user is not authenticated and not on block page, show login
  if (!isAuthenticated) {
    return <LoginPage onLoginSuccess={() => setIsAuthenticated(true)} />;
  }

  // Popup view
  return <DashboardPage />;
}

export default App;
