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
