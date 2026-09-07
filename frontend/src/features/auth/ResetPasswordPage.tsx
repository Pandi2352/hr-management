import React, { useState, useEffect } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import {
  Lock,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Form, FormField } from "../../components/forms";
import { useToast } from "../../components/ui/toast";
import { authApi } from "./api/auth.api";
import { PasswordStrength } from "./components/PasswordStrength";
import { PasswordRequirements } from "./components/PasswordRequirements";
import {
  calculatePasswordStrength,
  DEFAULT_PASSWORD_POLICY,
  type PasswordPolicy,
} from "./validation/password.validation";

type PageState = "VALIDATING" | "VALID" | "INVALID" | "EXPIRED" | "USED" | "SUCCESS";

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const navigate = useNavigate();
  const toast = useToast();

  const [pageState, setPageState] = useState<PageState>("VALIDATING");
  const [errorMessage, setErrorMessage] = useState<string>("");

  const [password, setPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [passwordPolicy, setPasswordPolicy] = useState<PasswordPolicy>(DEFAULT_PASSWORD_POLICY);

  useEffect(() => {
    authApi.getPasswordPolicy().then(setPasswordPolicy).catch(() => {
      // Keep default policy if the live one can't be fetched
    });
  }, []);

  // Dynamic real-time password strength calculation
  const strength = calculatePasswordStrength(password, passwordPolicy);
  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword;
  const isFormValid = strength.isValid && passwordsMatch;

  // 1. Token Validation on mount
  useEffect(() => {
    if (!token || token.trim().length < 16) {
      setPageState("INVALID");
      setErrorMessage("This password reset link is missing or invalid.");
      return;
    }

    let isMounted = true;
    const validateToken = async () => {
      try {
        await authApi.validateResetToken(token);
        if (isMounted) {
          setPageState("VALID");
        }
      } catch (err: any) {
        if (!isMounted) return;
        const status = err.response?.status;
        const msg = err.response?.data?.message || "Invalid or expired reset link.";

        if (status === 410) {
          setPageState("USED");
          setErrorMessage("This password reset link has already been used.");
        } else if (msg.toLowerCase().includes("expired")) {
          setPageState("EXPIRED");
          setErrorMessage("This password reset link has expired.");
        } else {
          setPageState("INVALID");
          setErrorMessage(msg);
        }
      }
    };

    validateToken();
    return () => {
      isMounted = false;
    };
  }, [token]);

  // 2. Submit new password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid || !token || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const res = await authApi.resetPasswordWithToken({
        token,
        password,
      });

      setPageState("SUCCESS");
      toast.success(res.message, "Password Reset Complete", 5000);
      setPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      const msg = err.response?.data?.message || "Failed to reset password. Please request a new link.";
      toast.error(msg);
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // State A: Validating token
  if (pageState === "VALIDATING") {
    return (
      <div className="w-full max-w-md mx-auto text-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600 mx-auto mb-3" />
        <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
          Verifying reset security link...
        </h3>
        <p className="text-xs text-slate-500 mt-1">
          Validating token authenticity and checking expiration
        </p>
      </div>
    );
  }

  // State B: Invalid / Expired / Used Link
  if (pageState === "INVALID" || pageState === "EXPIRED" || pageState === "USED") {
    const titleMap = {
      INVALID: "Invalid Reset Link",
      EXPIRED: "Reset Link Expired",
      USED: "Link Already Used",
    };

    return (
      <div className="w-full max-w-md mx-auto">
        <div className="rounded-md border border-rose-200 bg-rose-50/50 p-6 dark:border-rose-900/40 dark:bg-rose-950/20 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-md bg-rose-100 text-rose-600 dark:bg-rose-900/50 dark:text-rose-400 mb-3.5">
            <AlertTriangle className="h-6 w-6" />
          </div>

          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
            {titleMap[pageState]}
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
            {errorMessage || "This password reset link is no longer valid or has expired."}
          </p>

          <div className="mt-6 flex flex-col sm:flex-row gap-2.5 justify-center">
            <Link to="/auth/forgot-password" className="w-full sm:w-auto">
              <Button variant="primary" size="sm" className="w-full">
                Request New Link
              </Button>
            </Link>
            <Link to="/auth/login" className="w-full sm:w-auto">
              <Button variant="outline" size="sm" className="w-full">
                Back to Sign in
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // State C: Success
  if (pageState === "SUCCESS") {
    return (
      <div className="w-full max-w-md mx-auto text-center py-6">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-md bg-emerald-100 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400 mb-3.5">
          <CheckCircle2 className="h-6 w-6" />
        </div>

        <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
          Password reset successfully
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed max-w-sm mx-auto">
          Your account credentials have been securely updated and all previous sessions have been revoked. You can now sign in with your new password.
        </p>

        <div className="mt-6">
          <Button
            type="button"
            variant="primary"
            size="md"
            onClick={() => navigate("/auth/login", { replace: true })}
            className="w-full flex items-center justify-center gap-2"
          >
            <span>Go to Login</span>
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  // State D: Valid Form
  return (
    <div className="w-full max-w-md mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link
          to="/auth/login"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 transition-colors mb-3 cursor-pointer"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Sign in</span>
        </Link>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          Reset your password
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Create a secure, resilient password for your PeopleOS account
        </p>
      </div>

      <Form onSubmit={handleResetPassword} className="space-y-4">
        {/* New Password Field */}
        <FormField>
          <Input
            id="reset-new-password"
            type="password"
            isPasswordToggle
            label="New Password"
            required
            autoFocus
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter new password"
            leftIcon={<Lock className="h-4 w-4" />}
            disabled={isSubmitting}
          />
        </FormField>

        {/* Live Password Strength Meter */}
        {password.length > 0 && (
          <div className="rounded-md border border-slate-200 bg-slate-50/50 p-3 dark:border-slate-800 dark:bg-slate-900/50 space-y-2.5">
            <PasswordStrength strength={strength} />
            <PasswordRequirements rules={strength.rules} policy={passwordPolicy} />
          </div>
        )}

        {/* Confirm Password Field */}
        <FormField>
          <Input
            id="reset-confirm-password"
            type="password"
            isPasswordToggle
            label="Confirm Password"
            required
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Re-enter new password"
            leftIcon={<Lock className="h-4 w-4" />}
            disabled={isSubmitting}
            error={
              confirmPassword.length > 0 && !passwordsMatch
                ? "Passwords do not match"
                : undefined
            }
          />
        </FormField>

        {/* Password Match Confirmation Status */}
        {passwordsMatch && (
          <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400 pl-0.5">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>Passwords match</span>
          </div>
        )}

        {/* Action Button */}
        <Button
          type="submit"
          variant="primary"
          size="md"
          className="w-full mt-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
          isLoading={isSubmitting}
          disabled={!isFormValid || isSubmitting}
        >
          <span>{isSubmitting ? "Resetting Password..." : "Reset Password"}</span>
          {!isSubmitting && <ArrowRight className="h-4 w-4" />}
        </Button>
      </Form>

      {/* Security Footer Notice */}
      <div className="mt-8 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
        <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
        <span>Argon2id/bcrypt cryptographically protected • TLS 1.3</span>
      </div>
    </div>
  );
}
