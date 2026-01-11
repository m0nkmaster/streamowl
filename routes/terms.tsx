import { Head } from "$fresh/runtime.ts";

/**
 * Terms of Service page
 * Outlines user rights and responsibilities when using Stream Owl
 */
export default function TermsOfService() {
  return (
    <>
      <Head>
        <title>Terms of Service | Stream Owl</title>
        <meta
          name="description"
          content="Stream Owl's terms of service. Read the terms and conditions governing your use of our platform."
        />
      </Head>
      <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-8">
          Terms of Service
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
              1. Acceptance of Terms
            </h2>
            <p class="text-gray-600 dark:text-gray-300 mb-4">
              By accessing or using Stream Owl ("the Service"), you agree to be
              bound by these Terms of Service ("Terms"). If you do not agree to
              these Terms, you may not use the Service. We reserve the right to
              modify these Terms at any time, and your continued use of the
              Service constitutes acceptance of any changes.
            </p>
          </section>

          <section class="mb-8">
            <h2 class="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              2. Description of Service
            </h2>
            <p class="text-gray-600 dark:text-gray-300 mb-4">
              Stream Owl is a movie and TV show tracking platform that allows
              users to:
            </p>
            <ul class="list-disc list-inside text-gray-600 dark:text-gray-300 mb-4 space-y-2">
              <li>Search and discover movies and TV shows</li>
              <li>Track watched content, watchlists, and favourites</li>
              <li>Receive AI-powered personalised recommendations</li>
              <li>View streaming availability across various platforms</li>
              <li>Create and share custom lists</li>
              <li>Rate and review content</li>
            </ul>
          </section>

          <section class="mb-8">
            <h2 class="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              3. Account Registration
            </h2>
            <p class="text-gray-600 dark:text-gray-300 mb-4">
              To access certain features, you must create an account. You agree
              to:
            </p>
            <ul class="list-disc list-inside text-gray-600 dark:text-gray-300 mb-4 space-y-2">
              <li>Provide accurate, current, and complete information</li>
              <li>Maintain the security of your password and account</li>
              <li>
                Accept responsibility for all activities under your account
              </li>
              <li>Notify us immediately of any unauthorised access</li>
              <li>Be at least 13 years of age</li>
            </ul>
            <p class="text-gray-600 dark:text-gray-300 mb-4">
              We reserve the right to suspend or terminate accounts that violate
              these Terms or for any other reason at our discretion.
            </p>
          </section>

          <section class="mb-8">
            <h2 class="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              4. User Conduct
            </h2>
            <p class="text-gray-600 dark:text-gray-300 mb-4">
              You agree not to:
            </p>
            <ul class="list-disc list-inside text-gray-600 dark:text-gray-300 mb-4 space-y-2">
              <li>Use the Service for any unlawful purpose</li>
              <li>
                Harass, abuse, or harm other users or post offensive content
              </li>
              <li>
                Attempt to gain unauthorised access to the Service or its
                systems
              </li>
              <li>
                Interfere with or disrupt the Service or servers/networks
              </li>
              <li>Scrape, data mine, or extract data from the Service</li>
              <li>Create multiple accounts to circumvent restrictions</li>
              <li>
                Use automated tools (bots, scrapers) without express permission
              </li>
              <li>Impersonate others or misrepresent your affiliation</li>
            </ul>
          </section>

          <section class="mb-8">
            <h2 class="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              5. User Content
            </h2>
            <p class="text-gray-600 dark:text-gray-300 mb-4">
              You retain ownership of content you submit (ratings, notes,
              lists). By submitting content, you grant us a non-exclusive,
              worldwide, royalty-free licence to use, display, and distribute
              such content in connection with the Service.
            </p>
            <p class="text-gray-600 dark:text-gray-300 mb-4">
              You represent that you have the right to submit any content and
              that your content does not violate any third party's rights. We
              reserve the right to remove content that violates these Terms or
              is otherwise objectionable.
            </p>
          </section>

          <section class="mb-8">
            <h2 class="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              6. Subscription and Premium Services
            </h2>
            <p class="text-gray-600 dark:text-gray-300 mb-4">
              Stream Owl offers both free and premium subscription tiers.
              Premium subscriptions are governed by the following terms:
            </p>
            <ul class="list-disc list-inside text-gray-600 dark:text-gray-300 mb-4 space-y-2">
              <li>
                Subscriptions are billed in advance on a monthly or yearly basis
              </li>
              <li>
                Prices are subject to change with notice to existing subscribers
              </li>
              <li>
                You may cancel your subscription at any time through your
                account settings
              </li>
              <li>
                Refunds are provided in accordance with applicable laws and our
                refund policy
              </li>
              <li>
                We reserve the right to modify or discontinue premium features
              </li>
            </ul>
          </section>

          <section class="mb-8">
            <h2 class="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              7. Third-Party Services
            </h2>
            <p class="text-gray-600 dark:text-gray-300 mb-4">
              The Service integrates with third-party services including:
            </p>
            <ul class="list-disc list-inside text-gray-600 dark:text-gray-300 mb-4 space-y-2">
              <li>
                <strong>TMDB:</strong>{" "}
                Movie and TV show data. This product uses the TMDB API but is
                not endorsed or certified by TMDB.
              </li>
              <li>
                <strong>OpenAI:</strong>{" "}
                AI-powered recommendations and chat features
              </li>
              <li>
                <strong>Stripe:</strong> Payment processing for subscriptions
              </li>
              <li>
                <strong>Google:</strong> OAuth authentication
              </li>
            </ul>
            <p class="text-gray-600 dark:text-gray-300 mb-4">
              Your use of third-party services is subject to their respective
              terms and privacy policies. We are not responsible for the
              availability, accuracy, or practices of third-party services.
            </p>
          </section>

          <section class="mb-8">
            <h2 class="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              8. Intellectual Property
            </h2>
            <p class="text-gray-600 dark:text-gray-300 mb-4">
              The Service and its original content (excluding user content),
              features, and functionality are owned by Stream Owl and are
              protected by copyright, trademark, and other intellectual property
              laws. Our trademarks may not be used without prior written
              consent.
            </p>
            <p class="text-gray-600 dark:text-gray-300 mb-4">
              Movie and TV show metadata, images, and related content are
              provided by TMDB and remain the property of their respective
              owners.
            </p>
          </section>

          <section class="mb-8">
            <h2 class="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              9. Disclaimers
            </h2>
            <p class="text-gray-600 dark:text-gray-300 mb-4">
              The Service is provided "as is" and "as available" without
              warranties of any kind, either express or implied. We do not
              warrant that:
            </p>
            <ul class="list-disc list-inside text-gray-600 dark:text-gray-300 mb-4 space-y-2">
              <li>The Service will be uninterrupted, secure, or error-free</li>
              <li>
                Streaming availability information is accurate or up-to-date
              </li>
              <li>AI recommendations will meet your preferences</li>
              <li>Content metadata is complete or accurate</li>
            </ul>
          </section>

          <section class="mb-8">
            <h2 class="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              10. Limitation of Liability
            </h2>
            <p class="text-gray-600 dark:text-gray-300 mb-4">
              To the maximum extent permitted by law, Stream Owl and its
              directors, employees, partners, and agents shall not be liable for
              any indirect, incidental, special, consequential, or punitive
              damages, or any loss of profits or revenues, whether incurred
              directly or indirectly, or any loss of data, use, goodwill, or
              other intangible losses resulting from:
            </p>
            <ul class="list-disc list-inside text-gray-600 dark:text-gray-300 mb-4 space-y-2">
              <li>Your use or inability to use the Service</li>
              <li>Any unauthorised access to your account</li>
              <li>Any third-party conduct or content on the Service</li>
              <li>Any content obtained from the Service</li>
            </ul>
          </section>

          <section class="mb-8">
            <h2 class="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              11. Indemnification
            </h2>
            <p class="text-gray-600 dark:text-gray-300 mb-4">
              You agree to indemnify and hold harmless Stream Owl and its
              officers, directors, employees, and agents from any claims,
              damages, losses, liabilities, and expenses (including legal fees)
              arising from your use of the Service, your violation of these
              Terms, or your violation of any rights of another party.
            </p>
          </section>

          <section class="mb-8">
            <h2 class="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              12. Termination
            </h2>
            <p class="text-gray-600 dark:text-gray-300 mb-4">
              We may terminate or suspend your account and access to the Service
              immediately, without prior notice or liability, for any reason,
              including if you breach these Terms. Upon termination, your right
              to use the Service will cease immediately. You may delete your
              account at any time through your account settings.
            </p>
          </section>

          <section class="mb-8">
            <h2 class="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              13. Governing Law
            </h2>
            <p class="text-gray-600 dark:text-gray-300 mb-4">
              These Terms shall be governed by and construed in accordance with
              the laws of England and Wales, without regard to its conflict of
              law provisions. Any disputes arising from these Terms shall be
              subject to the exclusive jurisdiction of the courts of England and
              Wales.
            </p>
          </section>

          <section class="mb-8">
            <h2 class="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              14. Severability
            </h2>
            <p class="text-gray-600 dark:text-gray-300 mb-4">
              If any provision of these Terms is found to be unenforceable or
              invalid, that provision shall be limited or eliminated to the
              minimum extent necessary, and the remaining provisions shall
              remain in full force and effect.
            </p>
          </section>

          <section class="mb-8">
            <h2 class="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              15. Changes to Terms
            </h2>
            <p class="text-gray-600 dark:text-gray-300 mb-4">
              We reserve the right to modify these Terms at any time. We will
              notify users of material changes by posting the updated Terms on
              this page and updating the "Last updated" date. Your continued use
              of the Service after any changes constitutes acceptance of the new
              Terms.
            </p>
          </section>

          <section class="mb-8">
            <h2 class="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              16. Contact Us
            </h2>
            <p class="text-gray-600 dark:text-gray-300 mb-4">
              If you have any questions about these Terms, please contact us at:
            </p>
            <p class="text-gray-600 dark:text-gray-300">
              Email: legal@streamowl.app
            </p>
          </section>
        </div>
      </div>
    </>
  );
}
