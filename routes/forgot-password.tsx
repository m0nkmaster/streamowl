import { type Handlers, type PageProps } from "$fresh/server.ts";
import {
  CSRF_FIELD_NAME,
  generateCsrfToken,
  setCsrfCookie,
} from "../lib/security/csrf.ts";

interface ForgotPasswordPageProps {
  csrfToken: string;
  success?: boolean;
  error?: string;
}

export const handler: Handlers<ForgotPasswordPageProps> = {
  GET(_req, ctx) {
    // Generate CSRF token and set cookie
    const csrfToken = generateCsrfToken();
    const headers = new Headers();
    setCsrfCookie(headers, csrfToken);

    const url = new URL(ctx.url);
    const success = url.searchParams.get("success") === "true";
    const error = url.searchParams.get("error") || undefined;

    return ctx.render({ csrfToken, success, error }, { headers });
  },
};

export default function ForgotPasswordPage(
  props: PageProps<ForgotPasswordPageProps>,
) {
  const { csrfToken, success, error } = props.data;

  return (
    <div class="min-h-screen flex items-center justify-center bg-gray-50">
      <div class="max-w-md w-full space-y-8 p-8">
        <div>
          <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Reset your password
          </h2>
          <p class="mt-2 text-center text-sm text-gray-600">
            Enter your email address and we'll send you a link to reset your
            password.
          </p>
        </div>

        {success && (
          <div class="rounded-md bg-green-50 p-4">
            <div class="flex">
              <div class="flex-shrink-0">
                <svg
                  class="h-5 w-5 text-green-400"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div class="ml-3">
                <p class="text-sm font-medium text-green-800">
                  Check your email
                </p>
                <p class="mt-1 text-sm text-green-700">
                  If an account exists with that email, we've sent a password
                  reset link.
                </p>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div class="rounded-md bg-red-50 p-4">
            <div class="flex">
              <div class="flex-shrink-0">
                <svg
                  class="h-5 w-5 text-red-400"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div class="ml-3">
                <p class="text-sm font-medium text-red-800">{error}</p>
              </div>
            </div>
          </div>
        )}

        {!success && (
          <form
            class="mt-8 space-y-6"
            method="POST"
            action="/api/forgot-password"
          >
            <input type="hidden" name={CSRF_FIELD_NAME} value={csrfToken} />
            <div class="rounded-md shadow-sm">
              <div>
                <label for="email" class="sr-only">Email address</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  class="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                  placeholder="Email address"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                class="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Send reset link
              </button>
            </div>
          </form>
        )}

        <div class="text-center">
          <a
            href="/login"
            class="font-medium text-indigo-600 hover:text-indigo-500"
          >
            Back to sign in
          </a>
        </div>
      </div>
    </div>
  );
}
