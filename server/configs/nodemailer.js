import nodemailer from "nodemailer";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from server root even when the process is started from another directory.
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const MAIL_FROM =
  process.env.MAIL_FROM ||
  process.env.SENDER_EMAIL ||
  process.env.SMTP_USER ||
  null;

let transporter;

if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
  console.warn(
    "SMTP credentials not found. Email sending will fail until SMTP_USER and SMTP_PASS are provided.",
  );

  // Create a dummy transporter with a clear failing sendMail to avoid crashing the app at startup.
  transporter = {
    sendMail: async () => {
      throw new Error(
        "SMTP not configured. Set SMTP_USER and SMTP_PASS in environment to enable email sending.",
      );
    },
    verify: (cb) => cb && cb(new Error("SMTP not configured")),
  };
} else {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp-relay.brevo.com",
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true" || false,
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  transporter.verify((error, success) => {
    if (error) {
      console.log(`SMTP verification failed: ${error.message}`);
    } else if (success) {
      console.log("SMTP transporter is ready");
    }
  });
}

export const getMailFrom = () => MAIL_FROM;
export default transporter;
