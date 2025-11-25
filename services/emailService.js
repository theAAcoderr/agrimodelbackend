// Email service for sending emails
// This is a placeholder - integrate with actual email service (SendGrid, AWS SES, etc.)

class EmailService {
  constructor() {
    this.emailProvider = process.env.EMAIL_PROVIDER || 'console';
  }

  async sendEmail({ to, subject, html, text }) {
    try {
      if (this.emailProvider === 'console') {
        // Development mode - log to console
        console.log('\n📧 ===== EMAIL SENT =====');
        console.log(`To: ${to}`);
        console.log(`Subject: ${subject}`);
        console.log(`Content: ${text || html}`);
        console.log('========================\n');
        return { success: true, messageId: 'console-' + Date.now() };
      }

      // TODO: Integrate with actual email service
      // Example for SendGrid:
      // const sgMail = require('@sendgrid/mail');
      // sgMail.setApiKey(process.env.SENDGRID_API_KEY);
      // await sgMail.send({ to, from: process.env.FROM_EMAIL, subject, html, text });

      return { success: true };
    } catch (error) {
      console.error('Email sending failed:', error);
      return { success: false, error: error.message };
    }
  }

  async sendPasswordResetEmail(email, resetToken) {
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;

    const subject = 'Password Reset Request - AgriModel';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #4CAF50;">Password Reset Request</h2>
        <p>You have requested to reset your password for AgriModel.</p>
        <p>Click the button below to reset your password:</p>
        <a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 4px; margin: 16px 0;">Reset Password</a>
        <p>Or copy and paste this link in your browser:</p>
        <p style="color: #666; word-break: break-all;">${resetUrl}</p>
        <p>This link will expire in 1 hour.</p>
        <p>If you didn't request this, please ignore this email.</p>
        <hr style="margin: 24px 0; border: none; border-top: 1px solid #ddd;">
        <p style="color: #999; font-size: 12px;">AgriModel - Agricultural Data Collection Platform</p>
      </div>
    `;

    const text = `Password Reset Request\n\nYou have requested to reset your password.\n\nReset your password here: ${resetUrl}\n\nThis link will expire in 1 hour.\n\nIf you didn't request this, please ignore this email.`;

    return await this.sendEmail({ to: email, subject, html, text });
  }

  async sendWelcomeEmail(email, name) {
    const subject = 'Welcome to AgriModel!';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #4CAF50;">Welcome to AgriModel!</h2>
        <p>Hi ${name},</p>
        <p>Thank you for registering with AgriModel - Agricultural Data Collection Platform.</p>
        <p>Your account is currently pending approval. You will receive another email once your account is approved.</p>
        <p>If you have any questions, feel free to contact our support team.</p>
        <hr style="margin: 24px 0; border: none; border-top: 1px solid #ddd;">
        <p style="color: #999; font-size: 12px;">AgriModel - Agricultural Data Collection Platform</p>
      </div>
    `;

    const text = `Welcome to AgriModel!\n\nHi ${name},\n\nThank you for registering. Your account is pending approval.\n\nYou will receive another email once approved.`;

    return await this.sendEmail({ to: email, subject, html, text });
  }

  async sendAccountApprovedEmail(email, name) {
    const loginUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/login`;

    const subject = 'Account Approved - AgriModel';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #4CAF50;">Account Approved!</h2>
        <p>Hi ${name},</p>
        <p>Great news! Your AgriModel account has been approved.</p>
        <p>You can now log in and start using the platform:</p>
        <a href="${loginUrl}" style="display: inline-block; padding: 12px 24px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 4px; margin: 16px 0;">Login Now</a>
        <hr style="margin: 24px 0; border: none; border-top: 1px solid #ddd;">
        <p style="color: #999; font-size: 12px;">AgriModel - Agricultural Data Collection Platform</p>
      </div>
    `;

    const text = `Account Approved!\n\nHi ${name},\n\nYour AgriModel account has been approved. You can now log in: ${loginUrl}`;

    return await this.sendEmail({ to: email, subject, html, text });
  }
}

module.exports = new EmailService();