import nodemailer from "nodemailer";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from server root even when the process is started from another directory.
dotenv.config({ path: path.resolve(__dirname, "../.env") });

if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
  throw new Error(
    "SMTP credentials are missing. Set SMTP_USER and SMTP_PASS in server/.env",
  );
}

if (
  !process.env.MAIL_FROM &&
  !process.env.SENDER_EMAIL &&
  !process.env.SMTP_USER
) {
  throw new Error(
    "Mail sender is missing. Set MAIL_FROM, SENDER_EMAIL, or SMTP_USER in server/.env",
  );
}

const MAIL_FROM =
  process.env.MAIL_FROM || process.env.SENDER_EMAIL || process.env.SMTP_USER;

const transporter = nodemailer.createTransport({
  host: "smtp-relay.brevo.com",
  port: 587,
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

export default transporter;
