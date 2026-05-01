import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    cartItems: { type: Object, default: {} },
    isAccountVerified: { type: Boolean, default: false },
    verifyOtp: { type: String, default: "" },
    verifyOtpExpiredAt: { type: Number, default: 0 },
    resetOtp: { type: String, default: "" },
    resetOtpExpiredAt: { type: Number, default: 0 },
  },
  { minimize: false },
);

const User = mongoose.models.user || mongoose.model("user", userSchema);

export default User;
