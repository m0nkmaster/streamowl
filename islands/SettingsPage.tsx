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
  userProfile: {
    email: string;
    displayName: string | null;
    avatarUrl: string | null;
  };
  notificationPreferences: {
    notificationsEnabled: boolean;
    newReleases: boolean;
    recommendations: boolean;
    watchlistAvailable: boolean;
  };
  accountInfo: {
    requiresPassword: boolean;
    isOAuthOnly: boolean;
  };
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
  userProfile,
  notificationPreferences,
  accountInfo,
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

  // Profile editing state
  const [displayName, setDisplayName] = useState(userProfile.displayName || "");
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameLoading, setNameLoading] = useState(false);
  const [nameSaved, setNameSaved] = useState(false);

  // Avatar upload state
  const [avatarUrl, setAvatarUrl] = useState(userProfile.avatarUrl);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);

  // Data export state
  const [exportLoading, setExportLoading] = useState(false);
  const [exportFormat, setExportFormat] = useState<"json" | "csv">("json");

  // Notification preferences state
  const [notifNewReleases, setNotifNewReleases] = useState(
    notificationPreferences.newReleases,
  );
  const [notifRecommendations, setNotifRecommendations] = useState(
    notificationPreferences.recommendations,
  );
  const [notifWatchlistAvailable, setNotifWatchlistAvailable] = useState(
    notificationPreferences.watchlistAvailable,
  );
  const [notifLoading, setNotifLoading] = useState<string | null>(null);

  // Account deletion state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteConfirmEmail, setDeleteConfirmEmail] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

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

  const handleSaveDisplayName = async () => {
    setNameLoading(true);
    setError(null);
    setNameSaved(false);

    try {
      const response = await fetch("/api/settings/profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ displayName: displayName.trim() || null }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to update display name");
      }

      setIsEditingName(false);
      setNameSaved(true);
      setTimeout(() => setNameSaved(false), 3000);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update display name",
      );
      setTimeout(() => setError(null), 5000);
    } finally {
      setNameLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setDisplayName(userProfile.displayName || "");
    setIsEditingName(false);
  };

  const handleAvatarUpload = async (file: File) => {
    setAvatarLoading(true);
    setAvatarError(null);

    try {
      // Validate file type on client side
      const allowedTypes = [
        "image/jpeg",
        "image/png",
        "image/gif",
        "image/webp",
      ];
      if (!allowedTypes.includes(file.type)) {
        throw new Error("Invalid file type. Allowed: JPEG, PNG, GIF, WebP");
      }

      // Validate file size (2MB max)
      if (file.size > 2 * 1024 * 1024) {
        throw new Error("File too large. Maximum size is 2MB");
      }

      const formData = new FormData();
      formData.append("avatar", file);

      const response = await fetch("/api/settings/avatar", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to upload avatar");
      }

      const data = await response.json();
      setAvatarUrl(data.avatarUrl);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setAvatarError(
        err instanceof Error ? err.message : "Failed to upload avatar",
      );
      setTimeout(() => setAvatarError(null), 5000);
    } finally {
      setAvatarLoading(false);
    }
  };

  const handleAvatarRemove = async () => {
    setAvatarLoading(true);
    setAvatarError(null);

    try {
      const response = await fetch("/api/settings/avatar", {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to remove avatar");
      }

      setAvatarUrl(null);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setAvatarError(
        err instanceof Error ? err.message : "Failed to remove avatar",
      );
      setTimeout(() => setAvatarError(null), 5000);
    } finally {
      setAvatarLoading(false);
    }
  };

  const handleExportData = async () => {
    setExportLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/settings/export?format=${exportFormat}`,
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to export data");
      }

      // Get filename from Content-Disposition header or generate one
      const contentDisposition = response.headers.get("Content-Disposition");
      let filename = `streamowl-export.${exportFormat}`;
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="(.+)"/);
        if (match) {
          filename = match[1];
        }
      }

      // Create blob and trigger download
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to export data",
      );
      setTimeout(() => setError(null), 5000);
    } finally {
      setExportLoading(false);
    }
  };

  const handleNotificationPreferenceChange = async (
    preference: "newReleases" | "recommendations" | "watchlistAvailable",
    enabled: boolean,
  ) => {
    setNotifLoading(preference);
    setError(null);

    // Optimistically update state
    const prevValue = preference === "newReleases"
      ? notifNewReleases
      : preference === "recommendations"
      ? notifRecommendations
      : notifWatchlistAvailable;

    if (preference === "newReleases") setNotifNewReleases(enabled);
    else if (preference === "recommendations") setNotifRecommendations(enabled);
    else setNotifWatchlistAvailable(enabled);

    try {
      const body: Record<string, boolean> = {};
      if (preference === "newReleases") body.notificationNewReleases = enabled;
      else if (preference === "recommendations") {
        body.notificationRecommendations = enabled;
      } else body.notificationWatchlistAvailable = enabled;

      const response = await fetch("/api/settings/notifications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(
          data.message || "Failed to update notification preference",
        );
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      // Revert on error
      if (preference === "newReleases") setNotifNewReleases(prevValue);
      else if (preference === "recommendations") {
        setNotifRecommendations(prevValue);
      } else setNotifWatchlistAvailable(prevValue);

      setError(
        err instanceof Error
          ? err.message
          : "Failed to update notification preference",
      );
      setTimeout(() => setError(null), 5000);
    } finally {
      setNotifLoading(null);
    }
  };

  return (
    <div class="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="bg-white dark:bg-gray-800 shadow rounded-lg">
          <div class="px-6 py-5 border-b border-gray-200 dark:border-gray-700">
            <h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Settings
            </h1>
            <p class="mt-1 text-sm text-gray-600 dark:text-gray-300">
              Manage your account preferences
            </p>
          </div>

          <div class="px-6 py-5">
            {/* Profile Section */}
            <div class="mb-6 pb-6 border-b border-gray-200 dark:border-gray-700">
              <h2 class="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                Profile
              </h2>

              <div class="flex items-start gap-6">
                {/* Avatar */}
                <div class="flex-shrink-0">
                  <div class="relative group">
                    <input
                      type="file"
                      id="avatar-upload"
                      accept="image/jpeg,image/png,image/gif,image/webp"
                      class="sr-only"
                      disabled={avatarLoading}
                      onChange={(e) => {
                        const file = e.currentTarget.files?.[0];
                        if (file) {
                          handleAvatarUpload(file);
                          // Reset input so same file can be selected again
                          e.currentTarget.value = "";
                        }
                      }}
                    />
                    <label
                      htmlFor="avatar-upload"
                      class={`block cursor-pointer ${
                        avatarLoading ? "opacity-50 cursor-not-allowed" : ""
                      }`}
                    >
                      {avatarUrl
                        ? (
                          <img
                            src={avatarUrl}
                            alt="Profile avatar"
                            class="w-20 h-20 rounded-full object-cover border-2 border-gray-200 dark:border-gray-700 group-hover:border-indigo-500 transition-colors"
                          />
                        )
                        : (
                          <div class="w-20 h-20 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center border-2 border-gray-200 dark:border-gray-700 group-hover:border-indigo-500 transition-colors">
                            <span class="text-2xl font-medium text-indigo-600 dark:text-indigo-400">
                              {(displayName || userProfile.email || "U").charAt(
                                0,
                              )
                                .toUpperCase()}
                            </span>
                          </div>
                        )}
                      {/* Hover overlay */}
                      <div class="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        {avatarLoading
                          ? (
                            <svg
                              class="animate-spin h-6 w-6 text-white"
                              fill="none"
                              viewBox="0 0 24 24"
                            >
                              <circle
                                class="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                stroke-width="4"
                              />
                              <path
                                class="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                              />
                            </svg>
                          )
                          : (
                            <svg
                              class="h-6 w-6 text-white"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                              />
                              <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                              />
                            </svg>
                          )}
                      </div>
                    </label>
                    {/* Remove button */}
                    {avatarUrl && !avatarLoading && (
                      <button
                        type="button"
                        onClick={handleAvatarRemove}
                        class="absolute -bottom-1 -right-1 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 shadow-md transition-colors"
                        title="Remove avatar"
                      >
                        <svg
                          class="h-3 w-3"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    )}
                  </div>
                  <p class="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
                    Click to change
                  </p>
                  {avatarError && (
                    <p class="text-xs text-red-600 dark:text-red-400 mt-1 text-center max-w-[120px]">
                      {avatarError}
                    </p>
                  )}
                </div>

                {/* Profile Details */}
                <div class="flex-1 min-w-0">
                  {/* Display Name */}
                  <div class="mb-4">
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Display Name
                    </label>
                    {isEditingName
                      ? (
                        <div class="flex items-center gap-2">
                          <input
                            type="text"
                            value={displayName}
                            onChange={(e) =>
                              setDisplayName(e.currentTarget.value)}
                            placeholder="Enter your display name"
                            maxLength={255}
                            class="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-gray-100 text-sm"
                            disabled={nameLoading}
                          />
                          <button
                            type="button"
                            onClick={handleSaveDisplayName}
                            disabled={nameLoading}
                            class={`px-3 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${
                              nameLoading ? "opacity-50 cursor-not-allowed" : ""
                            }`}
                          >
                            {nameLoading ? "Saving..." : "Save"}
                          </button>
                          <button
                            type="button"
                            onClick={handleCancelEdit}
                            disabled={nameLoading}
                            class="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                          >
                            Cancel
                          </button>
                        </div>
                      )
                      : (
                        <div class="flex items-center gap-2">
                          <span class="text-gray-900 dark:text-gray-100">
                            {displayName || (
                              <span class="text-gray-400 italic">Not set</span>
                            )}
                          </span>
                          <button
                            type="button"
                            onClick={() => setIsEditingName(true)}
                            class="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300"
                          >
                            Edit
                          </button>
                          {nameSaved && (
                            <span class="text-sm text-green-600 dark:text-green-400">
                              ✓ Saved
                            </span>
                          )}
                        </div>
                      )}
                  </div>

                  {/* Email (read-only) */}
                  <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Email
                    </label>
                    <span class="text-gray-900 dark:text-gray-100">
                      {userProfile.email}
                    </span>
                  </div>
                </div>
              </div>
            </div>

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

            {isPremium && (
              <div class="mb-6 pb-6 border-b border-gray-200 dark:border-gray-700">
                <h2 class="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                  Export Data
                </h2>
                <p class="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  Download all your data including your library, custom lists,
                  tags, ratings, and notes.
                </p>
                <div class="flex flex-col sm:flex-row gap-4">
                  <div class="flex items-center gap-3">
                    <label class="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Format:
                    </label>
                    <select
                      value={exportFormat}
                      onChange={(e) =>
                        setExportFormat(
                          e.currentTarget.value as "json" | "csv",
                        )}
                      disabled={exportLoading}
                      class="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-gray-100 text-sm"
                    >
                      <option value="json">JSON</option>
                      <option value="csv">CSV</option>
                    </select>
                  </div>
                  <button
                    type="button"
                    onClick={handleExportData}
                    disabled={exportLoading}
                    class={`inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${
                      exportLoading ? "opacity-50 cursor-not-allowed" : ""
                    }`}
                  >
                    {exportLoading
                      ? (
                        <>
                          <svg
                            class="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                            fill="none"
                            viewBox="0 0 24 24"
                          >
                            <circle
                              class="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              stroke-width="4"
                            />
                            <path
                              class="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            />
                          </svg>
                          Exporting...
                        </>
                      )
                      : (
                        <>
                          <svg
                            class="-ml-1 mr-2 h-4 w-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              stroke-linecap="round"
                              stroke-linejoin="round"
                              stroke-width="2"
                              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                            />
                          </svg>
                          Export Data
                        </>
                      )}
                  </button>
                </div>
                <p class="mt-3 text-xs text-gray-500 dark:text-gray-400">
                  JSON format is recommended for backups. CSV is useful for
                  spreadsheet analysis.
                </p>
              </div>
            )}

            <div class="mb-6">
              <h2 class="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                Region Preference
              </h2>
              <p class="text-sm text-gray-600 dark:text-gray-300 mb-4">
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
                    <div class="text-xs text-gray-600 dark:text-gray-400 mt-1">
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

            {/* Notification Preferences Section */}
            <div class="mb-6 pt-6 border-t border-gray-200 dark:border-gray-700">
              <h2 class="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                Notification Preferences
              </h2>
              <p class="text-sm text-gray-500 dark:text-gray-400 mb-4">
                Choose which notifications you'd like to receive. Push
                notifications must be enabled in your browser first.
              </p>

              {!notificationPreferences.notificationsEnabled && (
                <div class="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
                  <p class="text-sm text-yellow-800 dark:text-yellow-200">
                    Push notifications are not enabled. Enable them in your
                    browser to receive notifications.
                  </p>
                </div>
              )}

              <div class="space-y-4">
                {/* New Releases */}
                <div class="flex items-center justify-between">
                  <div>
                    <h3 class="text-sm font-medium text-gray-900 dark:text-gray-100">
                      New Releases
                    </h3>
                    <p class="text-sm text-gray-500 dark:text-gray-400">
                      Get notified when new content is available on your
                      streaming services
                    </p>
                  </div>
                  <label class="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={notifNewReleases}
                      onChange={(e) =>
                        handleNotificationPreferenceChange(
                          "newReleases",
                          e.currentTarget.checked,
                        )}
                      disabled={notifLoading === "newReleases"}
                      class="sr-only"
                    />
                    <div
                      class={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        notifNewReleases
                          ? "bg-indigo-600"
                          : "bg-gray-300 dark:bg-gray-600"
                      } ${notifLoading === "newReleases" ? "opacity-50" : ""}`}
                    >
                      <span
                        class={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          notifNewReleases ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
                    </div>
                  </label>
                </div>

                {/* Recommendations */}
                <div class="flex items-center justify-between">
                  <div>
                    <h3 class="text-sm font-medium text-gray-900 dark:text-gray-100">
                      Recommendations
                    </h3>
                    <p class="text-sm text-gray-500 dark:text-gray-400">
                      Get notified about personalised recommendations based on
                      your taste
                    </p>
                  </div>
                  <label class="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={notifRecommendations}
                      onChange={(e) =>
                        handleNotificationPreferenceChange(
                          "recommendations",
                          e.currentTarget.checked,
                        )}
                      disabled={notifLoading === "recommendations"}
                      class="sr-only"
                    />
                    <div
                      class={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        notifRecommendations
                          ? "bg-indigo-600"
                          : "bg-gray-300 dark:bg-gray-600"
                      } ${
                        notifLoading === "recommendations" ? "opacity-50" : ""
                      }`}
                    >
                      <span
                        class={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          notifRecommendations
                            ? "translate-x-6"
                            : "translate-x-1"
                        }`}
                      />
                    </div>
                  </label>
                </div>

                {/* Watchlist Available */}
                <div class="flex items-center justify-between">
                  <div>
                    <h3 class="text-sm font-medium text-gray-900 dark:text-gray-100">
                      Watchlist Availability
                    </h3>
                    <p class="text-sm text-gray-500 dark:text-gray-400">
                      Get notified when items on your watchlist become available
                      to stream
                    </p>
                  </div>
                  <label class="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={notifWatchlistAvailable}
                      onChange={(e) =>
                        handleNotificationPreferenceChange(
                          "watchlistAvailable",
                          e.currentTarget.checked,
                        )}
                      disabled={notifLoading === "watchlistAvailable"}
                      class="sr-only"
                    />
                    <div
                      class={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        notifWatchlistAvailable
                          ? "bg-indigo-600"
                          : "bg-gray-300 dark:bg-gray-600"
                      } ${
                        notifLoading === "watchlistAvailable"
                          ? "opacity-50"
                          : ""
                      }`}
                    >
                      <span
                        class={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          notifWatchlistAvailable
                            ? "translate-x-6"
                            : "translate-x-1"
                        }`}
                      />
                    </div>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
