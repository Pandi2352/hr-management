import React, { useState, useEffect } from "react";
import { Lock, CheckCircle2, ShieldCheck, ArrowRight, KeyRound } from "lucide-react";
import { Button } from "../../../components/ui/Button";
import { Input } from "../../../components/ui/Input";
import { Alert } from "../../../components/ui/Alert";
import { Form, FormField } from "../../../components/forms";
import { useToast } from "../../../components/ui/toast";
import { authApi } from "../api/auth.api";
import { PasswordStrength } from "./PasswordStrength";
import { PasswordRequirements } from "./PasswordRequirements";
import {
  calculatePasswordStrength,
  DEFAULT_PASSWORD_POLICY,
  type PasswordPolicy,
} from "../validation/password.validation";

export function ChangePasswordTab() {
  const toast = useToast();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [passwordPolicy, setPasswordPolicy] = useState<PasswordPolicy>(DEFAULT_PASSWORD_POLICY);

  useEffect(() => {
    authApi.getPasswordPolicy().then(setPasswordPolicy).catch(() => {
      // Keep default policy if the live one can't be fetched
    });
  }, []);

  const strength = calculatePasswordStrength(newPassword, passwordPolicy);
  const passwordsMatch = confirmPassword.length > 0 && newPassword === confirmPassword;
  const isFormValid =
    currentPassword.length > 0 && strength.isValid && passwordsMatch && currentPassword !== newPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid || isLoading) return;

    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const res = await authApi.changePassword({
        currentPassword,
        newPassword,
      });

      setSuccessMessage(res.message);
      toast.success(res.message, "Password Changed", 4000);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      const msg = err.response?.data?.message || "Failed to change password. Please verify current password.";
      setError(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h3 className="text-base font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <KeyRound className="h-4 w-4 text-indigo-600" />
          <span>Security & Password Management</span>
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Ensure your PeopleOS account is using a long, random password to stay secure.
        </p>
      </div>

      {/* Success Alert */}
      {successMessage && (
        <Alert
          variant="success"
          title="Password Updated"
          onClose={() => setSuccessMessage(null)}
        >
          {successMessage}
        </Alert>
      )}

      {/* Error Alert */}
      {error && (
        <Alert
          variant="error"
          title="Update Failed"
          onClose={() => setError(null)}
        >
          {error}
        </Alert>
      )}

      <Form onSubmit={handleSubmit} className="space-y-4">
        {/* Current Password */}
        <FormField>
          <Input
            id="current-password"
            type="password"
            isPasswordToggle
            label="Current Password"
            required
            autoComplete="current-password"
            value={currentPassword}
            onChange={(e) => {
              setCurrentPassword(e.target.value);
              if (error) setError(null);
            }}
            placeholder="Enter your current password"
            leftIcon={<Lock className="h-4 w-4" />}
            disabled={isLoading}
          />
        </FormField>

        {/* New Password */}
        <FormField>
          <Input
            id="profile-new-password"
            type="password"
            isPasswordToggle
            label="New Password"
            required
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => {
              setNewPassword(e.target.value);
              if (error) setError(null);
            }}
            placeholder="Enter secure new password"
            leftIcon={<Lock className="h-4 w-4" />}
            disabled={isLoading}
            error={
              currentPassword.length > 0 && newPassword.length > 0 && currentPassword === newPassword
                ? "New password must be different from current password"
                : undefined
            }
          />
        </FormField>

        {/* Real-Time Password Strength Meter */}
        {newPassword.length > 0 && (
          <div className="rounded-md border border-slate-200 bg-slate-50/60 p-3.5 dark:border-slate-800 dark:bg-slate-900/50 space-y-3">
            <PasswordStrength strength={strength} />
            <PasswordRequirements rules={strength.rules} policy={passwordPolicy} />
          </div>
        )}

        {/* Confirm New Password */}
        <FormField>
          <Input
            id="profile-confirm-password"
            type="password"
            isPasswordToggle
            label="Confirm New Password"
            required
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Re-enter your new password"
            leftIcon={<Lock className="h-4 w-4" />}
            disabled={isLoading}
            error={
              confirmPassword.length > 0 && !passwordsMatch
                ? "Passwords do not match"
                : undefined
            }
          />
        </FormField>

        {/* Match confirmation */}
        {passwordsMatch && (
          <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400 pl-0.5">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>Passwords match</span>
          </div>
        )}

        {/* Action Button */}
        <div className="pt-2">
          <Button
            type="submit"
            variant="primary"
            size="md"
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
            isLoading={isLoading}
            disabled={!isFormValid || isLoading}
          >
            <span>{isLoading ? "Updating password..." : "Update Password"}</span>
            {!isLoading && <ArrowRight className="h-4 w-4" />}
          </Button>
        </div>
      </Form>

      {/* Security Tip Box */}
      <div className="rounded-md border border-indigo-100 bg-indigo-50/40 p-4 dark:border-indigo-900/40 dark:bg-indigo-950/20 text-xs text-indigo-950 dark:text-indigo-200 space-y-1">
        <div className="flex items-center gap-1.5 font-semibold text-indigo-900 dark:text-indigo-300">
          <ShieldCheck className="h-4 w-4 text-indigo-600" />
          <span>Security Recommendations</span>
        </div>
        <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
          Use a passphrase consisting of at least 8 characters with numbers and symbols. Avoid reusing passwords across different workplace services.
        </p>
      </div>
    </div>
  );
}
