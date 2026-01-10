/**
 * XSS (Cross-Site Scripting) Prevention Utilities
 *
 * Provides functions to sanitise user input and prevent XSS attacks.
 * All user-generated content should be escaped before being displayed in HTML.
 *
 * Note: Preact/React automatically escapes content in JSX, but these utilities
 * are provided for cases where you need explicit control or are working with
 * raw HTML strings.
 */

/**
 * Escapes HTML special characters to prevent XSS attacks
 *
 * Converts characters that have special meaning in HTML to their HTML entity equivalents:
 * - < becomes &lt;
 * - > becomes &gt;
 * - & becomes &amp;
 * - " becomes &quot;
 * - ' becomes &#x27;
 *
 * @param input - The string to escape
 * @returns The escaped string safe for HTML output
 *
 * @example
 * ```ts
 * const userInput = "<script>alert('XSS')</script>";
 * const safe = escapeHtml(userInput);
 * // Returns: "&lt;script&gt;alert(&#x27;XSS&#x27;)&lt;/script&gt;"
 * ```
 */
export function escapeHtml(input: string | null | undefined): string {
  if (input == null) {
    return "";
  }

  const htmlEscapes: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#x27;",
  };

  return input.replace(/[&<>"']/g, (match) => htmlEscapes[match]);
}

/**
 * Escapes HTML attribute values to prevent XSS in attributes
 *
 * Use this when setting HTML attributes from user input (e.g., title, alt, data-*)
 *
 * @param input - The string to escape
 * @returns The escaped string safe for HTML attributes
 *
 * @example
 * ```ts
 * const userTitle = 'Title with "quotes"';
 * const safe = escapeHtmlAttribute(userTitle);
 * // Returns: "Title with &quot;quotes&quot;"
 * ```
 */
export function escapeHtmlAttribute(input: string | null | undefined): string {
  return escapeHtml(input);
}

/**
 * Escapes JavaScript strings to prevent XSS in inline scripts
 *
 * Escapes characters that could break out of JavaScript string literals
 *
 * @param input - The string to escape
 * @returns The escaped string safe for JavaScript string literals
 *
 * @example
 * ```ts
 * const userInput = 'Hello "world"';
 * const safe = escapeJsString(userInput);
 * // Returns: "Hello \\"world\\""
 * ```
 */
export function escapeJsString(input: string | null | undefined): string {
  if (input == null) {
    return "";
  }

  return input
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/'/g, "\\'")
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r")
    .replace(/\t/g, "\\t");
}
