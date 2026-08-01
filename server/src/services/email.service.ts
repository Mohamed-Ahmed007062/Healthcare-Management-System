import nodemailer from 'nodemailer';
import { env, isDev } from '../config/env';
import { logger } from '../config/logger';

export class EmailService {
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    // Instantiate transporter if credentials are provided
    if (env.MAIL_HOST && env.MAIL_PORT && env.MAIL_USER && env.MAIL_PASS) {
      this.transporter = nodemailer.createTransport({
        host: env.MAIL_HOST,
        port: env.MAIL_PORT,
        auth: {
          user: env.MAIL_USER,
          pass: env.MAIL_PASS,
        },
      });
      logger.info('Nodemailer SMTP transporter configured successfully');
    } else {
      logger.warn(
        'Email configuration missing. falling back to console logging for verification and password reset links.',
      );
    }
  }

  /**
   * Send an email. If transporter is not configured, logs details to console.
   */
  private async sendMail(options: { to: string; subject: string; text: string; html: string }): Promise<void> {
    const mailOptions = {
      from: env.MAIL_FROM,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    };

    if (this.transporter) {
      try {
        await this.transporter.sendMail(mailOptions);
        logger.info(`Email sent to [${options.to}] with subject [${options.subject}]`);
      } catch (err) {
        logger.error({ err, to: options.to }, 'Failed to send email via SMTP transporter');
        // fallback to console in development even if sending fails
        if (isDev) {
          this.logToConsole(mailOptions);
        } else {
          throw err;
        }
      }
    } else {
      this.logToConsole(mailOptions);
    }
  }

  private logToConsole(mailOptions: Record<string, unknown>): void {
    /* eslint-disable no-console */
    console.log('\n==================================================');
    console.log('✉️  [EMAIL FALLBACK LOGGER]');
    console.log(`To:      ${mailOptions.to}`);
    console.log(`From:    ${mailOptions.from}`);
    console.log(`Subject: ${mailOptions.subject}`);
    console.log('--------------------------------------------------');
    console.log('Text Content:');
    console.log(mailOptions.text);
    console.log('==================================================\n');
    /* eslint-enable no-console */
  }

  /**
   * Send Email Verification Link.
   */
  async sendVerificationEmail(email: string, name: string, token: string): Promise<void> {
    const verifyUrl = `${env.APP_URL}/verify-email?token=${token}`;
    const subject = 'Verify your email address';
    const text = `Hi ${name},\n\nPlease verify your email by clicking the link below:\n${verifyUrl}\n\nThis link will expire in ${env.EMAIL_VERIFY_TTL_HOURS} hours.`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #2b6cb0;">Welcome to our Healthcare Portal</h2>
        <p>Hi <strong>${name}</strong>,</p>
        <p>Thank you for registering. Please click the button below to verify your email address and activate your account:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verifyUrl}" style="background-color: #3182ce; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Verify Email Address</a>
        </div>
        <p>If the button above does not work, copy and paste the following URL into your browser:</p>
        <p style="word-break: break-all; color: #4a5568;">${verifyUrl}</p>
        <p>This verification link will expire in ${env.EMAIL_VERIFY_TTL_HOURS} hours.</p>
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
        <p style="font-size: 12px; color: #718096;">If you did not request this account, please ignore this email.</p>
      </div>
    `;

    await this.sendMail({ to: email, subject, text, html });
  }

  /**
   * Send Password Reset Link.
   */
  async sendPasswordResetEmail(email: string, name: string, token: string): Promise<void> {
    const resetUrl = `${env.APP_URL}/reset-password?token=${token}`;
    const subject = 'Reset your password';
    const text = `Hi ${name},\n\nYou requested to reset your password. Click the link below to set a new password:\n${resetUrl}\n\nThis link will expire in ${env.RESET_PASSWORD_TTL_HOURS} hour.`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #e53e3e;">Password Reset Request</h2>
        <p>Hi <strong>${name}</strong>,</p>
        <p>We received a request to reset your password. Click the button below to choose a new password:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="background-color: #e53e3e; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Reset Password</a>
        </div>
        <p>If the button above does not work, copy and paste the following URL into your browser:</p>
        <p style="word-break: break-all; color: #4a5568;">${resetUrl}</p>
        <p>This password reset link will expire in ${env.RESET_PASSWORD_TTL_HOURS} hour.</p>
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
        <p style="font-size: 12px; color: #718096;">If you did not request a password reset, please ignore this email and your password will remain unchanged.</p>
      </div>
    `;

    await this.sendMail({ to: email, subject, text, html });
  }
}

export const emailService = new EmailService();
export default emailService;
