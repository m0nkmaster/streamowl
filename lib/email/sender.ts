/**
 * Email sending utilities
 *
 * Provides functions for sending emails. Currently logs to console,
 * but can be extended to use email service providers (SendGrid, AWS SES, etc.)
 */

/**
 * Send a password reset email
 *
 * @param to Recipient email address
 * @param resetToken Password reset token
 * @param resetUrl Full URL to password reset page
 */
export async function sendPasswordResetEmail(
  to: string,
  resetToken: string,
  resetUrl: string,
): Promise<void> {
  // In production, this would send an actual email via an email service provider
  // For now, we'll log to console for development/testing
  console.log("=".repeat(80));
  console.log("PASSWORD RESET EMAIL");
  console.log("=".repeat(80));
  console.log(`To: ${to}`);
  console.log(`Subject: Reset your password`);
  console.log("");
  console.log(`Click the link below to reset your password:`);
  console.log(`${resetUrl}`);
  console.log("");
  console.log(`This link will expire in 24 hours.`);
  console.log(`If you didn't request this, please ignore this email.`);
  console.log("=".repeat(80));

  // TODO: Integrate with email service provider (SendGrid, AWS SES, etc.)
  // Example:
  // await sendEmail({
  //   to,
  //   subject: "Reset your password",
  //   html: generatePasswordResetEmailHtml(resetUrl),
  //   text: generatePasswordResetEmailText(resetUrl),
  // });
}

/**
 * Generate password reset URL from token
 *
 * @param baseUrl Base URL of the application (e.g., "https://example.com")
 * @param token Password reset token
 * @returns Full password reset URL
 */
export function generatePasswordResetUrl(
  baseUrl: string,
  token: string,
): string {
  return `${baseUrl}/reset-password?token=${encodeURIComponent(token)}`;
}
