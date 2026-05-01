import React, { useEffect, useMemo, useRef } from "react";
import { useAppContext } from "../context/AppContext";
import toast from "react-hot-toast";

const OTP_LENGTH = 6;

const EmailVerify = () => {
  const { user, axios, navigate, fetchUser } = useAppContext();
  const inputRefs = useRef([]);

  const userEmail = useMemo(() => user?.email || "", [user]);

  const focusInput = (index) => {
    if (inputRefs.current[index]) {
      inputRefs.current[index].focus();
      inputRefs.current[index].select();
    }
  };

  const handleInput = (event, index) => {
    const onlyNumber = event.target.value.replace(/\D/g, "").slice(-1);
    event.target.value = onlyNumber;

    if (onlyNumber && index < OTP_LENGTH - 1) {
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
    const paste = event.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, OTP_LENGTH);

    paste.split("").forEach((char, index) => {
      if (inputRefs.current[index]) {
        inputRefs.current[index].value = char;
      }
    });

    const nextFocusIndex = Math.min(paste.length, OTP_LENGTH - 1);
    focusInput(nextFocusIndex);
  };

  const getOtp = () =>
    inputRefs.current.map((input) => input?.value || "").join("");

  const sendOtp = async (showToast = true) => {
    try {
      const { data } = await axios.post("/api/user/send-verify-otp");
      if (data.success) {
        if (showToast) {
          toast.success(data.message);
        }
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  const onSubmitHandler = async (event) => {
    event.preventDefault();
    const otp = getOtp();

    if (!/^\d{6}$/.test(otp)) {
      return toast.error("Please enter a valid 6-digit OTP");
    }

    try {
      const { data } = await axios.post("/api/user/verify-account", { otp });
      if (data.success) {
        toast.success(data.message);
        await fetchUser();
        navigate("/");
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  useEffect(() => {
    if (!user) {
      navigate("/");
      return;
    }

    if (user.isAccountVerified) {
      navigate("/");
      return;
    }

    inputRefs.current[0]?.focus();
  }, [user, navigate]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center py-12">
      <form
        onSubmit={onSubmitHandler}
        className="relative z-[60] w-full max-w-md border border-gray-200 rounded-xl shadow-sm p-6 sm:p-8 bg-white"
      >
        <h1 className="text-2xl font-semibold text-gray-800 text-center">
          Verify Your Email
        </h1>
        <p className="text-sm text-gray-500 text-center mt-2">
          Enter the 6-digit OTP sent to{" "}
          <span className="font-medium text-gray-700">{userEmail}</span>
        </p>
        <p className="text-xs text-gray-400 text-center mt-2">
          OTP remains valid for 24 hours unless you request a new one.
        </p>

        <div
          className="flex items-center justify-between gap-2 mt-8"
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

        <button className="w-full py-2.5 mt-7 rounded-md bg-primary hover:bg-primary-dull text-white font-medium cursor-pointer">
          Verify Email
        </button>

        <button
          type="button"
          onClick={() => sendOtp(true)}
          className="w-full py-2.5 mt-3 rounded-md border border-gray-300 text-gray-600 hover:bg-gray-50 cursor-pointer"
        >
          Resend OTP
        </button>
      </form>
    </div>
  );
};

export default EmailVerify;
