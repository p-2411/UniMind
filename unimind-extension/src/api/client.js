// API client for UniMind backend
import { API_BASE_URL } from '../config.js'

/**
 * Get authentication token from Chrome storage
 */
export async function getAuthToken() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['access_token'], (result) => {
      resolve(result.access_token || null);
    });
  });
}

/**
 * Get user data from Chrome storage
 */
export async function getUser() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['user'], (result) => {
      if (result.user) {
        try {
          const user = typeof result.user === 'string' ? JSON.parse(result.user) : result.user;
          resolve(user);
        } catch {
          resolve(null);
        }
      } else {
        resolve(null);
      }
    });
  });
}

/**
 * Fetch all questions for the extension with algorithm metadata
 */
export async function fetchQuestionsForExtension() {
  const token = await getAuthToken();
  const user = await getUser();

  if (!token || !user) {
    throw new Error('User not authenticated');
  }

  const response = await fetch(
    `${API_BASE_URL}/students/${user.id}/questions-for-extension`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    throw new Error('Failed to fetch questions');
  }

  return await response.json();
}

/**
 * Submit a question attempt
 */
export async function submitAttempt(questionId, answerIndex, timeSeconds) {
  const token = await getAuthToken();
  const user = await getUser();

  if (!token || !user) {
    throw new Error('User not authenticated');
  }

  const response = await fetch(
    `${API_BASE_URL}/students/${user.id}/attempts`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        question_id: questionId,
        answer_index: answerIndex,
        seconds: timeSeconds,
      }),
    }
  );

  if (!response.ok) {
    throw new Error('Failed to submit attempt');
  }

  return await response.json();
}

export async function fetchStreak() {
  const token = await getAuthToken();
  const user = await getUser();

  if (!token || !user) {
    throw new Error('User not authenticated');
  }

  const response = await fetch(
    `${API_BASE_URL}/students/${user.id}/streak`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error('Failed to fetch streak');
  }

  return await response.json();
}

export async function logout() {
  return new Promise((resolve) => {
    chrome.storage.local.remove(['access_token', 'user'], () => resolve());
  });
}

export async function fetchTodayStats() {
  const token = await getAuthToken();
  const user = await getUser();

  if (!token || !user) {
    throw new Error('User not authenticated');
  }

  const response = await fetch(
    `${API_BASE_URL}/students/${user.id}/today-stats`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error('Failed to fetch today stats');
  }

  return await response.json();
}

/**
 * Fetch user's blocked sites from backend
 */
export async function fetchBlockedSites() {
  const token = await getAuthToken();
  const user = await getUser();

  if (!token || !user) {
    throw new Error('User not authenticated');
  }

  const response = await fetch(
    `${API_BASE_URL}/students/${user.id}/blocked-sites`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error('Failed to fetch blocked sites');
  }

  return await response.json();
}

/**
 * Add a blocked site
 */
export async function addBlockedSite(domain) {
  const token = await getAuthToken();
  const user = await getUser();

  if (!token || !user) {
    throw new Error('User not authenticated');
  }

  const response = await fetch(
    `${API_BASE_URL}/students/${user.id}/blocked-sites`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ domain }),
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || 'Failed to add blocked site');
  }

  return await response.json();
}

/**
 * Remove a blocked site
 */
export async function removeBlockedSite(siteId) {
  const token = await getAuthToken();
  const user = await getUser();

  if (!token || !user) {
    throw new Error('User not authenticated');
  }

  const response = await fetch(
    `${API_BASE_URL}/students/${user.id}/blocked-sites/${siteId}`,
    {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error('Failed to remove blocked site');
  }
}
