import { type Handlers, type PageProps } from "$fresh/server.ts";
import {
  CSRF_FIELD_NAME as _CSRF_FIELD_NAME,
  generateCsrfToken,
  setCsrfCookie,
} from "../lib/security/csrf.ts";
import LoginForm from "../islands/LoginForm.tsx";

interface LoginPageProps {
  csrfToken: string;
  returnTo: string;
  resetSuccess?: boolean;
}

export const handler: Handlers<LoginPageProps> = {
  GET(req, ctx) {
    // Generate CSRF token and set cookie
    const csrfToken = generateCsrfToken();
    const headers = new Headers();
    setCsrfCookie(headers, csrfToken);

    const url = new URL(req.url);
    const returnTo = url.searchParams.get("returnTo") || "/dashboard";
    const resetSuccess = url.searchParams.get("reset") === "success";

    return ctx.render({ csrfToken, returnTo, resetSuccess }, { headers });
  },
};

export default function LoginPage(props: PageProps<LoginPageProps>) {
  const { csrfToken, returnTo, resetSuccess } = props.data;

  return (
    <div class="min-h-screen flex items-center justify-center bg-gray-50">
      <div class="max-w-md w-full space-y-8 p-8">
        <div>
          <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sign in to your account
          </h2>
        </div>

        {resetSuccess && (
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
                  Password reset successful
                </p>
                <p class="mt-1 text-sm text-green-700">
                  You can now sign in with your new password.
                </p>
              </div>
            </div>
          </div>
        )}

        <LoginForm csrfToken={csrfToken} returnTo={returnTo} />

        <div class="mt-6">
          <div class="relative">
            <div class="absolute inset-0 flex items-center">
              <div class="w-full border-t border-gray-300"></div>
            </div>
            <div class="relative flex justify-center text-sm">
              <span class="px-2 bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                Or continue with
              </span>
            </div>
          </div>

          <div class="mt-6">
            <a
              href={`/api/auth/google?returnTo=${encodeURIComponent(returnTo)}`}
              class="w-full inline-flex justify-center py-2 px-4 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <svg class="h-5 w-5" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              <span class="ml-2">Continue with Google</span>
            </a>
          </div>
        </div>

        <div class="text-center">
          <a
            href="/signup"
            class="font-medium text-indigo-600 hover:text-indigo-500"
          >
            Don't have an account? Sign up
          </a>
        </div>
      </div>
    </div>
  );
}
