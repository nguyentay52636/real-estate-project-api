/** Tailwind green-800 palette — chủ đạo #166534 */
const BRAND = {
  name: process.env.EMAIL_BRAND_NAME || 'PhuongTayLand',
  tagline: process.env.EMAIL_BRAND_TAGLINE || 'Nền tảng bất động sản uy tín',
  primary: '#166534',
  primaryHover: '#14532d',
  primarySoft: '#f0fdf4',
  primaryBorder: '#bbf7d0',
  accent: '#15803d',
  text: '#0f172a',
  body: '#334155',
  muted: '#64748b',
  border: '#e2e8f0',
  bg: '#f8fafc',
  surface: '#ffffff',
};

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * HTML email đặt lại mật khẩu — layout table + inline CSS (Gmail/Outlook).
 */
export function buildPasswordResetEmailHtml({
  resetUrl,
  recipientEmail,
  recipientName,
  expiresMinutes = 15,
}) {
  const safeUrl = escapeHtml(resetUrl);
  const safeEmail = escapeHtml(recipientEmail);
  const safeName = recipientName ? escapeHtml(recipientName) : null;

  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Đặt lại mật khẩu</title>
</head>
<body style="margin:0;padding:0;background-color:${BRAND.bg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:${BRAND.text};">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:${BRAND.bg};">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table role="presentation" width="560" cellspacing="0" cellpadding="0" border="0" style="max-width:560px;width:100%;">

          <!-- Top bar -->
          <tr>
            <td style="padding:0 4px 20px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="vertical-align:middle;">
                    <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background-color:${BRAND.primary};margin-right:10px;vertical-align:middle;"></span>
                    <span style="font-size:15px;font-weight:600;color:${BRAND.primary};letter-spacing:-0.01em;vertical-align:middle;">
                      ${escapeHtml(BRAND.name)}
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background-color:${BRAND.surface};border:1px solid ${BRAND.border};border-radius:4px;overflow:hidden;">

              <!-- Header strip -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="background-color:${BRAND.primary};padding:20px 28px;">
                    <div style="font-size:11px;font-weight:600;color:rgba(255,255,255,0.75);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:6px;">
                      Bảo mật tài khoản
                    </div>
                    <div style="font-size:20px;font-weight:600;color:#ffffff;line-height:1.3;letter-spacing:-0.02em;">
                      Đặt lại mật khẩu
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Content -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="padding:28px 28px 8px;">
                    <p style="margin:0 0 16px;font-size:15px;line-height:1.65;color:${BRAND.body};">
                      ${safeName ? `Xin chào <strong style="color:${BRAND.text};font-weight:600;">${safeName}</strong>,` : 'Xin chào,'}
                    </p>
                    <p style="margin:0;font-size:15px;line-height:1.65;color:${BRAND.body};">
                      Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản
                      <strong style="color:${BRAND.text};font-weight:600;">${safeEmail}</strong>.
                      Bấm nút bên dưới để tiếp tục — link chỉ dùng được một lần.
                    </p>
                  </td>
                </tr>

                <!-- CTA -->
                <tr>
                  <td style="padding:24px 28px 8px;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td style="background-color:${BRAND.primary};border-radius:4px;">
                          <a href="${safeUrl}" target="_blank" rel="noopener noreferrer"
                            style="display:inline-block;padding:12px 24px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;letter-spacing:0.01em;">
                            Đặt lại mật khẩu
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Notice -->
                <tr>
                  <td style="padding:20px 28px 8px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"
                      style="background-color:${BRAND.primarySoft};border:1px solid ${BRAND.primaryBorder};border-radius:4px;">
                      <tr>
                        <td style="padding:12px 14px;font-size:13px;line-height:1.55;color:${BRAND.accent};">
                          Link hết hạn sau <strong style="font-weight:600;">${expiresMinutes} phút</strong>.
                          Sau đó bạn cần gửi lại yêu cầu từ trang quên mật khẩu.
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Fallback link -->
                <tr>
                  <td style="padding:16px 28px 28px;">
                    <p style="margin:0 0 6px;font-size:12px;line-height:1.5;color:${BRAND.muted};">
                      Nếu nút không hoạt động, dán link sau vào trình duyệt:
                    </p>
                    <p style="margin:0;font-size:12px;line-height:1.55;word-break:break-all;">
                      <a href="${safeUrl}" style="color:${BRAND.primary};text-decoration:none;">${safeUrl}</a>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 4px 0;">
              <p style="margin:0 0 6px;font-size:12px;line-height:1.55;color:${BRAND.muted};text-align:center;">
                Nếu bạn không yêu cầu đổi mật khẩu, bỏ qua email này — tài khoản vẫn an toàn.
              </p>
              <p style="margin:0;font-size:11px;line-height:1.5;color:#94a3b8;text-align:center;">
                ${escapeHtml(BRAND.tagline)} · © ${new Date().getFullYear()} ${escapeHtml(BRAND.name)}
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function buildPasswordResetEmailText({
  resetUrl,
  recipientEmail,
  recipientName,
  expiresMinutes = 15,
}) {
  const greeting = recipientName ? `Xin chao ${recipientName},` : 'Xin chao,';
  return `${BRAND.name}
${BRAND.tagline}

${greeting}

Ban vua yeu cau dat lai mat khau cho tai khoan ${recipientEmail}.

Dat lai mat khau (het han sau ${expiresMinutes} phut):
${resetUrl}

Neu ban khong yeu cau, hay bo qua email nay.

(c) ${new Date().getFullYear()} ${BRAND.name}`;
}

export { BRAND };
