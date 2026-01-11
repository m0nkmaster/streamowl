import { useState } from "preact/hooks";
import { IS_BROWSER } from "$fresh/runtime.ts";

interface PremiumPricingPageProps {
  isAuthenticated: boolean;
  isPremium: boolean;
  monthlyPriceId: string | null;
  yearlyPriceId: string | null;
}

export default function PremiumPricingPage({
  isPremium,
  monthlyPriceId,
  yearlyPriceId,
}: PremiumPricingPageProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCheckout = async (priceId: string, _planName: string) => {
    if (!IS_BROWSER) return;

    setLoading(priceId);
    setError(null);

    try {
      const response = await fetch("/api/premium/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ priceId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to create checkout session");
      }

      const { url } = await response.json();

      if (url) {
        // Redirect to Stripe Checkout
        globalThis.location.href = url;
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to start checkout",
      );
      setLoading(null);
    }
  };

  // If already premium, show success message
  if (isPremium) {
    return (
      <div class="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div class="max-w-3xl mx-auto">
          <div class="bg-white shadow rounded-lg p-8 text-center">
            <div class="mb-4">
              <svg
                class="mx-auto h-16 w-16 text-green-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h1 class="text-3xl font-bold text-gray-900 mb-2">
              You're Already Premium!
            </h1>
            <p class="text-gray-600 mb-6">
              Thank you for being a premium member. Enjoy all the exclusive
              features!
            </p>
            <a
              href="/settings"
              class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
            >
              Go to Settings
            </a>
          </div>
        </div>
      </div>
    );
  }

  // Check if price IDs are configured
  if (!monthlyPriceId || !yearlyPriceId) {
    return (
      <div class="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div class="max-w-3xl mx-auto">
          <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <h2 class="text-lg font-medium text-yellow-800 mb-2">
              Configuration Required
            </h2>
            <p class="text-yellow-700">
              Stripe price IDs are not configured. Please set
              STRIPE_PRICE_ID_MONTHLY and STRIPE_PRICE_ID_YEARLY environment
              variables.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div class="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div class="max-w-4xl mx-auto">
        <div class="text-center mb-12">
          <h1 class="text-4xl font-bold text-gray-900 mb-4">
            Upgrade to Premium
          </h1>
          <p class="text-xl text-gray-600">
            Unlock unlimited features and get the most out of Stream Owl
          </p>
        </div>

        {error && (
          <div class="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <p class="text-sm text-red-800">{error}</p>
          </div>
        )}

        <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Monthly Plan */}
          <div class="bg-white rounded-lg shadow-lg border-2 border-gray-200 p-8">
            <div class="text-center">
              <h2 class="text-2xl font-bold text-gray-900 mb-2">Monthly</h2>
              <div class="mb-4">
                <span class="text-4xl font-bold text-gray-900">$4.99</span>
                <span class="text-gray-600">/month</span>
              </div>
              <p class="text-sm text-gray-500 mb-6">
                Billed monthly, cancel anytime
              </p>
            </div>

            <ul class="space-y-3 mb-8">
              <li class="flex items-start">
                <svg
                  class="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                <span class="text-gray-700">Unlimited custom lists</span>
              </li>
              <li class="flex items-start">
                <svg
                  class="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                <span class="text-gray-700">
                  Unlimited AI recommendations
                </span>
              </li>
              <li class="flex items-start">
                <svg
                  class="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                <span class="text-gray-700">AI conversation chat</span>
              </li>
              <li class="flex items-start">
                <svg
                  class="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                <span class="text-gray-700">Data export (CSV, JSON)</span>
              </li>
              <li class="flex items-start">
                <svg
                  class="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                <span class="text-gray-700">Ad-free experience</span>
              </li>
            </ul>

            <button
              onClick={() => handleCheckout(monthlyPriceId, "Monthly")}
              disabled={loading === monthlyPriceId}
              class={`w-full py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${
                loading === monthlyPriceId
                  ? "opacity-50 cursor-not-allowed"
                  : ""
              }`}
            >
              {loading === monthlyPriceId ? "Processing..." : "Choose Monthly"}
            </button>
          </div>

          {/* Yearly Plan */}
          <div class="bg-white rounded-lg shadow-lg border-2 border-indigo-500 p-8 relative">
            <div class="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
              <span class="bg-indigo-500 text-white px-4 py-1 rounded-full text-sm font-medium">
                Best Value
              </span>
            </div>

            <div class="text-center mt-4">
              <h2 class="text-2xl font-bold text-gray-900 mb-2">Yearly</h2>
              <div class="mb-2">
                <span class="text-4xl font-bold text-gray-900">$39.99</span>
                <span class="text-gray-600">/year</span>
              </div>
              <p class="text-sm text-green-600 font-medium mb-1">
                Save $20 per year
              </p>
              <p class="text-sm text-gray-500 mb-6">
                Billed annually, cancel anytime
              </p>
            </div>

            <ul class="space-y-3 mb-8">
              <li class="flex items-start">
                <svg
                  class="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                <span class="text-gray-700">Unlimited custom lists</span>
              </li>
              <li class="flex items-start">
                <svg
                  class="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                <span class="text-gray-700">
                  Unlimited AI recommendations
                </span>
              </li>
              <li class="flex items-start">
                <svg
                  class="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                <span class="text-gray-700">AI conversation chat</span>
              </li>
              <li class="flex items-start">
                <svg
                  class="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                <span class="text-gray-700">Data export (CSV, JSON)</span>
              </li>
              <li class="flex items-start">
                <svg
                  class="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                <span class="text-gray-700">Ad-free experience</span>
              </li>
            </ul>

            <button
              onClick={() => handleCheckout(yearlyPriceId, "Yearly")}
              disabled={loading === yearlyPriceId}
              class={`w-full py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${
                loading === yearlyPriceId ? "opacity-50 cursor-not-allowed" : ""
              }`}
            >
              {loading === yearlyPriceId ? "Processing..." : "Choose Yearly"}
            </button>
          </div>
        </div>

        <div class="mt-8 text-center">
          <p class="text-sm text-gray-500">
            All plans include a 30-day money-back guarantee. Cancel anytime from
            your settings.
          </p>
        </div>
      </div>
    </div>
  );
}
