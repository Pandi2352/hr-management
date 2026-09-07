import React, { useState, useEffect } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import {
  Lock,
  ArrowRight,
  AlertTriangle,
  Loader2,
  ShieldCheck,
  Mail,
  Building2,
  CheckCircle2,
} from "lucide-react";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Form, FormField } from "../../components/forms";
import { useToast } from "../../components/ui/toast";
import { invitationApi, type InvitationPreview } from "./api/invitation.api";
import { authApi } from "./api/auth.api";
import { PasswordStrength } from "./components/PasswordStrength";
import { PasswordRequirements } from "./components/PasswordRequirements";
import {
  calculatePasswordStrength,
  DEFAULT_PASSWORD_POLICY,
  type PasswordPolicy,
} from "./validation/password.validation";
import { useAuth } from "./context/AuthContext";

type PageState = "VALIDATING" | "VALID" | "INVALID" | "EXPIRED" | "ACCEPTED" | "SUCCESS";

export function AcceptInvitePage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const navigate = useNavigate();
  const toast = useToast();
  const { setSession } = useAuth();

  const [pageState, setPageState] = useState<PageState>("VALIDATING");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [invite, setInvite] = useState<InvitationPreview | null>(null);

  const [password, setPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [acceptTerms, setAcceptTerms] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [passwordPolicy, setPasswordPolicy] = useState<PasswordPolicy>(DEFAULT_PASSWORD_POLICY);

  useEffect(() => {
    authApi.getPasswordPolicy().then(setPasswordPolicy).catch(() => {
      // Keep default policy if the live one can't be fetched
    });
  }, []);

  const strength = calculatePasswordStrength(password, passwordPolicy);
  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword;
  const isFormValid = strength.isValid && passwordsMatch && acceptTerms;

  useEffect(() => {
    if (!token || token.trim().length < 16) {
      setPageState("INVALID");
      setErrorMessage("This invitation link is missing or invalid.");
      return;
    }

    let isMounted = true;
    const validate = async () => {
      try {
        const preview = await invitationApi.validate(token);
        if (isMounted) {
          setInvite(preview);
          setPageState("VALID");
        }
      } catch (err: any) {
        if (!isMounted) return;
        const status = err.response?.status;
        const msg = err.response?.data?.message || "This invitation link is invalid or has expired.";

        if (status === 410) {
          setPageState("ACCEPTED");
          setErrorMessage(msg);
        } else if (msg.toLowerCase().includes("expired")) {
          setPageState("EXPIRED");
          setErrorMessage(msg);
        } else {
          setPageState("INVALID");
          setErrorMessage(msg);
        }
      }
    };

    validate();
    return () => {
      isMounted = false;
    };
  }, [token]);

  const handleAccept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid || !token || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const result = await invitationApi.accept({ token, password, acceptTerms });
      setSession(result.user, result.accessToken);
      setPageState("SUCCESS");
      toast.success("Your account is now active", "Welcome to PeopleOS", 4000);
      setTimeout(() => navigate("/", { replace: true }), 1200);
    } catch (err: any) {
      const msg = err.response?.data?.message || "Failed to accept invitation. Please try again.";
      toast.error(msg);
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (pageState === "VALIDATING") {
    return (
      <div className="w-full max-w-md mx-auto text-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600 mx-auto mb-3" />
        <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
          Verifying your invitation...
        </h3>
        <p className="text-xs text-slate-500 mt-1">Validating token authenticity and checking expiration</p>
      </div>
    );
  }

  if (pageState === "INVALID" || pageState === "EXPIRED" || pageState === "ACCEPTED") {
    const titleMap = {
      INVALID: "Invalid Invitation",
      EXPIRED: "Invitation Expired",
      ACCEPTED: "Already Accepted",
    };

    return (
      <div className="w-full max-w-md mx-auto">
        <div className="rounded-md border border-rose-200 bg-rose-50/50 p-6 dark:border-rose-900/40 dark:bg-rose-950/20 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-md bg-rose-100 text-rose-600 dark:bg-rose-900/50 dark:text-rose-400 mb-3.5">
            <AlertTriangle className="h-6 w-6" />
          </div>

          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">{titleMap[pageState]}</h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
            {errorMessage || "This invitation link is no longer valid."}
          </p>

          <div className="mt-6">
            <Link to="/auth/login" className="w-full sm:w-auto">
              <Button variant="primary" size="sm" className="w-full">
                Back to Sign in
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (pageState === "SUCCESS") {
    return (
      <div className="w-full max-w-md mx-auto text-center py-6">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-md bg-emerald-100 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400 mb-3.5">
          <CheckCircle2 className="h-6 w-6" />
        </div>

        <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
          Your account is active
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed max-w-sm mx-auto">
          Taking you to your dashboard...
        </p>
      </div>
    );
  }

  // pageState === "VALID"
  return (
    <div className="w-full max-w-md mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          You've been invited to PeopleOS
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          {invite?.invitedByName ? `Invited by ${invite.invitedByName}` : "Set your password to activate your account"}
        </p>
      </div>

      {/* Invitation summary */}
      {invite && (
        <div className="mb-5 rounded-md border border-slate-200 bg-slate-50/70 dark:border-slate-800 dark:bg-slate-900/50 p-4 space-y-2">
          <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
            <Mail className="h-3.5 w-3.5 text-slate-400" />
            <span className="font-medium">{invite.email}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
            <Building2 className="h-3.5 w-3.5 text-slate-400" />
            <span>
              {invite.firstName} {invite.lastName} &middot; {invite.roles.join(', ') || 'Administrator'}
            </span>
          </div>
        </div>
      )}

      <Form onSubmit={handleAccept} className="space-y-4">
        <FormField>
          <Input
            id="invite-password"
            type="password"
            isPasswordToggle
            label="Create Password"
            required
            autoFocus
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Choose a secure password"
            leftIcon={<Lock className="h-4 w-4" />}
            disabled={isSubmitting}
          />
        </FormField>

        {password.length > 0 && (
          <div className="rounded-md border border-slate-200 bg-slate-50/50 p-3 dark:border-slate-800 dark:bg-slate-900/50 space-y-2.5">
            <PasswordStrength strength={strength} />
            <PasswordRequirements rules={strength.rules} policy={passwordPolicy} />
          </div>
        )}

        <FormField>
          <Input
            id="invite-confirm-password"
            type="password"
            isPasswordToggle
            label="Confirm Password"
            required
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Re-enter your password"
            leftIcon={<Lock className="h-4 w-4" />}
            disabled={isSubmitting}
            error={confirmPassword.length > 0 && !passwordsMatch ? "Passwords do not match" : undefined}
          />
        </FormField>

        <label className="flex items-start gap-2 text-[11px] text-slate-600 dark:text-slate-400 cursor-pointer select-none pt-1">
          <input
            type="checkbox"
            checked={acceptTerms}
            onChange={(e) => setAcceptTerms(e.target.checked)}
            className="mt-0.5 h-3.5 w-3.5 rounded border-slate-300 accent-[#524b6e] cursor-pointer"
            disabled={isSubmitting}
          />
          <span>
            I acknowledge and accept the PeopleOS Terms of Service and organization Security Policy.
          </span>
        </label>

        <Button
          type="submit"
          variant="primary"
          size="md"
          className="w-full mt-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
          isLoading={isSubmitting}
          disabled={!isFormValid || isSubmitting}
        >
          <span>{isSubmitting ? "Activating Account..." : "Accept Invitation & Sign In"}</span>
          {!isSubmitting && <ArrowRight className="h-4 w-4" />}
        </Button>
      </Form>

      <div className="mt-8 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
        <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
        <span>bcrypt cryptographically protected • TLS 1.3</span>
      </div>
    </div>
  );
}
