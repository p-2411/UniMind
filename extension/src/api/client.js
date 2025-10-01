import { API_BASE_URL } from '../config.js'

const AUTH_CACHE_TTL_MS = 5000
let cachedAuth = null
let cachedAt = 0
let pendingAuthLoad = null

// Keep a short-lived cache of auth data to avoid repeated chrome.storage reads.
async function loadAuthFromStorage() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['access_token', 'user'], (result) => {
      resolve({
        token: result.access_token || null,
        user: parseUser(result.user),
      })
    })
  })
}

function parseUser(raw) {
  if (!raw) return null
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw)
    } catch {
      return null
    }
  }
  return raw
}

function invalidateAuthCache() {
  cachedAuth = null
  cachedAt = 0
  pendingAuthLoad = null
}

async function getAuthContext(options = {}) {
  const { forceRefresh = false } = options

  if (!forceRefresh && cachedAuth && Date.now() - cachedAt < AUTH_CACHE_TTL_MS) {
    return cachedAuth
  }

  if (forceRefresh) {
    const fresh = await loadAuthFromStorage()
    cachedAuth = fresh
    cachedAt = Date.now()
    pendingAuthLoad = null
    return fresh
  }

  if (!pendingAuthLoad) {
    pendingAuthLoad = loadAuthFromStorage()
      .then((context) => {
        cachedAuth = context
        cachedAt = Date.now()
        pendingAuthLoad = null
        return context
      })
      .catch((error) => {
        pendingAuthLoad = null
        throw error
      })
  }

  return pendingAuthLoad
}

async function requireAuth(options) {
  const { token, user } = await getAuthContext(options)
  if (!token || !user) {
    throw new Error('User not authenticated')
  }
  return { token, user }
}

export async function getAuthToken(options = {}) {
  const { token } = await getAuthContext(options)
  return token
}

export async function getUser(options = {}) {
  const { user } = await getAuthContext(options)
  return user
}

export async function fetchQuestionsForExtension() {
  const { token, user } = await requireAuth()

  const response = await fetch(
    `${API_BASE_URL}/students/${user.id}/questions-for-extension`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    },
  )

  if (!response.ok) {
    throw new Error('Failed to fetch questions')
  }

  return await response.json()
}

export async function submitAttempt(questionId, answerIndex, timeSeconds) {
  const { token, user } = await requireAuth()

  const response = await fetch(
    `${API_BASE_URL}/students/${user.id}/attempts`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        question_id: questionId,
        answer_index: answerIndex,
        seconds: timeSeconds,
      }),
    },
  )

  if (!response.ok) {
    throw new Error('Failed to submit attempt')
  }

  return await response.json()
}

export async function fetchStreak() {
  const { token, user } = await requireAuth()

  const response = await fetch(
    `${API_BASE_URL}/students/${user.id}/streak`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  )

  if (!response.ok) {
    throw new Error('Failed to fetch streak')
  }

  return await response.json()
}

export async function logout() {
  return new Promise((resolve) => {
    chrome.storage.local.remove(['access_token', 'user'], () => {
      invalidateAuthCache()
      resolve()
    })
  })
}

export async function fetchTodayStats() {
  const { token, user } = await requireAuth()

  const response = await fetch(
    `${API_BASE_URL}/students/${user.id}/today-stats`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  )

  if (!response.ok) {
    throw new Error('Failed to fetch today stats')
  }

  return await response.json()
}

export async function fetchBlockedSites() {
  const { token, user } = await requireAuth()

  const response = await fetch(
    `${API_BASE_URL}/students/${user.id}/blocked-sites`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  )

  if (!response.ok) {
    throw new Error('Failed to fetch blocked sites')
  }

  return await response.json()
}

export async function addBlockedSite(domain) {
  const { token, user } = await requireAuth()

  const response = await fetch(
    `${API_BASE_URL}/students/${user.id}/blocked-sites`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ domain }),
    },
  )

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.detail || 'Failed to add blocked site')
  }

  return await response.json()
}

export async function removeBlockedSite(siteId) {
  const { token, user } = await requireAuth()

  const response = await fetch(
    `${API_BASE_URL}/students/${user.id}/blocked-sites/${siteId}`,
    {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  )

  if (!response.ok) {
    throw new Error('Failed to remove blocked site')
  }
}

export async function saveBlockedSites(sites) {
  const { token, user } = await requireAuth()

  // Get current sites from server
  const currentSites = await fetchBlockedSites()

  // Normalize domains to lowercase for comparison
  const currentDomains = new Set(currentSites.map(s => s.domain.toLowerCase()))
  const newDomains = new Set(sites.map(s => s.domain.toLowerCase()))

  // Find sites to add (in new list but not in current)
  const toAdd = sites.filter(s => !currentDomains.has(s.domain.toLowerCase()))

  // Find sites to remove (in current list but not in new)
  const toRemove = currentSites.filter(s => !newDomains.has(s.domain.toLowerCase()))

  console.log('Saving blocked sites:', {
    current: currentSites.length,
    new: sites.length,
    toAdd: toAdd.length,
    toRemove: toRemove.length,
    toRemoveDetails: toRemove.map(s => ({ id: s.id, domain: s.domain }))
  })

  // Execute removals first
  for (const site of toRemove) {
    console.log('Removing site:', site.domain, 'with ID:', site.id)
    try {
      await removeBlockedSite(site.id)
    } catch (err) {
      console.error('Failed to remove site:', site.domain, err)
      throw new Error(`Failed to remove ${site.domain}: ${err.message}`)
    }
  }

  // Then additions
  for (const site of toAdd) {
    console.log('Adding site:', site.domain)
    try {
      await addBlockedSite(site.domain)
    } catch (err) {
      console.error('Failed to add site:', site.domain, err)
      throw new Error(`Failed to add ${site.domain}: ${err.message}`)
    }
  }
}

if (typeof chrome !== 'undefined' && chrome?.storage?.onChanged) {
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'local' && ('access_token' in changes || 'user' in changes)) {
      invalidateAuthCache()
    }
  })
}
