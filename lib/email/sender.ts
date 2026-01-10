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
export function sendPasswordResetEmail(
  to: string,
  _resetToken: string,
  resetUrl: string,
): void {
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
 * Send an email verification email
 *
 * @param to Recipient email address
 * @param verificationUrl Full URL to email verification endpoint
 */
export function sendVerificationEmail(
  to: string,
  verificationUrl: string,
): void {
  // In production, this would send an actual email via an email service provider
  // For now, we'll log to console for development/testing
  console.log("=".repeat(80));
  console.log("EMAIL VERIFICATION");
  console.log("=".repeat(80));
  console.log(`To: ${to}`);
  console.log(`Subject: Verify your email address`);
  console.log("");
  console.log(`Welcome to Stream Owl!`);
  console.log("");
  console.log(`Please click the link below to verify your email address:`);
  console.log(`${verificationUrl}`);
  console.log("");
  console.log(`This link will expire in 48 hours.`);
  console.log(`If you didn't create an account, please ignore this email.`);
  console.log("=".repeat(80));

  // TODO: Integrate with email service provider (SendGrid, AWS SES, etc.)
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

/**
 * Generate email verification URL from token
 *
 * @param baseUrl Base URL of the application (e.g., "https://example.com")
 * @param token Email verification token
 * @returns Full email verification URL
 */
export function generateVerificationUrl(
  baseUrl: string,
  token: string,
): string {
  return `${baseUrl}/api/auth/verify-email?token=${encodeURIComponent(token)}`;
}
