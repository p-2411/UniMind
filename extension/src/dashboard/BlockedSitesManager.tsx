// src/components/BlockedSitesManager.tsx
import { useEffect, useState } from "react";
import { fetchBlockedSites, saveBlockedSites } from "../api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area"; // if you don't have shadcn ScrollArea, see fallback below

type Site = { id: string; domain: string };

export default function BlockedSitesManager() {
  const [originalSites, setOriginalSites] = useState<Site[]>([]);
  const [blockedSites, setBlockedSites] = useState<Site[]>([]);
  const [newDomain, setNewDomain] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addError, setAddError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    loadBlockedSites();
  }, []);

  async function loadBlockedSites() {
    try {
      setLoading(true);
      const sites = await fetchBlockedSites();
      setBlockedSites(sites);
      setOriginalSites(sites);
      setError(null);
    } catch (err) {
      console.error("Failed to load blocked sites", err);
      setError("Unable to load blocked sites");
    } finally {
      setLoading(false);
    }
  }

  function handleAddSite(e: React.FormEvent) {
    e.preventDefault();
    const domain = newDomain.trim();
    if (!domain) return;

    setAddError(null);

    // Check if domain already exists
    if (blockedSites.some(s => s.domain.toLowerCase() === domain.toLowerCase())) {
      setAddError("Site already in the list");
      return;
    }

    // Add to local state with temporary ID
    const newSite: Site = {
      id: `temp-${Date.now()}`,
      domain: domain.toLowerCase().replace(/^www\./, ''),
    };
    setBlockedSites((prev) => [...prev, newSite]);
    setNewDomain("");
    setSaveSuccess(false);
  }

  function handleRemoveSite(siteId: string) {
    setBlockedSites((prev) => prev.filter((s) => s.id !== siteId));
    setSaveSuccess(false);
  }

  async function handleSave() {
    try {
      setIsSaving(true);
      setError(null);
      setSaveSuccess(false);

      await saveBlockedSites(blockedSites);

      // Reload from server to get real IDs
      const sites = await fetchBlockedSites();
      setBlockedSites(sites);
      setOriginalSites(sites);
      setSaveSuccess(true);

      chrome.runtime.sendMessage({ type: "REFRESH_BLOCKED_SITES" });

      // Clear success message after 3 seconds
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      console.error("Failed to save blocked sites", err);
      setError(err?.message || "Failed to save changes");
    } finally {
      setIsSaving(false);
    }
  }

  const hasChanges = JSON.stringify(blockedSites) !== JSON.stringify(originalSites);

  if (loading) {
    return (
      <div className="space-y-2 text-sm text-slate-300">
        <div className="h-5 w-32 animate-pulse rounded bg-white/10" />
        <div className="h-4 w-64 animate-pulse rounded bg-white/10" />
        <div className="h-10 w-full animate-pulse rounded bg-white/10" />
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      {/* Heading */}
      <div>
        <h2 className="text-lg font-semibold text-slate-100">Blocked Sites</h2>
        <p className="text-sm text-slate-400">
          Customize which sites require a question before access
        </p>
      </div>

      {/* Error */}
      {error && (
        <div
          role="status"
          aria-live="polite"
          className="rounded-md border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-200"
        >
          {error}
        </div>
      )}

      {/* Add site form */}
      <form onSubmit={handleAddSite} className="space-y-2">
        <Label htmlFor="domain" className="text-slate-200">
          Add a domain
        </Label>
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2">
          <Input
            id="domain"
            type="text"
            value={newDomain}
            onChange={(e) => setNewDomain(e.target.value)}
            placeholder="e.g., youtube.com"
            disabled={isSaving}
            className="bg-white/5 text-slate-100 placeholder:text-slate-400 border-white/10"
          />
          <Button
            type="submit"
            disabled={isSaving || !newDomain.trim()}
            className="whitespace-nowrap bg-white/10 text-slate-100 hover:bg-white/15 font-semibold border border-white/20"
          >
            Add Site
          </Button>
        </div>

        {addError && (
          <div
            role="status"
            aria-live="polite"
            className="mt-2 rounded-md border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-200"
          >
            {addError}
          </div>
        )}
      </form>

      {/* Save button */}
      <div className="flex items-center gap-3">
        <Button
          onClick={handleSave}
          disabled={!hasChanges || isSaving}
          className="flex-1 bg-amber-400 text-black hover:bg-amber-300 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving ? "Saving…" : "Save Changes"}
        </Button>
        {saveSuccess && (
          <span className="text-sm text-emerald-400 font-medium">
            ✓ Saved
          </span>
        )}
      </div>

      {/* Sites list — contained & scrollable */}
      {blockedSites.length === 0 ? (
        <div className="flex flex-1 items-center justify-center rounded-lg border border-white/10 bg-white/5 px-3 py-4 text-center text-sm text-slate-300">
          No blocked sites yet. Add a site above to get started.
        </div>
      ) : (
        <ScrollArea className="flex-1 min-h-0 rounded-lg border border-white/10 bg-white/5">
          <ul className="divide-y divide-white/10">
            {blockedSites.map((site) => (
              <li
                key={site.id}
                className="flex items-center gap-2 px-3 py-3"
              >
                <span
                  className="flex-1 truncate text-slate-100"
                  title={site.domain}
                >
                  {site.domain}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="shrink-0 text-red-300 hover:text-red-200"
                  onClick={() => handleRemoveSite(site.id)}
                  title="Remove site"
                >
                  ✕
                </Button>
              </li>
            ))}
          </ul>
        </ScrollArea>
      )}
    </div>
  );
}
