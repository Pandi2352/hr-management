import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail, ArrowRight, ArrowLeft, KeyRound, Lock, CheckCircle2, ShieldCheck } from "lucide-react";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Alert } from "../../components/ui/Alert";
import { Form, FormField } from "../../components/forms";
import { useToast } from "../../components/ui/toast";
import { authApi } from "./api/auth.api";
import { validationRules, VALIDATION_MESSAGES } from "../../validation/rules";
import { PasswordStrength } from "./components/PasswordStrength";
import { PasswordRequirements } from "./components/PasswordRequirements";
import {
  calculatePasswordStrength,
  DEFAULT_PASSWORD_POLICY,
  type PasswordPolicy,
} from "./validation/password.validation";

export function ForgotPasswordPage() {
  const navigate = useNavigate();
  const toast = useToast();

  // Step 1: Request OTP / Step 2: Enter OTP & New Password
  const [step, setStep] = useState<"REQUEST" | "VERIFY">("REQUEST");
  const [email, setEmail] = useState<string>("");
  const [otp, setOtp] = useState<string>("");
  const [newPassword, setNewPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errors, setErrors] = useState<{
    email?: string;
    otp?: string;
    newPassword?: string;
    confirmPassword?: string;
    general?: string;
  }>({});

  // Countdown timer for resend OTP (60 seconds)
  const [resendCountdown, setResendCountdown] = useState<number>(60);
  const [canResend, setCanResend] = useState<boolean>(false);

  const [passwordPolicy, setPasswordPolicy] = useState<PasswordPolicy>(DEFAULT_PASSWORD_POLICY);
  const strength = calculatePasswordStrength(newPassword, passwordPolicy);

  useEffect(() => {
    authApi.getPasswordPolicy().then(setPasswordPolicy).catch(() => {
      // Keep default policy if the live one can't be fetched
    });
  }, []);

  useEffect(() => {
    let timer: number | undefined;
    if (step === "VERIFY" && resendCountdown > 0) {
      timer = window.setTimeout(() => {
        setResendCountdown((prev) => prev - 1);
      }, 1000);
    } else if (resendCountdown === 0) {
      setCanResend(true);
    }
    return () => {
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, [step, resendCountdown]);

  // Request OTP Form Validation
  const validateRequestForm = (): boolean => {
    const newErrors: typeof errors = {};
    const trimmed = email.trim();

    if (!validationRules.isNonEmpty(trimmed)) {
      newErrors.email = VALIDATION_MESSAGES.REQUIRED("Work Email");
    } else if (!validationRules.isValidEmail(trimmed)) {
      newErrors.email = VALIDATION_MESSAGES.INVALID_EMAIL;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Verify OTP & New Password Validation
  const validateVerifyForm = (): boolean => {
    const newErrors: typeof errors = {};

    if (!otp.trim()) {
      newErrors.otp = "Verification code is required";
    } else if (otp.trim().length !== 6 || !/^\d+$/.test(otp.trim())) {
      newErrors.otp = "Verification code must be exactly 6 numeric digits";
    }

    if (!newPassword) {
      newErrors.newPassword = VALIDATION_MESSAGES.REQUIRED("New Password");
    } else if (!strength.isValid) {
      newErrors.newPassword = "Password does not meet the organization's security requirements";
    }

    if (confirmPassword !== newPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading || !validateRequestForm()) return;

    setIsLoading(true);
    setErrors({});

    try {
      const res = await authApi.forgotPassword(email.trim().toLowerCase());
      toast.info(res.message, "Code Dispatched");
      setStep("VERIFY");
      setResendCountdown(60);
      setCanResend(false);
    } catch (err: any) {
      const msg = err.response?.data?.message || "Failed to dispatch verification code";
      setErrors({ general: msg });
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (!canResend || isLoading) return;

    setIsLoading(true);
    setErrors({});

    try {
      await authApi.forgotPassword(email.trim().toLowerCase());
      toast.success("A fresh verification code has been dispatched.", "Code Resent");
      setResendCountdown(60);
      setCanResend(false);
    } catch (err: any) {
      const msg = err.response?.data?.message || "Unable to resend verification code";
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading || !validateVerifyForm()) return;

    setIsLoading(true);
    setErrors({});

    try {
      const res = await authApi.resetPassword({
        email: email.trim().toLowerCase(),
        otp: otp.trim(),
        newPassword,
      });

      toast.success(res.message, "Password Reset Complete", 5000);
      navigate("/auth/login", { replace: true });
    } catch (err: any) {
      const msg = err.response?.data?.message || "Failed to reset password";
      setErrors({ general: msg });
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Title Header */}
      <div className="mb-6">
        <Link
          to="/auth/login"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors mb-3 cursor-pointer"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Sign in</span>
        </Link>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">
          {step === "REQUEST" ? "Reset your password" : "Enter verification code"}
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          {step === "REQUEST"
            ? "Enter your registered work email to receive a 6-digit OTP"
            : `We dispatched a 6-digit single-use code to ${email}`}
        </p>
      </div>

      {/* Global Error Alert */}
      {errors.general && (
        <Alert
          variant="error"
          title="Verification Error"
          className="mb-5"
          onClose={() => setErrors((prev) => ({ ...prev, general: undefined }))}
        >
          {errors.general}
        </Alert>
      )}

      {/* Step 1: Request OTP */}
      {step === "REQUEST" ? (
        <Form onSubmit={handleRequestOtp} className="space-y-4">
          <FormField>
            <Input
              id="reset-email"
              type="email"
              label="Work Email"
              required
              autoComplete="email"
              autoFocus
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (errors.email) setErrors((prev) => ({ ...prev, email: undefined, general: undefined }));
              }}
              error={errors.email}
              placeholder="alex.morgan@company.com"
              leftIcon={<Mail className="h-4 w-4" />}
              disabled={isLoading}
            />
          </FormField>

          <Button
            type="submit"
            variant="primary"
            size="md"
            className="w-full mt-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 flex items-center justify-center gap-2 cursor-pointer shadow-xs"
            isLoading={isLoading}
            disabled={isLoading}
          >
            <span>{isLoading ? "Dispatching code..." : "Send Verification Code"}</span>
            {!isLoading && <ArrowRight className="h-4 w-4" />}
          </Button>
        </Form>
      ) : (
        /* Step 2: Verification Code & New Password */
        <Form onSubmit={handleResetPassword} className="space-y-4">
          {/* OTP Code Field */}
          <FormField>
            <Input
              id="reset-otp"
              type="text"
              label="6-Digit Verification Code"
              required
              autoFocus
              maxLength={6}
              value={otp}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, "");
                setOtp(val);
                if (errors.otp) setErrors((prev) => ({ ...prev, otp: undefined, general: undefined }));
              }}
              error={errors.otp}
              placeholder="123456"
              leftIcon={<KeyRound className="h-4 w-4" />}
              disabled={isLoading}
              className="font-mono text-center tracking-widest text-lg font-bold"
            />
          </FormField>

          {/* New Password Field */}
          <FormField>
            <Input
              id="new-password"
              type="password"
              isPasswordToggle
              label="New Password"
              required
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => {
                setNewPassword(e.target.value);
                if (errors.newPassword) setErrors((prev) => ({ ...prev, newPassword: undefined, general: undefined }));
              }}
              error={errors.newPassword}
              placeholder="Enter a secure new password"
              leftIcon={<Lock className="h-4 w-4" />}
              disabled={isLoading}
            />
          </FormField>

          {/* Live Password Strength Meter */}
          {newPassword.length > 0 && (
            <div className="rounded-md border border-slate-200 bg-slate-50/50 p-3 dark:border-slate-800 dark:bg-slate-900/50 space-y-2.5">
              <PasswordStrength strength={strength} />
              <PasswordRequirements rules={strength.rules} policy={passwordPolicy} />
            </div>
          )}

          {/* Confirm Password Field */}
          <FormField>
            <Input
              id="confirm-password"
              type="password"
              isPasswordToggle
              label="Confirm New Password"
              required
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                if (errors.confirmPassword) setErrors((prev) => ({ ...prev, confirmPassword: undefined, general: undefined }));
              }}
              error={errors.confirmPassword}
              placeholder="Re-enter new password"
              leftIcon={<Lock className="h-4 w-4" />}
              disabled={isLoading}
            />
          </FormField>

          {/* Submit Button */}
          <Button
            type="submit"
            variant="primary"
            size="md"
            className="w-full mt-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 flex items-center justify-center gap-2 cursor-pointer shadow-xs"
            isLoading={isLoading}
            disabled={isLoading}
          >
            <span>{isLoading ? "Resetting Password..." : "Confirm & Reset Password"}</span>
            {!isLoading && <CheckCircle2 className="h-4 w-4" />}
          </Button>

          {/* Resend Countdown Widget */}
          <div className="flex items-center justify-between pt-2 text-xs">
            <span className="text-slate-500">Didn't receive the code?</span>
            {canResend ? (
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={isLoading}
                className="font-semibold text-indigo-600 hover:text-indigo-500 cursor-pointer transition-colors"
              >
                Resend Code
              </button>
            ) : (
              <span className="text-slate-400 font-mono">
                Resend in {resendCountdown}s
              </span>
            )}
          </div>
        </Form>
      )}

      {/* Security Footer Notice */}
      <div className="mt-8 pt-4 border-t border-slate-100 flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
        <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
        <span>Cryptographically verified single-use OTP • TLS 1.3</span>
      </div>
    </div>
  );
}
