import { Head } from "$fresh/runtime.ts";

/**
 * API Documentation page
 *
 * Renders the OpenAPI specification using Swagger UI for interactive exploration.
 * The OpenAPI spec is served from /openapi.yaml
 */
export default function ApiDocs() {
  return (
    <>
      <Head>
        <title>API Documentation - Stream Owl</title>
        <meta
          name="description"
          content="Stream Owl API documentation - endpoints for content search, library management, recommendations, and more."
        />
        <link
          rel="stylesheet"
          href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css"
        />
      </Head>

      <div class="min-h-screen bg-gray-900">
        {/* Header */}
        <header class="bg-gray-800 border-b border-gray-700 py-4">
          <div class="container mx-auto px-4">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-4">
                <a
                  href="/"
                  class="flex items-center gap-2 text-xl font-bold text-white hover:text-blue-400 transition-colors"
                >
                  <span class="text-2xl">🦉</span>
                  <span>Stream Owl</span>
                </a>
                <span class="text-gray-500">|</span>
                <h1 class="text-lg font-semibold text-gray-300">
                  API Documentation
                </h1>
              </div>
              <nav class="flex items-center gap-4">
                <a
                  href="/browse"
                  class="text-gray-400 hover:text-white transition-colors"
                >
                  Browse
                </a>
                <a
                  href="/search"
                  class="text-gray-400 hover:text-white transition-colors"
                >
                  Search
                </a>
                <a
                  href="/login"
                  class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Sign In
                </a>
              </nav>
            </div>
          </div>
        </header>

        {/* Swagger UI Container */}
        <div id="swagger-ui" class="container mx-auto"></div>

        {/* Load Swagger UI */}
        <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
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
                  defaultModelsExpandDepth: 2,
                  defaultModelExpandDepth: 2,
                  docExpansion: "list",
                  filter: true,
                  tryItOutEnabled: true,
                  syntaxHighlight: {
                    activated: true,
                    theme: "monokai"
                  },
                  // Custom styling for dark mode
                  onComplete: function() {
                    // Add dark mode class
                    document.querySelector('.swagger-ui').classList.add('dark-mode');
                  }
                });
              };
            `,
          }}
        />

        {/* Custom styles for dark mode Swagger UI */}
        <style
          dangerouslySetInnerHTML={{
            __html: `
              .swagger-ui {
                background: #111827;
              }
              .swagger-ui .topbar {
                display: none;
              }
              .swagger-ui .info .title {
                color: #f9fafb;
              }
              .swagger-ui .info .description,
              .swagger-ui .info .description p {
                color: #d1d5db;
              }
              .swagger-ui .scheme-container {
                background: #1f2937;
                box-shadow: none;
              }
              .swagger-ui .opblock-tag {
                color: #f9fafb;
                border-bottom: 1px solid #374151;
              }
              .swagger-ui .opblock-tag:hover {
                background: #1f2937;
              }
              .swagger-ui .opblock {
                background: #1f2937;
                border-color: #374151;
              }
              .swagger-ui .opblock .opblock-summary {
                border-color: #374151;
              }
              .swagger-ui .opblock .opblock-summary-description {
                color: #d1d5db;
              }
              .swagger-ui .opblock-body {
                background: #111827;
              }
              .swagger-ui .opblock-description-wrapper p,
              .swagger-ui .opblock-external-docs-wrapper p {
                color: #d1d5db;
              }
              .swagger-ui table thead tr th {
                color: #f9fafb;
                border-color: #374151;
              }
              .swagger-ui table tbody tr td {
                color: #d1d5db;
                border-color: #374151;
              }
              .swagger-ui .parameter__name,
              .swagger-ui .parameter__type {
                color: #d1d5db;
              }
              .swagger-ui .model-title {
                color: #f9fafb;
              }
              .swagger-ui .model {
                color: #d1d5db;
              }
              .swagger-ui .model-toggle::after {
                background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E") center no-repeat;
              }
              .swagger-ui .model-box {
                background: #1f2937;
              }
              .swagger-ui section.models {
                border-color: #374151;
              }
              .swagger-ui section.models h4 {
                color: #f9fafb;
                border-color: #374151;
              }
              .swagger-ui .responses-inner {
                background: #1f2937;
              }
              .swagger-ui .response-col_status {
                color: #d1d5db;
              }
              .swagger-ui .response-col_description {
                color: #d1d5db;
              }
              .swagger-ui .tab li {
                color: #d1d5db;
              }
              .swagger-ui .tab li.active {
                color: #f9fafb;
              }
              .swagger-ui input[type=text],
              .swagger-ui textarea {
                background: #374151;
                color: #f9fafb;
                border-color: #4b5563;
              }
              .swagger-ui select {
                background: #374151;
                color: #f9fafb;
                border-color: #4b5563;
              }
              .swagger-ui .btn {
                color: #f9fafb;
              }
              .swagger-ui .opblock.opblock-get .opblock-summary-method {
                background: #3b82f6;
              }
              .swagger-ui .opblock.opblock-post .opblock-summary-method {
                background: #10b981;
              }
              .swagger-ui .opblock.opblock-delete .opblock-summary-method {
                background: #ef4444;
              }
              .swagger-ui .opblock.opblock-patch .opblock-summary-method {
                background: #f59e0b;
              }
              .swagger-ui .opblock.opblock-put .opblock-summary-method {
                background: #8b5cf6;
              }
              .swagger-ui .info a {
                color: #60a5fa;
              }
              .swagger-ui .markdown code,
              .swagger-ui .renderedMarkdown code {
                background: #374151;
                color: #fbbf24;
              }
              .swagger-ui .copy-to-clipboard {
                background: #374151;
              }
              .swagger-ui .servers-title,
              .swagger-ui .servers label {
                color: #d1d5db;
              }
              .swagger-ui .servers > label select {
                background: #374151;
                color: #f9fafb;
              }
              .swagger-ui .filter input[type=text] {
                background: #374151;
                color: #f9fafb;
                border-color: #4b5563;
              }
              .swagger-ui .filter .operation-filter-input {
                background: #374151;
              }
            `,
          }}
        />
      </div>
    </>
  );
}
