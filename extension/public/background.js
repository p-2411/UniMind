// API configuration
const DEFAULT_API_BASE_URL = 'https://unimind-production.up.railway.app';

function normaliseBaseUrl(value) {
  if (!value || typeof value !== 'string') return DEFAULT_API_BASE_URL;
  return value.replace(/\/$/, '');
}

async function getApiBaseUrl() {
  if (!chrome?.storage?.local?.get) {
    return DEFAULT_API_BASE_URL;
  }

  return new Promise((resolve) => {
    try {
      chrome.storage.local.get(['api_base_url'], (result) => {
        resolve(normaliseBaseUrl(result.api_base_url || DEFAULT_API_BASE_URL));
      });
    } catch (error) {
      console.warn('Falling back to default API base URL', error);
      resolve(DEFAULT_API_BASE_URL);
    }
  });
}

// Sync blocked sites from backend
async function syncBlockedSitesFromBackend() {
  try {
    const { access_token, user } = await chrome.storage.local.get(['access_token', 'user']);

    if (!access_token || !user) {
      console.log('User not authenticated, skipping blocked sites sync');
      return;
    }

    const userObj = typeof user === 'string' ? JSON.parse(user) : user;

    const apiBaseUrl = await getApiBaseUrl();

    const requestUrl = `${apiBaseUrl}/students/${userObj.id}/blocked-sites`;
    const response = await fetch(
      requestUrl,
      {
        headers: {
          'Authorization': `Bearer ${access_token}`,
        },
      }
    );

    if (response.ok) {
      const blockedSites = await response.json();
      const domains = blockedSites.map(site => site.domain);

      await chrome.storage.sync.set({ blockedSites: domains });
      console.log('Synced blocked sites from backend:', domains);
    } else {
      console.error('Failed to sync blocked sites:', response.status, requestUrl);
    }
  } catch (error) {
    console.error('Error syncing blocked sites:', error);
  }
}

// Sync on extension startup
syncBlockedSitesFromBackend();

// Listen for authentication events to sync blocked sites
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local' && changes.access_token) {
    // User logged in or out
    syncBlockedSitesFromBackend();
  }
});

// Check if a URL should be blocked based on the user's configuration
function shouldBlockUrl(url, blockedSites) {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.replace('www.', '');
    
    return blockedSites.some(site => {
      const cleanSite = site.replace('www.', '').toLowerCase();
      return hostname.includes(cleanSite) || cleanSite.includes(hostname);
    });
  } catch (e) {
    return false;
  }
}

// Intercept navigation attempts and redirect to block page if needed
chrome.webNavigation.onBeforeNavigate.addListener((details) => {
  if (details.frameId !== 0) return;

  chrome.storage.sync.get(['blockedSites'], (result) => {
    const blockedSites = result.blockedSites || [];

    if (shouldBlockUrl(details.url, blockedSites)) {
      // Check if this site has a temporary bypass
      const hostname = new URL(details.url).hostname;
      chrome.storage.local.get([`bypass_${hostname}`], (bypassResult) => {
        const bypassExpiry = bypassResult[`bypass_${hostname}`];

        // If bypass exists and hasn't expired, allow access
        if (bypassExpiry && Date.now() < bypassExpiry) {
          return;
        }

        // Clean up expired bypass
        if (bypassExpiry) {
          chrome.storage.local.remove([`bypass_${hostname}`]);
        }

        // Store the destination URL so we can redirect after question is answered
        chrome.storage.local.set({
          [`pendingUrl_${details.tabId}`]: details.url
        });

        // Redirect to our React-powered block page
        chrome.tabs.update(details.tabId, {
          url: chrome.runtime.getURL('index.html') + '?tabId=' + details.tabId
        });
      });
    }
  });
});

// Handle messages from the dashboard to update blocked sites
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'REFRESH_BLOCKED_SITES') {
    syncBlockedSitesFromBackend().then(() => {
      sendResponse({ success: true });
    }).catch((error) => {
      console.error('Error refreshing blocked sites:', error);
      sendResponse({ success: false, error: error.message });
    });
    return true; // Keep channel open for async response
  }
});

chrome.runtime.onMessageExternal.addListener((request, sender, sendResponse) => {
  if (request.type === 'UPDATE_BLOCKED_SITES') {
    chrome.storage.sync.set({ blockedSites: request.sites }, () => {
      sendResponse({ success: true });
    });
    return true;
  }

  if (request.type === 'GET_BLOCKED_SITES') {
    chrome.storage.sync.get(['blockedSites'], (result) => {
      sendResponse({ sites: result.blockedSites || [] });
    });
    return true;
  }
});
