import dotenv from "dotenv";

dotenv.config({ path: new URL("../.env", import.meta.url).pathname });

const BREVO_API_KEY = process.env.BREVO_API_KEY || null;

export const sendViaBrevo = async ({ from, to, subject, text, html }) => {
  if (!BREVO_API_KEY) throw new Error("BREVO_API_KEY not configured");

  const payload = {
    sender: {
      email: from?.match(/<(.+)>/)?.[1] || from || process.env.MAIL_FROM,
      name: from?.split("<")[0]?.trim() || "GreenCart",
    },
    to: Array.isArray(to) ? to.map((t) => ({ email: t })) : [{ email: to }],
    subject: subject,
    htmlContent: html,
    textContent: text,
  };

  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key": BREVO_API_KEY,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Brevo API error: ${res.status} ${body}`);
  }

  return res.json();
};

export default sendViaBrevo;
