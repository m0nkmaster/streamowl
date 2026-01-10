import { useEffect, useState } from "preact/hooks";
import { SUPPORTED_REGIONS } from "../lib/tmdb/client.ts";
import type { SupportedRegion } from "../lib/tmdb/client.ts";
import { getRegionName } from "../lib/region.ts";
import ThemeToggle from "./ThemeToggle.tsx";

interface SettingsPageProps {
  isAuthenticated: boolean;
  currentRegion: string;
  detectedRegion: string;
  publicProfileEnabled: boolean;
  userId: string;
  checkoutSuccess: boolean;
  checkoutCanceled: boolean;
  isPremium: boolean;
  subscriptionDetails: {
    planName: string | null;
    currentPeriodEnd: number | null;
    customerId: string | null;
  } | null;
}

export default function SettingsPage({
  currentRegion,
  detectedRegion,
  publicProfileEnabled,
  userId,
  checkoutSuccess,
  checkoutCanceled,
  isPremium,
  subscriptionDetails,
}: SettingsPageProps) {
  const [selectedRegion, setSelectedRegion] = useState<SupportedRegion>(
    currentRegion as SupportedRegion,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [publicProfile, setPublicProfile] = useState(publicProfileEnabled);
  const [profileLoading, setProfileLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);

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

  const handleManageSubscription = async () => {
    setPortalLoading(true);
    try {
      const response = await fetch("/api/premium/portal", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to open subscription portal");
      }

      const data = await response.json();
      if (data.url) {
        // Redirect to Stripe Customer Portal
        globalThis.location.href = data.url;
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to open subscription portal",
      );
      setTimeout(() => setError(null), 5000);
    } finally {
      setPortalLoading(false);
    }
  };

  const formatDate = (timestamp: number | null): string => {
    if (!timestamp) return "N/A";
    return new Date(timestamp * 1000).toLocaleDateString("en-GB", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getPlanDisplayName = (planName: string | null): string => {
    if (!planName) return "Premium";
    // Format plan name (e.g., "price_xxx" -> "Premium" or use nickname)
    if (planName.includes("monthly")) return "Premium Monthly";
    if (planName.includes("yearly") || planName.includes("annual")) {
      return "Premium Yearly";
    }
    return planName;
  };

  return (
    <div class="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="bg-white dark:bg-gray-800 shadow rounded-lg">
          <div class="px-6 py-5 border-b border-gray-200 dark:border-gray-700">
            <h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Settings
            </h1>
            <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Manage your account preferences
            </p>
          </div>

          <div class="px-6 py-5">
            <ThemeToggle />

            {checkoutSuccess && (
              <div class="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
                <div class="flex">
                  <div class="flex-shrink-0">
                    <svg
                      class="h-5 w-5 text-green-400"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fill-rule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clip-rule="evenodd"
                      />
                    </svg>
                  </div>
                  <div class="ml-3">
                    <h3 class="text-sm font-medium text-green-800">
                      Premium Subscription Activated!
                    </h3>
                    <div class="mt-2 text-sm text-green-700">
                      <p>
                        Thank you for upgrading! Your premium features are now
                        active. The webhook will update your account shortly if
                        it hasn't already.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {checkoutCanceled && (
              <div class="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
                <div class="flex">
                  <div class="flex-shrink-0">
                    <svg
                      class="h-5 w-5 text-yellow-400"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fill-rule="evenodd"
                        d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                        clip-rule="evenodd"
                      />
                    </svg>
                  </div>
                  <div class="ml-3">
                    <h3 class="text-sm font-medium text-yellow-800">
                      Checkout Canceled
                    </h3>
                    <div class="mt-2 text-sm text-yellow-700">
                      <p>
                        Your checkout was canceled. You can try again anytime
                        from the{" "}
                        <a href="/premium" class="underline font-medium">
                          premium page
                        </a>
                        .
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {isPremium && subscriptionDetails && (
              <div class="mb-6 pb-6 border-b border-gray-200 dark:border-gray-700">
                <h2 class="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                  Subscription
                </h2>
                <div class="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg p-4">
                  <div class="flex items-start justify-between">
                    <div>
                      <h3 class="text-sm font-medium text-indigo-900">
                        {getPlanDisplayName(subscriptionDetails.planName)}
                      </h3>
                      <p class="mt-1 text-sm text-indigo-700">
                        {subscriptionDetails.currentPeriodEnd
                          ? `Renews on ${
                            formatDate(subscriptionDetails.currentPeriodEnd)
                          }`
                          : "Active subscription"}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleManageSubscription}
                      disabled={portalLoading}
                      class={`ml-4 px-4 py-2 text-sm font-medium text-indigo-700 bg-white border border-indigo-300 rounded-md hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${
                        portalLoading ? "opacity-50 cursor-not-allowed" : ""
                      }`}
                    >
                      {portalLoading ? "Loading..." : "Manage Subscription"}
                    </button>
                  </div>
                  <p class="mt-3 text-xs text-indigo-600">
                    Manage your subscription, update payment methods, and view
                    billing history through the Stripe Customer Portal.
                  </p>
                </div>
              </div>
            )}

            {!isPremium && (
              <div class="mb-6 pb-6 border-b border-gray-200 dark:border-gray-700">
                <h2 class="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                  Subscription
                </h2>
                <div class="bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <p class="text-sm text-gray-700 dark:text-gray-300 mb-4">
                    Upgrade to Premium to unlock unlimited custom lists, more AI
                    recommendations, and exclusive features.
                  </p>
                  <a
                    href="/premium"
                    class="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Upgrade to Premium
                  </a>
                </div>
              </div>
            )}

            <div class="mb-6">
              <h2 class="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                Region Preference
              </h2>
              <p class="text-sm text-gray-500 dark:text-gray-400 mb-4">
                Set your preferred region to see streaming availability for that
                location. Your detected region is{" "}
                <span class="font-medium">
                  {getRegionName(detectedRegion as SupportedRegion)}
                </span>.
              </p>

              {success && (
                <div class="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
                  <p class="text-sm text-green-800 dark:text-green-200">
                    Region preference updated successfully!
                  </p>
                </div>
              )}

              {error && (
                <div class="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                  <p class="text-sm text-red-800 dark:text-red-200">{error}</p>
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
                        ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-900 dark:text-indigo-100"
                        : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600"
                    } ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    <div class="font-medium">{getRegionName(region)}</div>
                    <div class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {region}
                    </div>
                    {selectedRegion === region && (
                      <div class="mt-2 text-xs text-indigo-600 dark:text-indigo-400">
                        ✓ Current selection
                      </div>
                    )}
                  </button>
                ))}
              </div>

              {selectedRegion !== detectedRegion && (
                <div class="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
                  <p class="text-sm text-blue-800 dark:text-blue-200">
                    Your manual selection ({getRegionName(selectedRegion)}) is
                    different from your detected region (
                    {getRegionName(detectedRegion as SupportedRegion)}). This
                    preference will persist across sessions.
                  </p>
                </div>
              )}
            </div>

            <div class="mb-6 pt-6 border-t border-gray-200 dark:border-gray-700">
              <h2 class="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                Public Profile
              </h2>
              <p class="text-sm text-gray-500 dark:text-gray-400 mb-4">
                Enable your public profile to share your stats and favourites
                with others. Your profile will be accessible at{" "}
                <span class="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                  /profile/{userId}
                </span>
              </p>

              <div class="flex items-center">
                <label class="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={publicProfile}
                    onChange={async (e) => {
                      const enabled = e.currentTarget.checked;
                      setPublicProfile(enabled);
                      setProfileLoading(true);
                      setError(null);

                      try {
                        const response = await fetch(
                          "/api/settings/public-profile",
                          {
                            method: "POST",
                            headers: {
                              "Content-Type": "application/json",
                            },
                            body: JSON.stringify({ enabled }),
                          },
                        );

                        if (!response.ok) {
                          const data = await response.json();
                          throw new Error(
                            data.message || "Failed to update public profile",
                          );
                        }

                        setSuccess(true);
                        setTimeout(() => setSuccess(false), 3000);
                      } catch (err) {
                        setError(
                          err instanceof Error
                            ? err.message
                            : "Failed to update public profile",
                        );
                        // Revert on error
                        setPublicProfile(!enabled);
                      } finally {
                        setProfileLoading(false);
                      }
                    }}
                    disabled={profileLoading}
                    class="sr-only"
                  />
                  <div
                    class={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      publicProfile
                        ? "bg-indigo-600"
                        : "bg-gray-300 dark:bg-gray-600"
                    } ${profileLoading ? "opacity-50" : ""}`}
                  >
                    <span
                      class={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        publicProfile ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </div>
                  <span class="ml-3 text-sm font-medium text-gray-700 dark:text-gray-300">
                    {publicProfile
                      ? "Public Profile Enabled"
                      : "Public Profile Disabled"}
                  </span>
                </label>
              </div>

              {publicProfile && (
                <div class="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
                  <p class="text-sm text-blue-800 dark:text-blue-200">
                    Your public profile is live! Share it at:{" "}
                    <a
                      href={`/profile/${userId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      class="font-mono text-xs underline hover:text-blue-900"
                    >
                      /profile/{userId}
                    </a>
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
