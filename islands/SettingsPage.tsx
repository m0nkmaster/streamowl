import { useState, useEffect } from "preact/hooks";
import { SUPPORTED_REGIONS } from "../lib/tmdb/client.ts";
import type { SupportedRegion } from "../lib/tmdb/client.ts";
import { getRegionName } from "../lib/region.ts";

interface SettingsPageProps {
  isAuthenticated: boolean;
  currentRegion: string;
  detectedRegion: string;
}

export default function SettingsPage({
  currentRegion,
  detectedRegion,
}: SettingsPageProps) {
  const [selectedRegion, setSelectedRegion] = useState<SupportedRegion>(
    currentRegion as SupportedRegion,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Fetch current region preference on mount
  useEffect(() => {
    async function fetchRegion() {
      try {
        const response = await fetch("/api/settings/region");
        if (response.ok) {
          const data = await response.json();
          if (data.region) {
            setSelectedRegion(data.region);
          }
        }
      } catch (err) {
        console.error("Failed to fetch region preference:", err);
      }
    }
    fetchRegion();
  }, []);

  const handleRegionChange = async (region: SupportedRegion) => {
    setSelectedRegion(region);
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch("/api/settings/region", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ region }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to update region");
      }

      setSuccess(true);
      // Reload page to update streaming availability
      setTimeout(() => {
        globalThis.location.reload();
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update region");
      // Revert selection on error
      setSelectedRegion(currentRegion as SupportedRegion);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div class="min-h-screen bg-gray-50 py-8">
      <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="bg-white shadow rounded-lg">
          <div class="px-6 py-5 border-b border-gray-200">
            <h1 class="text-2xl font-bold text-gray-900">Settings</h1>
            <p class="mt-1 text-sm text-gray-500">
              Manage your account preferences
            </p>
          </div>

          <div class="px-6 py-5">
            <div class="mb-6">
              <h2 class="text-lg font-medium text-gray-900 mb-2">
                Region Preference
              </h2>
              <p class="text-sm text-gray-500 mb-4">
                Set your preferred region to see streaming availability for that
                location. Your detected region is{" "}
                <span class="font-medium">{getRegionName(detectedRegion as SupportedRegion)}</span>.
              </p>

              {success && (
                <div class="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
                  <p class="text-sm text-green-800">
                    Region preference updated successfully!
                  </p>
                </div>
              )}

              {error && (
                <div class="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                  <p class="text-sm text-red-800">{error}</p>
                </div>
              )}

              <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {SUPPORTED_REGIONS.map((region) => (
                  <button
                    key={region}
                    type="button"
                    onClick={() => handleRegionChange(region)}
                    disabled={loading}
                    class={`px-4 py-3 rounded-lg border-2 text-left transition-colors ${
                      selectedRegion === region
                        ? "border-indigo-500 bg-indigo-50 text-indigo-900"
                        : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                    } ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    <div class="font-medium">{getRegionName(region)}</div>
                    <div class="text-xs text-gray-500 mt-1">{region}</div>
                    {selectedRegion === region && (
                      <div class="mt-2 text-xs text-indigo-600">
                        ✓ Current selection
                      </div>
                    )}
                  </button>
                ))}
              </div>

              {selectedRegion !== detectedRegion && (
                <div class="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                  <p class="text-sm text-blue-800">
                    Your manual selection ({getRegionName(selectedRegion)}) is
                    different from your detected region (
                    {getRegionName(detectedRegion as SupportedRegion)}). This
                    preference will persist across sessions.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
