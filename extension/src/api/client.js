import { API_BASE_URL } from '../config.js'

const AUTH_CACHE_TTL_MS = 5000
let cachedAuth = null
let cachedAt = 0
let pendingAuthLoad = null

let basePersisted = false
function persistApiBaseUrl() {
  if (basePersisted) return
  if (typeof chrome === 'undefined' || !chrome?.storage?.local?.set) return
  try {
    chrome.storage.local.get(['api_base_url'], (result) => {
      if (result.api_base_url !== API_BASE_URL) {
        chrome.storage.local.set({ api_base_url: API_BASE_URL })
      }
    })
  } catch (error) {
    console.warn('Unable to persist API base URL to chrome.storage', error)
  } finally {
    basePersisted = true
  }
}

persistApiBaseUrl()

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

  // Create sets of domain names for comparison
  const currentDomainMap = new Map(currentSites.map(s => [s.domain.toLowerCase(), s]))
  const newDomains = new Set(sites.map(s => s.domain.toLowerCase()))

  console.log('Saving blocked sites:', {
    current: Array.from(currentDomainMap.keys()),
    new: Array.from(newDomains),
  })

  // Step 1: Remove sites that are not in the new list
  const removals = []
  for (const [domain, site] of currentDomainMap.entries()) {
    if (!newDomains.has(domain)) {
      console.log('Removing site:', domain, 'with ID:', site.id)
      removals.push(removeBlockedSite(site.id))
    }
  }
  await Promise.all(removals)

  // Step 2: Add sites that are not in the current list
  const additions = []
  for (const site of sites) {
    const domain = site.domain.toLowerCase()
    if (!currentDomainMap.has(domain)) {
      console.log('Adding site:', domain)
      additions.push(addBlockedSite(site.domain))
    }
  }
  await Promise.all(additions)

  console.log('Successfully saved blocked sites')
}

if (typeof chrome !== 'undefined' && chrome?.storage?.onChanged) {
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'local' && ('access_token' in changes || 'user' in changes)) {
      invalidateAuthCache()
    }
  })
}
