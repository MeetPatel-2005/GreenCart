import User from "../models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import transporter from "../configs/nodemailer.js";
import { sendViaBrevo } from "../configs/brevo.js";
import crypto from "crypto";
import {
  getEmailVerifyTemplate,
  getPasswordResetTemplate,
} from "../configs/emailTemplates.js";

const buildUserResponse = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  cartItems: user.cartItems,
  isAccountVerified: user.isAccountVerified,
});

const generateOtp = () => String(Math.floor(100000 + Math.random() * 900000));

const getMailFrom = () =>
  process.env.MAIL_FROM || process.env.SENDER_EMAIL || process.env.SMTP_USER;

const sendVerificationOtpEmail = async ({ email, otp, name }) => {
  await transporter.sendMail({
    from: `GreenCart <${getMailFrom()}>`,
    to: email,
    subject: "Your GreenCart verification code",
    text: `Hello ${name || "there"},\n\nYour GreenCart verification OTP is ${otp}.\n\nThis code expires in 24 hours. Do not share this OTP with anyone.\n\nIf you did not request this, ignore this email.`,
    html: getEmailVerifyTemplate({ otp, email, name }),
  });
};

// Register User : /api/user/register
export const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.json({ success: false, message: "Missing Details" });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser)
      return res.json({ success: false, message: "User already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);

    const otp = generateOtp();

    const user = await User.create({
      name,
      email: normalizedEmail,
      password: hashedPassword,
      verifyOtp: otp,
      verifyOtpExpiredAt: Date.now() + 24 * 60 * 60 * 1000,
    });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    res.cookie("token", token, {
      httpOnly: true, // Prevent JavaScript to access cookie
      secure: process.env.NODE_ENV === "production", // Use secure cookies in production
      sameSite: process.env.NODE_ENV === "production" ? "none" : "strict", // CSRF protection
      maxAge: 7 * 24 * 60 * 60 * 1000, // Cookie expiration time
    });

    await sendVerificationOtpEmail({
      email: user.email,
      otp,
      name: user.name,
    });

    return res.json({
      success: true,
      message: "Account created. Verification OTP sent to your email.",
      user: buildUserResponse(user),
    });
  } catch (error) {
    console.log(error.message);
    res.json({ success: false, message: error.message });
  }
};

// Login User : /api/user/login

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password)
      return res.json({
        success: false,
        message: "Email and password are required",
      });
    const normalizedEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.json({ success: false, message: "Invalid email or password" });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch)
      return res.json({ success: false, message: "Invalid email or password" });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    if (!user.isAccountVerified) {
      const otp = generateOtp();
      user.verifyOtp = otp;
      user.verifyOtpExpiredAt = Date.now() + 24 * 60 * 60 * 1000;
      await user.save();

      await sendVerificationOtpEmail({
        email: user.email,
        otp,
        name: user.name,
      });
    }

    return res.json({
      success: true,
      message: user.isAccountVerified
        ? "Login successful"
        : "Login successful. A new verification OTP has been sent to your email.",
      user: buildUserResponse(user),
    });
  } catch (error) {
    console.log(error.message);
    res.json({ success: false, message: error.message });
  }
};

// Check Auth : /api/user/is-auth
export const isAuth = async (req, res) => {
  try {
    const userId = req.userId || req.body.userId;
    const user = await User.findById(userId).select(
      "-password -verifyOtp -verifyOtpExpiredAt -resetOtp -resetOtpExpiredAt",
    );

    if (!user) {
      return res.json({ success: false, message: "User not found" });
    }

    return res.json({ success: true, user });
  } catch (error) {
    console.log(error.message);
    res.json({ success: false, message: error.message });
  }
};

// Logout User : /api/user/logout

export const logout = async (req, res) => {
  try {
    res.clearCookie("token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
    });
    return res.json({ success: true, message: "Logged Out" });
  } catch (error) {
    console.log(error.message);
    res.json({ success: false, message: error.message });
  }
};

// Send account verification OTP : /api/user/send-verify-otp
export const sendVerifyOtp = async (req, res) => {
  try {
    const userId = req.userId || req.body.userId;
    const user = await User.findById(userId);

    if (!user) {
      return res.json({ success: false, message: "User not found" });
    }

    if (user.isAccountVerified) {
      return res.json({ success: false, message: "Account already verified" });
    }

    const otp = generateOtp();
    user.verifyOtp = otp;
    user.verifyOtpExpiredAt = Date.now() + 24 * 60 * 60 * 1000;
    await user.save();

    await sendVerificationOtpEmail({
      email: user.email,
      otp,
      name: user.name,
    });

    return res.json({
      success: true,
      message: "Verification OTP sent to your email",
    });
  } catch (error) {
    console.log(error.message);
    return res.json({ success: false, message: error.message });
  }
};

// Verify account by OTP : /api/user/verify-account
export const verifyEmail = async (req, res) => {
  try {
    const userId = req.userId || req.body.userId;
    const { otp } = req.body;

    if (!userId || !otp) {
      return res.json({ success: false, message: "Missing details" });
    }

    if (!/^\d{6}$/.test(String(otp))) {
      return res.json({
        success: false,
        message: "OTP must be a 6-digit number",
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.json({ success: false, message: "User not found" });
    }

    if (user.isAccountVerified) {
      return res.json({ success: true, message: "Account already verified" });
    }

    if (user.verifyOtp === "" || user.verifyOtp !== String(otp)) {
      return res.json({ success: false, message: "Invalid OTP" });
    }

    if (user.verifyOtpExpiredAt < Date.now()) {
      return res.json({ success: false, message: "OTP expired" });
    }

    user.isAccountVerified = true;
    user.verifyOtp = "";
    user.verifyOtpExpiredAt = 0;
    await user.save();

    return res.json({
      success: true,
      message: "Email verified successfully",
      user: buildUserResponse(user),
    });
  } catch (error) {
    console.log(error.message);
    return res.json({ success: false, message: error.message });
  }
};

const sendPasswordResetOtpEmail = async ({ email, otp, name }) => {
  const mailOptions = {
    from: `GreenCart <${getMailFrom()}>`,
    to: email,
    subject: "Your GreenCart password reset code",
    text: `Hello ${name || "there"},\n\nYour GreenCart password reset OTP is ${otp}.\n\nThis code expires in 15 minutes. Do not share this OTP with anyone.\n\nIf you did not request this, ignore this email.`,
    html: getPasswordResetTemplate({ otp, email, name }),
  };

  // Try SMTP first, fall back to Brevo HTTP API if configured
  try {
    await sendMailWithTimeout(
      mailOptions,
      Number(process.env.SMTP_SEND_TIMEOUT || 30000),
    );
    return;
  } catch (err) {
    console.log(`sendPasswordResetOtpEmail: SMTP failed: ${err.message}`);
    if (process.env.BREVO_API_KEY) {
      try {
        await sendViaBrevo(mailOptions);
        console.log("sendPasswordResetOtpEmail: sent via Brevo API");
        return;
      } catch (brevoErr) {
        console.log(
          `sendPasswordResetOtpEmail: Brevo API failed: ${brevoErr.message}`,
        );
        throw brevoErr;
      }
    }
    throw err;
  }
};

// Helper to send mail with a timeout to avoid long-hanging requests in production
const sendMailWithTimeout = async (mailOptions, timeoutMs = 30000) => {
  const sendPromise = (async () => {
    // transporter.sendMail may throw synchronously if not configured
    return transporter.sendMail(mailOptions);
  })();

  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error("SMTP send timed out")), timeoutMs),
  );

  return Promise.race([sendPromise, timeoutPromise]);
};

// Send reset password OTP : /api/user/send-reset-otp
export const sendResetOtp = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.json({ success: false, message: "Email is required" });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.json({ success: false, message: "User not found" });
    }

    const otp = generateOtp();
    const otpId =
      (crypto && crypto.randomUUID && crypto.randomUUID()) ||
      `${Date.now()}${Math.random().toString(36).slice(2, 8)}`;

    // Try to send the email first (with a timeout). Only save OTP to DB if send succeeds.
    try {
      await sendMailWithTimeout(
        {
          from: `GreenCart <${getMailFrom()}>`,
          to: user.email,
          subject: "Your GreenCart password reset code",
          text: `Hello ${user.name || "there"},\n\nYour GreenCart password reset OTP is ${otp}.\n\nThis code expires in 15 minutes. Do not share this OTP with anyone.\n\nIf you did not request this, ignore this email.`,
          html: getPasswordResetTemplate({
            otp,
            email: user.email,
            name: user.name,
          }),
        },
        8000,
      );
    } catch (mailErr) {
      console.log(
        `sendResetOtp: email send failed for ${user.email}: ${mailErr.message}`,
      );
      return res.json({
        success: false,
        message: `Failed to send OTP email: ${mailErr.message}`,
      });
    }

    // Save OTP after successful send
    user.resetOtp = otp;
    user.resetOtpId = otpId;
    user.resetOtpExpiredAt = Date.now() + 15 * 60 * 1000;
    await user.save();

    // Log masked OTP info for debugging (do not log full OTP in production)
    try {
      const masked = `***${String(otp).slice(-2)}`;
      console.log(
        `sendResetOtp: saved resetOtp=${masked} id=${String(otpId).slice(-6)} for ${user.email}, expires=${new Date(
          user.resetOtpExpiredAt,
        ).toISOString()}`,
      );
    } catch (logErr) {
      console.log(`sendResetOtp: saved resetOtp for ${user.email}`);
    }

    // For debugging in non-production, return masked last-2 digits and request id so client can confirm
    const masked = `***${String(otp).slice(-2)}`;
    const resp = { success: true, message: "Reset OTP sent to your email" };
    if (process.env.NODE_ENV !== "production") {
      resp.masked = masked;
      resp.resetOtpId = otpId;
    }

    return res.json(resp);
  } catch (error) {
    console.log(error.message);
    return res.json({ success: false, message: error.message });
  }
};

// Reset password using OTP : /api/user/reset-password
export const resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.json({
        success: false,
        message: "Email, OTP and new password are required",
      });
    }

    const providedOtp = String(otp).trim();
    const providedOtpId = (req.body.resetOtpId || "").toString();

    if (!/^[0-9]{6}$/.test(providedOtp)) {
      return res.json({
        success: false,
        message: "OTP must be a 6-digit number",
      });
    }

    if (String(newPassword).length < 6) {
      return res.json({
        success: false,
        message: "Password must be at least 6 characters long",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.json({ success: false, message: "User not found" });
    }

    // Log masked comparison details for debugging
    try {
      const storedMasked = user.resetOtp
        ? `***${String(user.resetOtp).slice(-2)}`
        : "(none)";
      const storedIdShort = user.resetOtpId
        ? `${String(user.resetOtpId).slice(-6)}`
        : "(none)";
      const providedIdShort = providedOtpId
        ? `${String(providedOtpId).slice(-6)}`
        : "(none)";
      console.log(
        `resetPassword: received otp=***${providedOtp.slice(-2)} id=${providedIdShort} for ${normalizedEmail}, stored=${storedMasked} id=${storedIdShort}, expires=${new Date(user.resetOtpExpiredAt).toISOString()}`,
      );
    } catch (logErr) {
      console.log(`resetPassword: received otp for ${normalizedEmail}`);
    }

    if (user.resetOtpId) {
      if (!providedOtpId || user.resetOtpId !== providedOtpId) {
        return res.json({
          success: false,
          message: "Invalid OTP (request mismatch)",
        });
      }
    }

    if (!user.resetOtp || user.resetOtp !== providedOtp) {
      return res.json({ success: false, message: "Invalid OTP" });
    }

    if (user.resetOtpExpiredAt < Date.now()) {
      return res.json({ success: false, message: "OTP expired" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    user.resetOtp = "";
    user.resetOtpId = "";
    user.resetOtpExpiredAt = 0;
    await user.save();

    return res.json({
      success: true,
      message:
        "Password reset successful. Please login with your new password.",
    });
  } catch (error) {
    console.log(error.message);
    return res.json({ success: false, message: error.message });
  }
};

// Dev-only: return masked resetOtp and expiry for troubleshooting
export const debugResetOtp = async (req, res) => {
  try {
    if (process.env.NODE_ENV === "production") {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    const email = (req.query.email || "").toString().trim().toLowerCase();
    if (!email)
      return res.json({ success: false, message: "email query required" });

    const user = await User.findOne({ email });
    if (!user) return res.json({ success: false, message: "User not found" });

    const masked = user.resetOtp
      ? `***${String(user.resetOtp).slice(-2)}`
      : null;
    return res.json({
      success: true,
      email: user.email,
      resetOtpMasked: masked,
      resetOtpExpiry: user.resetOtpExpiredAt,
    });
  } catch (error) {
    console.log("debugResetOtp error:", error.message);
    return res.json({ success: false, message: error.message });
  }
};
