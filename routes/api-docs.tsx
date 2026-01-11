import { Head } from "$fresh/runtime.ts";
import { Handlers, PageProps } from "$fresh/server.ts";

/**
 * API Documentation page using Swagger UI
 *
 * Renders an interactive API documentation interface from the OpenAPI spec.
 * The OpenAPI spec is served from /openapi.yaml
 */

export const handler: Handlers = {
  GET(_req, ctx) {
    // Serve the page
    return ctx.render();
  },
};

export default function ApiDocs(_props: PageProps) {
  return (
    <>
      <Head>
        <title>API Documentation | Stream Owl</title>
        <meta
          name="description"
          content="Stream Owl API documentation - endpoints for content discovery, library management, and recommendations."
        />
        {/* Swagger UI CSS */}
        <link
          rel="stylesheet"
          href="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui.css"
        />
      </Head>

      <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Header */}
        <header class="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
          <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="flex items-center justify-between h-16">
              <div class="flex items-center gap-4">
                <a
                  href="/"
                  class="flex items-center gap-2 text-gray-900 dark:text-white hover:text-purple-600 dark:hover:text-purple-400"
                >
                  <img
                    src="/logo.svg"
                    alt="Stream Owl"
                    class="h-8 w-8"
                    width="32"
                    height="32"
                  />
                  <span class="font-bold text-lg">Stream Owl</span>
                </a>
                <span class="text-gray-400 dark:text-gray-500">|</span>
                <h1 class="text-lg font-semibold text-gray-700 dark:text-gray-300">
                  API Documentation
                </h1>
              </div>
              <nav class="flex items-center gap-4">
                <a
                  href="/"
                  class="text-gray-600 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400"
                >
                  Home
                </a>
                <a
                  href="/openapi.yaml"
                  class="text-gray-600 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400"
                  download
                >
                  Download OpenAPI Spec
                </a>
              </nav>
            </div>
          </div>
        </header>

        {/* Swagger UI Container */}
        <div id="swagger-ui" class="max-w-7xl mx-auto"></div>

        {/* Swagger UI Script */}
        <script src="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui-bundle.js">
        </script>
        <script
          dangerouslySetInnerHTML={{
            __html: `
            window.onload = function() {
              window.ui = SwaggerUIBundle({
                url: "/openapi.yaml",
                dom_id: '#swagger-ui',
                deepLinking: true,
                presets: [
                  SwaggerUIBundle.presets.apis,
                  SwaggerUIBundle.SwaggerUIStandalonePreset
                ],
                layout: "BaseLayout",
                defaultModelsExpandDepth: 1,
                defaultModelExpandDepth: 1,
                docExpansion: "list",
                filter: true,
                showExtensions: true,
                showCommonExtensions: true,
                syntaxHighlight: {
                  activated: true,
                  theme: "monokai"
                }
              });
            };
          `,
          }}
        />

        {/* Custom styles for dark mode compatibility */}
        <style
          dangerouslySetInnerHTML={{
            __html: `
            /* Swagger UI customisations */
            .swagger-ui .topbar { display: none; }
            .swagger-ui { padding: 20px; }
            .swagger-ui .info { margin-bottom: 30px; }
            .swagger-ui .info .title { font-size: 2rem; }
            
            /* Dark mode adjustments */
            @media (prefers-color-scheme: dark) {
              .swagger-ui {
                background: #1f2937;
                color: #f3f4f6;
              }
              .swagger-ui .info .title,
              .swagger-ui .info .base-url,
              .swagger-ui .scheme-container {
                color: #f3f4f6;
              }
              .swagger-ui .opblock .opblock-summary-description,
              .swagger-ui .opblock-description-wrapper p,
              .swagger-ui .opblock-external-docs-wrapper p,
              .swagger-ui .opblock-title_normal p,
              .swagger-ui table thead tr td,
              .swagger-ui table thead tr th {
                color: #d1d5db;
              }
              .swagger-ui .opblock-tag {
                color: #f3f4f6;
                border-color: #374151;
              }
              .swagger-ui section.models {
                border-color: #374151;
              }
              .swagger-ui section.models .model-container {
                background: #374151;
              }
              .swagger-ui .model-title {
                color: #f3f4f6;
              }
              .swagger-ui .model {
                color: #d1d5db;
              }
              .swagger-ui .response-col_status {
                color: #f3f4f6;
              }
              .swagger-ui .response-col_description {
                color: #d1d5db;
              }
              .swagger-ui .tab li {
                color: #d1d5db;
              }
              .swagger-ui .opblock .opblock-section-header {
                background: #374151;
              }
              .swagger-ui .opblock .opblock-section-header h4 {
                color: #f3f4f6;
              }
              .swagger-ui .parameter__name,
              .swagger-ui .parameter__type,
              .swagger-ui .prop-format {
                color: #d1d5db;
              }
              .swagger-ui .btn {
                color: #f3f4f6;
              }
            }
          `,
          }}
        />
      </div>
    </>
  );
}
