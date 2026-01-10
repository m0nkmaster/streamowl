import { useState } from "preact/hooks";
import { CSRF_FIELD_NAME } from "../lib/security/csrf.ts";

interface LoginFormProps {
  csrfToken: string;
  returnTo: string;
}

interface ValidationErrors {
  email?: string;
  password?: string;
  general?: string;
}

/**
 * Login form component with client-side error handling
 * Displays field-level validation errors
 */
export default function LoginForm({ csrfToken, returnTo }: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    setErrors({});
    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("email", email);
      formData.append("password", password);
      formData.append("returnTo", returnTo);
      formData.append(CSRF_FIELD_NAME, csrfToken);

      const response = await fetch("/api/login", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        // Redirect handled by server
        const redirectUrl = returnTo.startsWith("/") ? returnTo : "/dashboard";
        window.location.href = redirectUrl;
        return;
      }

      // Handle error response
      const errorData = await response.json().catch(() => ({}));

      if (response.status === 400 && errorData.details) {
        // Validation errors with field details
        const fieldErrors: ValidationErrors = {};
        Object.entries(errorData.details).forEach(([field, messages]) => {
          const messageArray = Array.isArray(messages) ? messages : [messages];
          fieldErrors[field as keyof ValidationErrors] = messageArray[0];
        });
        setErrors(fieldErrors);
      } else if (response.status === 401) {
        // Invalid credentials
        setErrors({
          general: errorData.message || "Invalid email or password",
        });
      } else if (response.status === 429) {
        // Rate limit
        setErrors({
          general: errorData.message ||
            "Too many failed login attempts. Please try again later.",
        });
      } else {
        // Generic error
        setErrors({
          general: errorData.message || "Failed to log in. Please try again.",
        });
      }
    } catch (error) {
      setErrors({
        general: "Network error. Please check your connection and try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form class="mt-8 space-y-6" onSubmit={handleSubmit}>
      <input type="hidden" name="returnTo" value={returnTo} />
      <input type="hidden" name={CSRF_FIELD_NAME} value={csrfToken} />

      {/* General error message */}
      {errors.general && (
        <div
          class="rounded-md bg-red-50 p-4"
          role="alert"
          aria-live="assertive"
        >
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
              <p class="text-sm font-medium text-red-800">{errors.general}</p>
            </div>
          </div>
        </div>
      )}

      <div class="rounded-md shadow-sm -space-y-px">
        <div>
          <label for="email" class="sr-only">Email address</label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onInput={(e) => setEmail((e.target as HTMLInputElement).value)}
            class={`appearance-none rounded-none relative block w-full px-3 py-2 border ${
              errors.email
                ? "border-red-300 text-red-900 placeholder-red-300 focus:ring-red-500 focus:border-red-500"
                : "border-gray-300 placeholder-gray-600 dark:placeholder-gray-400 text-gray-900 dark:text-gray-100 focus:ring-indigo-500 focus:border-indigo-500"
            } rounded-t-md focus:outline-none focus:z-10 sm:text-sm bg-white dark:bg-gray-800`}
            placeholder="Email address"
            aria-invalid={errors.email ? "true" : "false"}
            aria-describedby={errors.email ? "email-error" : undefined}
          />
          {errors.email && (
            <p
              id="email-error"
              class="mt-1 text-sm text-red-600"
              role="alert"
            >
              {errors.email}
            </p>
          )}
        </div>
        <div>
          <label for="password" class="sr-only">Password</label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onInput={(e) => setPassword((e.target as HTMLInputElement).value)}
            class={`appearance-none rounded-none relative block w-full px-3 py-2 border ${
              errors.password
                ? "border-red-300 text-red-900 placeholder-red-300 focus:ring-red-500 focus:border-red-500"
                : "border-gray-300 placeholder-gray-600 dark:placeholder-gray-400 text-gray-900 dark:text-gray-100 focus:ring-indigo-500 focus:border-indigo-500"
            } rounded-b-md focus:outline-none focus:z-10 sm:text-sm bg-white dark:bg-gray-800`}
            placeholder="Password"
            aria-invalid={errors.password ? "true" : "false"}
            aria-describedby={errors.password ? "password-error" : undefined}
          />
          {errors.password && (
            <p
              id="password-error"
              class="mt-1 text-sm text-red-600"
              role="alert"
            >
              {errors.password}
            </p>
          )}
        </div>
      </div>

      <div>
        <button
          type="submit"
          disabled={isSubmitting}
          class="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? "Signing in..." : "Sign in"}
        </button>
      </div>

      <div class="text-center">
        <a
          href="/forgot-password"
          class="font-medium text-indigo-600 hover:text-indigo-500"
        >
          Forgot your password?
        </a>
      </div>
    </form>
  );
}
