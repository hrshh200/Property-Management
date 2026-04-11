const nodemailer = require("nodemailer");

const portalBaseUrl = () => (process.env.CLIENT_URL || "http://localhost:5173").replace(/\/$/, "");

const isMailConfigured = () => (
  Boolean(process.env.MAILTRAP_HOST)
  && Boolean(process.env.MAILTRAP_PORT)
  && Boolean(process.env.MAILTRAP_USER)
  && Boolean(process.env.MAILTRAP_PASS)
);

let transporter;

const getTransporter = () => {
  if (transporter) return transporter;

  transporter = nodemailer.createTransport({
    host: process.env.MAILTRAP_HOST,
    port: Number(process.env.MAILTRAP_PORT || 587),
    secure: Number(process.env.MAILTRAP_PORT || 587) === 465,
    auth: {
      user: process.env.MAILTRAP_USER,
      pass: process.env.MAILTRAP_PASS,
    },
  });

  return transporter;
};

const escapeHtml = (value) => String(value || "")
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/\"/g, "&quot;")
  .replace(/'/g, "&#039;");

const joinUrl = (base, path) => {
  if (!path) return base;
  if (/^https?:\/\//.test(path)) return path;
  return `${base}${path.startsWith("/") ? "" : "/"}${path}`;
};

const buildEmailHtml = ({ recipientName, heading, lead, highlights = [], actionLabel, actionPath, accent = "#2563eb" }) => {
  const ctaUrl = joinUrl(portalBaseUrl(), actionPath || "/");
  const safeHighlights = highlights
    .filter(Boolean)
    .map((line) => `<li style=\"margin: 0 0 8px;\">${escapeHtml(line)}</li>`)
    .join("");

  return `
  <!doctype html>
  <html>
    <head>
      <meta charset=\"UTF-8\" />
      <meta name=\"viewport\" content=\"width=device-width,initial-scale=1\" />
      <title>${escapeHtml(heading)}</title>
    </head>
    <body style=\"margin:0;padding:24px;background:#f1f5f9;font-family:Segoe UI,Arial,sans-serif;color:#0f172a;\">
      <table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"max-width:680px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 12px 28px rgba(15,23,42,0.12);\">
        <tr>
          <td style=\"padding:26px 28px;background:linear-gradient(135deg, ${accent}, #0ea5e9);color:#ffffff;\">
            <p style=\"margin:0;font-size:12px;letter-spacing:1.3px;text-transform:uppercase;opacity:0.9;\">PropManager Alerts</p>
            <h1 style=\"margin:10px 0 0;font-size:26px;line-height:1.2;\">${escapeHtml(heading)}</h1>
          </td>
        </tr>
        <tr>
          <td style=\"padding:24px 28px 8px;\">
            <p style=\"margin:0 0 12px;font-size:15px;color:#334155;\">Hi ${escapeHtml(recipientName || "there")},</p>
            <p style=\"margin:0 0 16px;font-size:15px;line-height:1.7;color:#334155;\">${escapeHtml(lead)}</p>
          </td>
        </tr>
        ${safeHighlights ? `
        <tr>
          <td style=\"padding:0 28px 8px;\">
            <div style=\"background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:14px 16px;\">
              <p style=\"margin:0 0 10px;font-size:12px;text-transform:uppercase;letter-spacing:1px;color:#475569;font-weight:700;\">Quick Summary</p>
              <ul style=\"padding-left:18px;margin:0;font-size:14px;line-height:1.6;color:#334155;\">
                ${safeHighlights}
              </ul>
            </div>
          </td>
        </tr>
        ` : ""}
        <tr>
          <td style=\"padding:18px 28px 8px;\">
            <a href=\"${escapeHtml(ctaUrl)}\" style=\"display:inline-block;padding:11px 18px;background:${accent};color:#ffffff;text-decoration:none;border-radius:10px;font-size:14px;font-weight:700;\">${escapeHtml(actionLabel || "Open PropManager")}</a>
          </td>
        </tr>
        <tr>
          <td style=\"padding:14px 28px 24px;\">
            <p style=\"margin:0;font-size:12px;color:#64748b;\">If you did not expect this email, you can safely ignore it.</p>
          </td>
        </tr>
      </table>
    </body>
  </html>
  `;
};

const buildEmailText = ({ recipientName, heading, lead, highlights = [], actionPath }) => {
  const ctaUrl = joinUrl(portalBaseUrl(), actionPath || "/");
  const lines = [
    `Hi ${recipientName || "there"},`,
    "",
    heading,
    lead,
    "",
  ];

  for (const item of highlights.filter(Boolean)) {
    lines.push(`- ${item}`);
  }

  lines.push("", `Open: ${ctaUrl}`, "", "PropManager");
  return lines.join("\n");
};

const sendEventEmail = async ({
  to,
  subject,
  recipientName,
  heading,
  lead,
  highlights,
  actionLabel,
  actionPath,
  accent,
}) => {
  if (!to || !subject) return;

  if (!isMailConfigured()) {
    console.log(`[email] Mailtrap not configured. Skipping email for: ${subject}`);
    return;
  }

  try {
    const mailer = getTransporter();
    const from = process.env.MAIL_FROM || "PropManager <no-reply@propmanager.local>";

    await mailer.sendMail({
      from,
      to,
      subject,
      text: buildEmailText({ recipientName, heading, lead, highlights, actionPath }),
      html: buildEmailHtml({ recipientName, heading, lead, highlights, actionLabel, actionPath, accent }),
    });
  } catch (err) {
    console.error(`[email] Failed to send \"${subject}\":`, err.message);
  }
};

module.exports = {
  sendEventEmail,
};
