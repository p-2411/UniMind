// src/components/BlockedSitesManager.tsx
import { useEffect, useState } from "react";
import { fetchBlockedSites, addBlockedSite, removeBlockedSite } from "../api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area"; // if you don't have shadcn ScrollArea, see fallback below

type Site = { id: string; domain: string };

export default function BlockedSitesManager() {
  const [blockedSites, setBlockedSites] = useState<Site[]>([]);
  const [newDomain, setNewDomain] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addError, setAddError] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    loadBlockedSites();
  }, []);

  async function loadBlockedSites() {
    try {
      setLoading(true);
      const sites = await fetchBlockedSites();
      setBlockedSites(sites);
      setError(null);
    } catch (err) {
      console.error("Failed to load blocked sites", err);
      setError("Unable to load blocked sites");
    } finally {
      setLoading(false);
    }
  }

  async function handleAddSite(e: React.FormEvent) {
    e.preventDefault();
    const domain = newDomain.trim();
    if (!domain) return;

    try {
      setIsAdding(true);
      setAddError(null);
      const newSite = await addBlockedSite(domain);
      setBlockedSites((prev) => [...prev, newSite]);
      setNewDomain("");

      chrome.runtime.sendMessage({ type: "REFRESH_BLOCKED_SITES" });
    } catch (err: any) {
      console.error("Failed to add blocked site", err);
      setAddError(err?.message || "Failed to add site");
    } finally {
      setIsAdding(false);
    }
  }

  async function handleRemoveSite(siteId: string) {
    try {
      await removeBlockedSite(siteId);
      setBlockedSites((prev) => prev.filter((s) => s.id !== siteId));
      chrome.runtime.sendMessage({ type: "REFRESH_BLOCKED_SITES" });
    } catch (err) {
      console.error("Failed to remove blocked site", err);
      alert("Failed to remove site");
    }
  }

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
    <div className="space-y-4">
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
            disabled={isAdding}
            className="bg-white/5 text-slate-100 placeholder:text-slate-400 border-white/10"
          />
          <Button
            type="submit"
            disabled={isAdding || !newDomain.trim()}
            className="whitespace-nowrap bg-amber-400 text-black hover:bg-amber-300 font-semibold"
          >
            {isAdding ? "Adding…" : "Add Site"}
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

      {/* Sites list — contained & scrollable */}
      {blockedSites.length === 0 ? (
        <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-4 text-sm text-slate-300">
          No blocked sites yet. Add a site above to get started.
        </div>
      ) : (
        <ScrollArea className="max-h-56 rounded-lg border border-white/10 bg-white/5">
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
                  className="text-red-300 hover:text-red-200"
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
