import "server-only";
import { Resend } from "resend";

// Lazily constructed so a missing RESEND_API_KEY only breaks the actual send
// call (which the emailVerificationEnabled/googleLoginEnabled toggles keep
// off by default until configured), not module import / build time.
function getResendClient() {
  return new Resend(process.env.RESEND_API_KEY);
}

const FROM_ADDRESS = process.env.EMAIL_FROM ?? "onboarding@resend.dev";
const BASE_URL = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

function emailShell(title: string, bodyHtml: string): string {
  return `<!doctype html>
<html>
  <body style="margin:0;padding:24px;background:#F8FAFC;font-family:Arial,Helvetica,sans-serif;">
    <div style="max-width:480px;margin:0 auto;background:#FFFFFF;border:1px solid #E5E7EB;border-radius:12px;padding:32px;">
      <h1 style="margin:0 0 16px;font-size:18px;color:#111827;">${title}</h1>
      ${bodyHtml}
    </div>
  </body>
</html>`;
}

function buttonHtml(href: string, label: string): string {
  return `<a href="${href}" style="display:inline-block;margin-top:20px;padding:10px 20px;background:#2563EB;color:#FFFFFF;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600;">${label}</a>`;
}

export async function sendVerificationEmail(to: string, token: string): Promise<void> {
  const link = `${BASE_URL}/api/verify-email?token=${encodeURIComponent(token)}`;
  await getResendClient().emails.send({
    from: FROM_ADDRESS,
    to,
    subject: "Xác thực địa chỉ email của bạn",
    html: emailShell(
      "Xác thực địa chỉ email",
      `<p style="margin:0;font-size:14px;color:#6B7280;">Bấm nút bên dưới để xác thực email và kích hoạt tài khoản. Liên kết có hiệu lực trong 24 giờ.</p>
       ${buttonHtml(link, "Xác thực email")}
       <p style="margin:20px 0 0;font-size:12px;color:#9CA3AF;">Nếu bạn không yêu cầu, hãy bỏ qua email này.</p>`
    ),
  });
}

export async function sendPasswordResetEmail(to: string, token: string): Promise<void> {
  const link = `${BASE_URL}/reset-password?token=${encodeURIComponent(token)}`;
  await getResendClient().emails.send({
    from: FROM_ADDRESS,
    to,
    subject: "Đặt lại mật khẩu",
    html: emailShell(
      "Đặt lại mật khẩu",
      `<p style="margin:0;font-size:14px;color:#6B7280;">Bấm nút bên dưới để đặt mật khẩu mới. Liên kết có hiệu lực trong 1 giờ.</p>
       ${buttonHtml(link, "Đặt lại mật khẩu")}
       <p style="margin:20px 0 0;font-size:12px;color:#9CA3AF;">Nếu bạn không yêu cầu đặt lại mật khẩu, hãy bỏ qua email này — mật khẩu hiện tại của bạn vẫn an toàn.</p>`
    ),
  });
}
