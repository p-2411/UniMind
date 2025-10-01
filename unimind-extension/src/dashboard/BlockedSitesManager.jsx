import { useEffect, useState } from 'react'
import { fetchBlockedSites, addBlockedSite, removeBlockedSite } from '../api/client.js'
import '../styles/blocked-sites.css'

export default function BlockedSitesManager() {
  const [blockedSites, setBlockedSites] = useState([])
  const [newDomain, setNewDomain] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [addError, setAddError] = useState(null)
  const [isAdding, setIsAdding] = useState(false)

  useEffect(() => {
    loadBlockedSites()
  }, [])

  async function loadBlockedSites() {
    try {
      setLoading(true)
      const sites = await fetchBlockedSites()
      setBlockedSites(sites)
      setError(null)
    } catch (err) {
      console.error('Failed to load blocked sites', err)
      setError('Unable to load blocked sites')
    } finally {
      setLoading(false)
    }
  }

  async function handleAddSite(e) {
    e.preventDefault()

    const domain = newDomain.trim()
    if (!domain) return

    try {
      setIsAdding(true)
      setAddError(null)
      const newSite = await addBlockedSite(domain)
      setBlockedSites([...blockedSites, newSite])
      setNewDomain('')

      // Notify background script to update blocked sites
      chrome.runtime.sendMessage({ type: 'REFRESH_BLOCKED_SITES' })
    } catch (err) {
      console.error('Failed to add blocked site', err)
      setAddError(err.message || 'Failed to add site')
    } finally {
      setIsAdding(false)
    }
  }

  async function handleRemoveSite(siteId) {
    try {
      await removeBlockedSite(siteId)
      setBlockedSites(blockedSites.filter(site => site.id !== siteId))

      // Notify background script to update blocked sites
      chrome.runtime.sendMessage({ type: 'REFRESH_BLOCKED_SITES' })
    } catch (err) {
      console.error('Failed to remove blocked site', err)
      alert('Failed to remove site')
    }
  }

  if (loading) {
    return <div className="blocked-sites-manager loading">Loading...</div>
  }

  return (
    <div className="blocked-sites-manager">
      <h2>Blocked Sites</h2>
      <p className="subtitle">Customize which sites require a question before access</p>

      {error && <div className="alert error">{error}</div>}

      <form onSubmit={handleAddSite} className="add-site-form">
        <input
          type="text"
          value={newDomain}
          onChange={(e) => setNewDomain(e.target.value)}
          placeholder="e.g., youtube.com"
          className="domain-input"
          disabled={isAdding}
        />
        <button type="submit" className="add-button" disabled={isAdding || !newDomain.trim()}>
          {isAdding ? 'Adding...' : 'Add Site'}
        </button>
      </form>

      {addError && <div className="alert error">{addError}</div>}

      <div className="sites-list">
        {blockedSites.length === 0 ? (
          <div className="empty-state">
            No blocked sites yet. Add a site above to get started.
          </div>
        ) : (
          blockedSites.map((site) => (
            <div key={site.id} className="site-item">
              <span className="domain">{site.domain}</span>
              <button
                onClick={() => handleRemoveSite(site.id)}
                className="remove-button"
                title="Remove site"
              >
                ✕
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
