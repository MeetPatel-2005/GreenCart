import React, { useRef, useState } from "react";
import toast from "react-hot-toast";
import { useAppContext } from "../context/AppContext";

const OTP_LENGTH = 6;

const ResetPassword = () => {
  const { axios, navigate } = useAppContext();

  const [step, setStep] = useState("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const inputRefs = useRef([]);

  const focusInput = (index) => {
    const target = inputRefs.current[index];
    if (target) {
      target.focus();
      target.select();
    }
  };

  const handleInput = (event, index) => {
    const value = event.target.value.replace(/\D/g, "").slice(-1);
    event.target.value = value;

    if (value && index < OTP_LENGTH - 1) {
      focusInput(index + 1);
    }
  };

  const handleKeyDown = (event, index) => {
    if (event.key === "Backspace" && !event.target.value && index > 0) {
      focusInput(index - 1);
    }
  };

  const handlePaste = (event) => {
    event.preventDefault();
    const pasted = event.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, OTP_LENGTH);

    pasted.split("").forEach((char, index) => {
      if (inputRefs.current[index]) {
        inputRefs.current[index].value = char;
      }
    });

    const nextIndex = Math.min(pasted.length, OTP_LENGTH - 1);
    focusInput(nextIndex);
  };

  const getOtpValue = () =>
    inputRefs.current.map((input) => input?.value || "").join("");

  const onSubmitEmail = async (event) => {
    event.preventDefault();

    try {
      const { data } = await axios.post("/api/user/send-reset-otp", { email });
      if (data.success) {
        toast.success(data.message);
        setStep("otp");
        setTimeout(() => focusInput(0), 0);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  const onSubmitOtp = (event) => {
    event.preventDefault();
    const otpValue = getOtpValue();

    if (!/^\d{6}$/.test(otpValue)) {
      return toast.error("Please enter a valid 6-digit OTP");
    }

    setOtp(otpValue);
    setStep("password");
  };

  const onSubmitNewPassword = async (event) => {
    event.preventDefault();

    if (newPassword !== confirmPassword) {
      return toast.error("New password and confirm password do not match");
    }

    try {
      const { data } = await axios.post("/api/user/reset-password", {
        email,
        otp,
        newPassword,
      });

      if (data.success) {
        toast.success(data.message);
        navigate("/");
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  const resendOtp = async () => {
    try {
      const { data } = await axios.post("/api/user/send-reset-otp", { email });
      if (data.success) {
        toast.success("A new reset OTP has been sent");
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center py-12">
      <div className="relative z-60 w-full max-w-md border border-gray-200 rounded-xl shadow-sm p-6 sm:p-8 bg-white">
        {step === "email" && (
          <form onSubmit={onSubmitEmail} className="space-y-4">
            <h1 className="text-2xl font-semibold text-center text-gray-800">
              Forgot Password
            </h1>
            <p className="text-sm text-center text-gray-500">
              Enter your registered email to receive a reset OTP.
            </p>
            <input
              type="email"
              required
              className="w-full border border-gray-300 rounded-md px-3 py-2.5 outline-none focus:border-primary"
              placeholder="Enter your email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
            <button className="w-full py-2.5 rounded-md bg-primary hover:bg-primary-dull text-white font-medium cursor-pointer">
              Send OTP
            </button>
          </form>
        )}

        {step === "otp" && (
          <form onSubmit={onSubmitOtp} className="space-y-4">
            <h1 className="text-2xl font-semibold text-center text-gray-800">
              Enter Reset OTP
            </h1>
            <p className="text-sm text-center text-gray-500">
              Enter the 6-digit OTP sent to {email}.
            </p>
            <div
              className="flex items-center justify-between gap-2 mt-2"
              onPaste={handlePaste}
            >
              {Array(OTP_LENGTH)
                .fill(0)
                .map((_, index) => (
                  <input
                    key={index}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    required
                    className="w-11 h-12 sm:w-12 sm:h-12 border border-gray-300 rounded-md text-center text-lg font-medium outline-none focus:border-primary"
                    ref={(element) => {
                      inputRefs.current[index] = element;
                    }}
                    onInput={(event) => handleInput(event, index)}
                    onKeyDown={(event) => handleKeyDown(event, index)}
                  />
                ))}
            </div>
            <button className="w-full py-2.5 rounded-md bg-primary hover:bg-primary-dull text-white font-medium cursor-pointer">
              Verify OTP
            </button>
            <button
              type="button"
              onClick={resendOtp}
              className="w-full py-2.5 rounded-md border border-gray-300 text-gray-600 hover:bg-gray-50 cursor-pointer"
            >
              Resend OTP
            </button>
          </form>
        )}

        {step === "password" && (
          <form onSubmit={onSubmitNewPassword} className="space-y-4">
            <h1 className="text-2xl font-semibold text-center text-gray-800">
              Set New Password
            </h1>
            <p className="text-sm text-center text-gray-500">
              Enter a new password for {email}.
            </p>
            <input
              type="password"
              required
              minLength={6}
              className="w-full border border-gray-300 rounded-md px-3 py-2.5 outline-none focus:border-primary"
              placeholder="Enter new password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
            />
            <input
              type="password"
              required
              minLength={6}
              className="w-full border border-gray-300 rounded-md px-3 py-2.5 outline-none focus:border-primary"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
            />
            <button className="w-full py-2.5 rounded-md bg-primary hover:bg-primary-dull text-white font-medium cursor-pointer">
              Reset Password
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;
