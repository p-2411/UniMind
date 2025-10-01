const DEFAULT_BLOCKED_SITES = [
  'facebook.com',
  'twitter.com',
  'instagram.com',
  'youtube.com',
  'reddit.com',
  'tiktok.com',
  'netflix.com'
];

// API configuration
const API_BASE_URL = 'https://unimind-production.up.railway.app/api';

// Initialize default blocked sites when extension is installed
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.get(['blockedSites'], (result) => {
    if (!result.blockedSites) {
      chrome.storage.sync.set({ blockedSites: DEFAULT_BLOCKED_SITES });
    }
  });
});

// Sync blocked sites from backend
async function syncBlockedSitesFromBackend() {
  try {
    const { access_token, user } = await chrome.storage.local.get(['access_token', 'user']);

    if (!access_token || !user) {
      console.log('User not authenticated, using default blocked sites');
      return;
    }

    const userObj = typeof user === 'string' ? JSON.parse(user) : user;

    const response = await fetch(
      `${API_BASE_URL}/students/${userObj.id}/blocked-sites`,
      {
        headers: {
          'Authorization': `Bearer ${access_token}`,
        },
      }
    );

    if (response.ok) {
      const blockedSites = await response.json();
      const domains = blockedSites.map(site => site.domain);

      // If user has custom blocked sites, use them; otherwise use defaults
      const sitesToBlock = domains.length > 0 ? domains : DEFAULT_BLOCKED_SITES;

      await chrome.storage.sync.set({ blockedSites: sitesToBlock });
      console.log('Synced blocked sites from backend:', sitesToBlock);
    } else {
      console.error('Failed to sync blocked sites:', response.status);
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
    const blockedSites = result.blockedSites || DEFAULT_BLOCKED_SITES;

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
      sendResponse({ sites: result.blockedSites || DEFAULT_BLOCKED_SITES });
    });
    return true;
  }
});