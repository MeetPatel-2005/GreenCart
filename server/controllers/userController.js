import User from "../models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import transporter from "../configs/nodemailer.js";
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

const sendVerificationOtpEmail = async ({ email, otp, name }) => {
  await transporter.sendMail({
    from: `GreenCart <${process.env.SENDER_EMAIL}>`,
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
  await transporter.sendMail({
    from: `GreenCart <${process.env.SENDER_EMAIL}>`,
    to: email,
    subject: "Your GreenCart password reset code",
    text: `Hello ${name || "there"},\n\nYour GreenCart password reset OTP is ${otp}.\n\nThis code expires in 15 minutes. Do not share this OTP with anyone.\n\nIf you did not request this, ignore this email.`,
    html: getPasswordResetTemplate({ otp, email, name }),
  });
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
    user.resetOtp = otp;
    user.resetOtpExpiredAt = Date.now() + 15 * 60 * 1000;
    await user.save();

    await sendPasswordResetOtpEmail({
      email: user.email,
      otp,
      name: user.name,
    });

    return res.json({ success: true, message: "Reset OTP sent to your email" });
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

    if (!/^\d{6}$/.test(String(otp))) {
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

    if (user.resetOtp === "" || user.resetOtp !== String(otp)) {
      return res.json({ success: false, message: "Invalid OTP" });
    }

    if (user.resetOtpExpiredAt < Date.now()) {
      return res.json({ success: false, message: "OTP expired" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    user.resetOtp = "";
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
