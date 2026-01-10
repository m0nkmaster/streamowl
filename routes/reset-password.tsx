import { type Handlers, type PageProps } from "$fresh/server.ts";
import {
  CSRF_FIELD_NAME,
  generateCsrfToken,
  setCsrfCookie,
} from "../lib/security/csrf.ts";
import { validatePasswordResetToken } from "../lib/auth/password-reset.ts";

interface ResetPasswordPageProps {
  csrfToken: string;
  token?: string;
  validToken: boolean;
  error?: string;
}

export const handler: Handlers<ResetPasswordPageProps> = {
  async GET(req, ctx) {
    // Generate CSRF token and set cookie
    const csrfToken = generateCsrfToken();
    const headers = new Headers();
    setCsrfCookie(headers, csrfToken);

    const url = new URL(req.url);
    const token = url.searchParams.get("token") || undefined;
    let validToken = false;

    if (token) {
      // Validate token
      const userId = await validatePasswordResetToken(token);
      validToken = userId !== null;
    }

    const error = url.searchParams.get("error") || undefined;

    return ctx.render(
      { csrfToken, token, validToken, error },
      { headers },
    );
  },
};

export default function ResetPasswordPage(
  props: PageProps<ResetPasswordPageProps>,
) {
  const { csrfToken, token, validToken, error } = props.data;

  if (!token) {
    return (
      <div class="min-h-screen flex items-center justify-center bg-gray-50">
        <div class="max-w-md w-full space-y-8 p-8">
          <div>
            <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">
              Invalid reset link
            </h2>
            <p class="mt-2 text-center text-sm text-gray-600">
              This password reset link is invalid. Please request a new one.
            </p>
          </div>
          <div class="text-center">
            <a
              href="/forgot-password"
              class="font-medium text-indigo-600 hover:text-indigo-500"
            >
              Request new reset link
            </a>
          </div>
        </div>
      </div>
    );
  }

  if (!validToken) {
    return (
      <div class="min-h-screen flex items-center justify-center bg-gray-50">
        <div class="max-w-md w-full space-y-8 p-8">
          <div>
            <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">
              Reset link expired
            </h2>
            <p class="mt-2 text-center text-sm text-gray-600">
              This password reset link has expired or has already been used.
              Please request a new one.
            </p>
          </div>
          <div class="text-center">
            <a
              href="/forgot-password"
              class="font-medium text-indigo-600 hover:text-indigo-500"
            >
              Request new reset link
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div class="min-h-screen flex items-center justify-center bg-gray-50">
      <div class="max-w-md w-full space-y-8 p-8">
        <div>
          <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Set new password
          </h2>
          <p class="mt-2 text-center text-sm text-gray-600">
            Enter your new password below.
          </p>
        </div>

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

        <form class="mt-8 space-y-6" method="POST" action="/api/reset-password">
          <input type="hidden" name="token" value={token} />
          <input type="hidden" name={CSRF_FIELD_NAME} value={csrfToken} />
          <div class="rounded-md shadow-sm -space-y-px">
            <div>
              <label for="password" class="sr-only">New password</label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                class="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="New password (min 8 characters)"
              />
            </div>
            <div>
              <label for="confirmPassword" class="sr-only">
                Confirm password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                class="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Confirm password"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              class="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Reset password
            </button>
          </div>
        </form>

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
