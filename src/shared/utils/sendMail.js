import nodemailer from 'nodemailer';
import { AppError } from '#shared/errors/AppError.js';
import {
  buildPasswordResetEmailHtml,
  buildPasswordResetEmailText,
} from '#shared/utils/emailTemplates/passwordResetEmail.js';
import { getPrimaryClientUrl } from '#shared/utils/corsOrigins.js';

const RESET_EXPIRES_MINUTES = 15;

function getClientUrl() {
  return getPrimaryClientUrl();
}

function getBrandName() {
  return process.env.EMAIL_BRAND_NAME || 'Bất Động Sản DP';
}

function isEmailConfigured() {
  return Boolean(
    String(process.env.EMAIL_NAME || '').trim() &&
      String(process.env.EMAIL_PASSWORD || '').trim(),
  );
}

function normalizeAppPassword(password) {
  return String(password || '').replace(/\s+/g, '').trim();
}

function createTransporter() {
  if (!isEmailConfigured()) {
    throw new AppError(
      'Server chưa cấu hình EMAIL_NAME và EMAIL_PASSWORD. Không thể gửi email đặt lại mật khẩu.',
      503,
    );
  }

  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: Number(process.env.EMAIL_PORT || 587),
    secure: false,
    auth: {
      user: process.env.EMAIL_NAME,
      pass: normalizeAppPassword(process.env.EMAIL_PASSWORD),
    },
  });
}

/**
 * Gửi email đặt lại mật khẩu (HTML chuyên nghiệp).
 * Link trỏ về FE: /reset-password?token=...
 */
async function sendPasswordResetEmail({ email, resetToken, recipientName }) {
  const resetUrl = `${getClientUrl()}/reset-password?token=${resetToken}`;
  const fromAddress = process.env.EMAIL_NAME;
  const brandName = getBrandName();

  const templatePayload = {
    resetUrl,
    recipientEmail: email,
    recipientName,
    expiresMinutes: RESET_EXPIRES_MINUTES,
  };

  const transporter = createTransporter();
  try {
    const info = await transporter.sendMail({
      from: `"${brandName}" <${fromAddress}>`,
      to: email,
      subject: `[${brandName}] Đặt lại mật khẩu tài khoản`,
      text: buildPasswordResetEmailText(templatePayload),
      html: buildPasswordResetEmailHtml(templatePayload),
    });
    return info;
  } catch (err) {
    throw new AppError(
      'Không thể gửi email đặt lại mật khẩu. Kiểm tra cấu hình SMTP hoặc thử lại sau.',
      503,
      { cause: err?.message },
    );
  }
}

/** @deprecated dùng sendPasswordResetEmail */
const sendMail = sendPasswordResetEmail;

export { sendPasswordResetEmail, getClientUrl, isEmailConfigured };
export default sendMail;
