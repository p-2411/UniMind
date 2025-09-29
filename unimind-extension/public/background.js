const DEFAULT_BLOCKED_SITES = [
  'facebook.com',
  'twitter.com',
  'instagram.com',
  'youtube.com',
  'reddit.com',
  'tiktok.com',
  'netflix.com'
];

// Initialize default blocked sites when extension is installed
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.get(['blockedSites'], (result) => {
    if (!result.blockedSites) {
      chrome.storage.sync.set({ blockedSites: DEFAULT_BLOCKED_SITES });
    }
  });
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