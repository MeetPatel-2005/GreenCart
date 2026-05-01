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

if (!process.env.SENDER_EMAIL) {
  throw new Error("SENDER_EMAIL is missing. Set SENDER_EMAIL in server/.env");
}

const transporter = nodemailer.createTransport({
  host: "smtp-relay.brevo.com",
  port: 587,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export default transporter;
