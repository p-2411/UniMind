// src/components/BlockedSitesManager.tsx
import { useEffect, useState } from "react";
import { fetchBlockedSites, saveBlockedSites } from "../api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";

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

    if (blockedSites.some((s) => s.domain.toLowerCase() === domain.toLowerCase())) {
      setAddError("Site already in the list");
      return;
    }

    const newSite: Site = {
      id: `temp-${Date.now()}`,
      domain: domain.toLowerCase().replace(/^www\./, ""),
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

      const sites = await fetchBlockedSites();
      setBlockedSites(sites);
      setOriginalSites(sites);
      setSaveSuccess(true);

      try {
        await chrome.runtime.sendMessage({ type: "REFRESH_BLOCKED_SITES" });
      } catch (err) {
        console.warn("Failed to refresh blocked sites in background:", err);
      }

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
      <div className="space-y-2 text-sm text-gray-300">
        <div className="h-5 w-32 animate-pulse rounded bg-white/10" />
        <div className="h-4 w-64 animate-pulse rounded bg-white/10" />
        <div className="h-10 w-full animate-pulse rounded bg-white/10" />
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      {/* ❌ Removed the internal "Blocked Sites" header to avoid duplication */}

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
        <Label htmlFor="domain" className="text-gray-200">
          Add a domain
        </Label>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto]">
          <Input
            id="domain"
            type="text"
            value={newDomain}
            onChange={(e) => setNewDomain(e.target.value)}
            placeholder="e.g., youtube.com"
            disabled={isSaving}
            className="border-white/10 bg-white/5 text-white placeholder:text-gray-400"
          />
          <Button
            type="submit"
            disabled={isSaving || !newDomain.trim()}
            className="w-full border border-white/20 bg-white/10 font-semibold text-white hover:bg-white/15 sm:w-auto"
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

      {/* Save button row */}
      <div className="flex flex-wrap items-center gap-3">
        <Button
          onClick={handleSave}
          disabled={!hasChanges || isSaving}
          className="flex-1 bg-yellow-400 font-semibold text-black hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSaving ? "Saving…" : "Save Changes"}
        </Button>
        {saveSuccess && <span className="text-sm font-medium text-emerald-400">✓ Saved</span>}
      </div>

      {/* List box */}
      <section
        aria-label="Blocked sites"
        role="group"
        className="h-56 overflow-hidden rounded-lg border border-white/10 bg-white/5"
      >
        {blockedSites.length === 0 ? (
          <div className="flex h-full items-center justify-center px-3 py-4 text-center text-sm text-gray-300">
            No blocked sites yet. Add a site above to get started.
          </div>
        ) : (
          <ScrollArea className="h-full">
            <ul role="list" className="divide-y divide-white/10">
              {blockedSites.map((site) => (
                <li key={site.id} className="flex items-center gap-2 px-3 py-3">
                  <span className="flex-1 truncate text-gray-100" title={site.domain}>
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
      </section>
    </div>
  );
}
