import { Head } from "$fresh/runtime.ts";

/**
 * Privacy Policy page
 * Discloses data handling practices to users
 */
export default function PrivacyPolicy() {
  return (
    <>
      <Head>
        <title>Privacy Policy | Stream Owl</title>
        <meta
          name="description"
          content="Stream Owl's privacy policy. Learn how we collect, use, and protect your personal data."
        />
      </Head>
      <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-8">
          Privacy Policy
        </h1>

        <div class="prose prose-lg dark:prose-invert max-w-none">
          <p class="text-gray-600 dark:text-gray-300 mb-6">
            Last updated: {new Date().toLocaleDateString("en-GB", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>

          <section class="mb-8">
            <h2 class="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              1. Introduction
            </h2>
            <p class="text-gray-600 dark:text-gray-300 mb-4">
              Stream Owl ("we", "our", or "us") is committed to protecting your
              privacy. This Privacy Policy explains how we collect, use,
              disclose, and safeguard your information when you use our website
              and services.
            </p>
          </section>

          <section class="mb-8">
            <h2 class="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              2. Information We Collect
            </h2>

            <h3 class="text-xl font-medium text-gray-800 dark:text-gray-200 mb-3">
              2.1 Information You Provide
            </h3>
            <ul class="list-disc list-inside text-gray-600 dark:text-gray-300 mb-4 space-y-2">
              <li>Account information (email address, display name, password)</li>
              <li>Profile information (avatar, preferences)</li>
              <li>Content interactions (ratings, reviews, watchlists, favourites)</li>
              <li>Custom lists and personal notes</li>
              <li>Support enquiries and correspondence</li>
            </ul>

            <h3 class="text-xl font-medium text-gray-800 dark:text-gray-200 mb-3">
              2.2 Information Collected Automatically
            </h3>
            <ul class="list-disc list-inside text-gray-600 dark:text-gray-300 mb-4 space-y-2">
              <li>Device information (browser type, operating system)</li>
              <li>Usage data (pages visited, features used, search queries)</li>
              <li>IP address and approximate location for regional content</li>
              <li>Cookies and similar tracking technologies</li>
            </ul>
          </section>

          <section class="mb-8">
            <h2 class="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              3. How We Use Your Information
            </h2>
            <p class="text-gray-600 dark:text-gray-300 mb-4">
              We use the information we collect to:
            </p>
            <ul class="list-disc list-inside text-gray-600 dark:text-gray-300 mb-4 space-y-2">
              <li>Provide, maintain, and improve our services</li>
              <li>Personalise your experience and provide AI-powered recommendations</li>
              <li>Process transactions and manage subscriptions</li>
              <li>Send service-related communications and notifications</li>
              <li>Detect, prevent, and address security issues</li>
              <li>Analyse usage patterns to enhance our platform</li>
            </ul>
          </section>

          <section class="mb-8">
            <h2 class="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              4. Third-Party Services
            </h2>
            <p class="text-gray-600 dark:text-gray-300 mb-4">
              We integrate with the following third-party services:
            </p>

            <h3 class="text-xl font-medium text-gray-800 dark:text-gray-200 mb-3">
              4.1 The Movie Database (TMDB)
            </h3>
            <p class="text-gray-600 dark:text-gray-300 mb-4">
              We use TMDB's API to provide movie and TV show information,
              including titles, descriptions, images, and streaming availability.
              This product uses the TMDB API but is not endorsed or certified by
              TMDB. For more information, visit{" "}
              <a
                href="https://www.themoviedb.org/privacy-policy"
                target="_blank"
                rel="noopener noreferrer"
                class="text-green-600 dark:text-green-400 hover:underline"
              >
                TMDB's Privacy Policy
              </a>.
            </p>

            <h3 class="text-xl font-medium text-gray-800 dark:text-gray-200 mb-3">
              4.2 OpenAI
            </h3>
            <p class="text-gray-600 dark:text-gray-300 mb-4">
              We use OpenAI's services to generate personalised recommendations
              and power our AI chat features. Your viewing preferences and
              ratings may be processed to improve recommendation accuracy. For
              more information, visit{" "}
              <a
                href="https://openai.com/privacy"
                target="_blank"
                rel="noopener noreferrer"
                class="text-green-600 dark:text-green-400 hover:underline"
              >
                OpenAI's Privacy Policy
              </a>.
            </p>

            <h3 class="text-xl font-medium text-gray-800 dark:text-gray-200 mb-3">
              4.3 Stripe
            </h3>
            <p class="text-gray-600 dark:text-gray-300 mb-4">
              We use Stripe to process payments for premium subscriptions. Payment
              information is handled directly by Stripe and is not stored on our
              servers. For more information, visit{" "}
              <a
                href="https://stripe.com/privacy"
                target="_blank"
                rel="noopener noreferrer"
                class="text-green-600 dark:text-green-400 hover:underline"
              >
                Stripe's Privacy Policy
              </a>.
            </p>

            <h3 class="text-xl font-medium text-gray-800 dark:text-gray-200 mb-3">
              4.4 Google OAuth
            </h3>
            <p class="text-gray-600 dark:text-gray-300 mb-4">
              If you choose to sign in with Google, we receive basic profile
              information (name, email, profile picture) from your Google account.
              For more information, visit{" "}
              <a
                href="https://policies.google.com/privacy"
                target="_blank"
                rel="noopener noreferrer"
                class="text-green-600 dark:text-green-400 hover:underline"
              >
                Google's Privacy Policy
              </a>.
            </p>
          </section>

          <section class="mb-8">
            <h2 class="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              5. Data Sharing and Disclosure
            </h2>
            <p class="text-gray-600 dark:text-gray-300 mb-4">
              We do not sell your personal information. We may share your
              information in the following circumstances:
            </p>
            <ul class="list-disc list-inside text-gray-600 dark:text-gray-300 mb-4 space-y-2">
              <li>With your consent or at your direction</li>
              <li>With service providers who assist in operating our platform</li>
              <li>To comply with legal obligations or respond to lawful requests</li>
              <li>To protect our rights, privacy, safety, or property</li>
              <li>In connection with a merger, acquisition, or sale of assets</li>
            </ul>
          </section>

          <section class="mb-8">
            <h2 class="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              6. Data Security
            </h2>
            <p class="text-gray-600 dark:text-gray-300 mb-4">
              We implement appropriate technical and organisational measures to
              protect your personal information, including:
            </p>
            <ul class="list-disc list-inside text-gray-600 dark:text-gray-300 mb-4 space-y-2">
              <li>Encryption of data in transit using HTTPS</li>
              <li>Secure password hashing using bcrypt</li>
              <li>Regular security assessments and updates</li>
              <li>Access controls and authentication measures</li>
            </ul>
          </section>

          <section class="mb-8">
            <h2 class="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              7. Your Rights
            </h2>
            <p class="text-gray-600 dark:text-gray-300 mb-4">
              Depending on your location, you may have the following rights:
            </p>
            <ul class="list-disc list-inside text-gray-600 dark:text-gray-300 mb-4 space-y-2">
              <li>Access and receive a copy of your personal data</li>
              <li>Correct inaccurate or incomplete information</li>
              <li>Delete your account and associated data</li>
              <li>Export your data in a portable format</li>
              <li>Opt out of certain data processing activities</li>
              <li>Withdraw consent where processing is based on consent</li>
            </ul>
            <p class="text-gray-600 dark:text-gray-300 mb-4">
              To exercise these rights, please visit your account settings or
              contact us using the details below.
            </p>
          </section>

          <section class="mb-8">
            <h2 class="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              8. Cookies
            </h2>
            <p class="text-gray-600 dark:text-gray-300 mb-4">
              We use cookies and similar technologies to:
            </p>
            <ul class="list-disc list-inside text-gray-600 dark:text-gray-300 mb-4 space-y-2">
              <li>Maintain your session and authentication state</li>
              <li>Remember your preferences (theme, region)</li>
              <li>Analyse site usage and performance</li>
              <li>Provide security features (CSRF protection)</li>
            </ul>
            <p class="text-gray-600 dark:text-gray-300 mb-4">
              You can control cookies through your browser settings, though some
              features may not function properly without them.
            </p>
          </section>

          <section class="mb-8">
            <h2 class="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              9. Data Retention
            </h2>
            <p class="text-gray-600 dark:text-gray-300 mb-4">
              We retain your personal information for as long as your account is
              active or as needed to provide you with our services. If you delete
              your account, we will remove your personal data within 30 days,
              except where we are required to retain it for legal purposes.
            </p>
          </section>

          <section class="mb-8">
            <h2 class="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              10. Children's Privacy
            </h2>
            <p class="text-gray-600 dark:text-gray-300 mb-4">
              Our services are not intended for users under the age of 13. We do
              not knowingly collect personal information from children. If you
              believe we have collected information from a child, please contact
              us immediately.
            </p>
          </section>

          <section class="mb-8">
            <h2 class="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              11. Changes to This Policy
            </h2>
            <p class="text-gray-600 dark:text-gray-300 mb-4">
              We may update this Privacy Policy from time to time. We will notify
              you of any material changes by posting the new policy on this page
              and updating the "Last updated" date. Your continued use of our
              services after any changes constitutes acceptance of the updated
              policy.
            </p>
          </section>

          <section class="mb-8">
            <h2 class="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              12. Contact Us
            </h2>
            <p class="text-gray-600 dark:text-gray-300 mb-4">
              If you have any questions about this Privacy Policy or our data
              practices, please contact us at:
            </p>
            <p class="text-gray-600 dark:text-gray-300">
              Email: privacy@streamowl.app
            </p>
          </section>
        </div>
      </div>
    </>
  );
}
