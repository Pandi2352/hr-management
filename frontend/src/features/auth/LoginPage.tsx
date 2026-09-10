import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Mail, Lock, ArrowRight, KeyRound, UserRound } from "lucide-react";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Alert } from "../../components/ui/Alert";
import { Form, FormField, FormLabel } from "../../components/forms";
import { useToast } from "../../components/ui/toast";
import { useAuth } from "./context/AuthContext";
import { validationRules, VALIDATION_MESSAGES } from "../../validation/rules";
import { storage } from "../../utils/storage";

interface FormErrors {
  email?: string;
  password?: string;
  general?: string;
  isLocked?: boolean;
}

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const toast = useToast();

  // Form state
  const [email, setEmail] = useState<string>(() => {
    return storage.get<string>("peopleos_remembered_email", "");
  });
  const [password, setPassword] = useState<string>("");
  const [rememberMe, setRememberMe] = useState<boolean>(() => {
    return storage.get<boolean>("peopleos_remember_me", false);
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errors, setErrors] = useState<FormErrors>({});

  // Client-side validation
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    const trimmedEmail = email.trim();

    if (!validationRules.isNonEmpty(trimmedEmail)) {
      newErrors.email = VALIDATION_MESSAGES.REQUIRED("Work Email");
    } else if (!validationRules.isValidEmail(trimmedEmail)) {
      newErrors.email = VALIDATION_MESSAGES.INVALID_EMAIL;
    }

    if (!validationRules.isNonEmpty(password)) {
      newErrors.password = VALIDATION_MESSAGES.REQUIRED("Password");
    } else if (!validationRules.isMinLength(password, 6)) {
      newErrors.password = VALIDATION_MESSAGES.MIN_LENGTH("Password", 6);
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    if (errors.email) {
      setErrors((prev) => ({ ...prev, email: undefined, general: undefined }));
    }
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
    if (errors.password) {
      setErrors((prev) => ({ ...prev, password: undefined, general: undefined }));
    }
  };

  /*
   * Seeded accounts, kept in step with backend/src/seed/seed.ts. Nothing
   * enforces that at compile time, so changing a credential there means
   * changing it here.
   *
   * Two are offered because they exercise different halves of the product: the
   * super admin has no employee record and so cannot use anything keyed on one
   * (Atrium, my attendance, my leave), while the employee is a real person in
   * the roster and can.
   */
  const SEED_ACCOUNTS = [
    {
      id: "admin",
      email: "systemuser@gmail.com",
      password: "Test@123",
      label: "Super Admin",
      hint: "Every permission. No employee record, so no Atrium profile.",
      action: "Fill Admin",
      icon: KeyRound,
    },
    {
      id: "employee",
      email: "uttam.kumar@peopleos.com",
      password: "Employee@12345",
      label: "Standard Employee",
      hint: "A real person in the roster. Use this for Atrium and self-service.",
      action: "Fill User",
      icon: UserRound,
    },
  ];

  const handleQuickFill = (account: { email: string; password: string }) => {
    setEmail(account.email);
    setPassword(account.password);
    setErrors({});
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    if (!validateForm()) return;

    setIsLoading(true);
    setErrors({});

    try {
      const user = await login({
        email: email.trim().toLowerCase(),
        password,
        rememberMe,
      });

      toast.success(`Welcome back, ${user.name || user.firstName}!`, "Login Successful", 4000);

      const from = (location.state as any)?.from?.pathname || "/";
      navigate(from, { replace: true });
    } catch (err: any) {
      const status = err.response?.status;
      const errorData = err.response?.data;
      const message =
        errorData?.message || "Unable to connect to server. Please check your network.";

      setPassword("");

      if (status === 400) {
        setErrors({ general: "Invalid input. Please verify your email and password." });
      } else if (status === 401) {
        setErrors({ general: "Invalid email or password. Please try again." });
      } else if (status === 403) {
        setErrors({
          general: "Your account is currently suspended or inactive. Please contact HR.",
        });
      } else if (status === 423) {
        setErrors({
          general: message,
          isLocked: true,
        });
      } else if (status === 429) {
        setErrors({
          general: "Too many login attempts. Please wait a few moments before retrying.",
        });
      } else if (status >= 500) {
        setErrors({ general: "Internal server error occurred. Please try again shortly." });
      } else {
        setErrors({ general: message });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const searchParams = new URLSearchParams(location.search);
  const isSessionExpired = searchParams.get("sessionExpired") === "true";

  return (
    <div className="w-full max-w-sm mx-auto">
      {/* Session Expired Banner */}
      {isSessionExpired && (
        <div className="mb-4 p-3 rounded-md bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5 dark:bg-amber-950/40 dark:border-amber-900/60 dark:text-amber-200">
          <Lock className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Session Expired</p>
            <p className="mt-0.5 text-amber-700 dark:text-amber-300">
              Your security session expired. Please log in again to resume your work.
            </p>
          </div>
        </div>
      )}

      {/* Title Header with Modern Accent */}
      <div className="mb-6">
        <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-violet-600 bg-violet-50 border border-violet-100 rounded-md px-2 py-0.5 mb-2">
          <span>Enterprise Portal</span>
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">Sign in</h2>
        <p className="text-xs text-slate-500 mt-1">
          Authenticate with your organization account
        </p>
      </div>

      {/* Global Error Alert */}
      {errors.general && (
        <Alert
          variant={errors.isLocked ? "warning" : "error"}
          title={errors.isLocked ? "Account Locked" : "Authentication Error"}
          className="mb-5"
          onClose={() => setErrors((prev) => ({ ...prev, general: undefined }))}
        >
          {errors.general}
        </Alert>
      )}

      {/* Form */}
      <Form onSubmit={handleSubmit} className="space-y-4">
        <FormField>
          <Input
            id="login-email"
            type="email"
            label="Work Email"
            required
            autoComplete="email"
            autoFocus
            value={email}
            onChange={handleEmailChange}
            error={errors.email}
            placeholder="name@company.com"
            leftIcon={<Mail className="h-4 w-4" />}
            disabled={isLoading}
          />
        </FormField>

        <FormField>
          <div className="flex items-center justify-between mb-1">
            <FormLabel htmlFor="login-password" required className="mb-0 text-slate-700">
              Password
            </FormLabel>
            <Link
              to="/auth/forgot-password"
              className="text-xs font-medium text-violet-600 hover:text-violet-500 transition-colors"
              tabIndex={3}
            >
              Forgot password?
            </Link>
          </div>

          <Input
            id="login-password"
            type="password"
            isPasswordToggle
            required
            autoComplete="current-password"
            value={password}
            onChange={handlePasswordChange}
            error={errors.password}
            placeholder="••••••••••••"
            leftIcon={<Lock className="h-4 w-4" />}
            disabled={isLoading}
          />
        </FormField>

        {/* Remember Me */}
        <div className="flex items-center justify-between pt-1">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              disabled={isLoading}
              className="h-4 w-4 rounded-md border-slate-300 bg-white text-violet-600 focus:ring-violet-500"
            />
            <span className="text-xs text-slate-600">Remember me for 30 days</span>
          </label>
        </div>

        {/* Primary Action Button */}
        <Button
          type="submit"
          variant="primary"
          size="md"
          className="w-full mt-2 bg-violet-600 hover:bg-violet-700 text-white font-semibold py-2.5 flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
          isLoading={isLoading}
          disabled={isLoading}
        >
          <span>{isLoading ? "Authenticating..." : "Sign in to Dashboard"}</span>
          {!isLoading && <ArrowRight className="h-4 w-4" />}
        </Button>
      </Form>

      {/* Quick-fill for the seeded accounts */}
      <div className="mt-6 overflow-hidden rounded-md border border-violet-100 bg-violet-50/60">
        <div className="border-b border-violet-100/70 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.08em] text-violet-700/80">
          Seeded accounts
        </div>

        <div className="divide-y divide-violet-100/70">
          {SEED_ACCOUNTS.map((account) => {
            const Icon = account.icon;
            return (
              <div key={account.id} className="flex items-center gap-3 px-3 py-2">
                <Icon className="h-4 w-4 shrink-0 text-violet-600" />

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate text-xs font-semibold text-violet-900">
                      {account.email}
                    </span>
                    <span className="shrink-0 rounded-md bg-white px-1.5 py-px text-[9.5px] font-bold uppercase tracking-wide text-violet-700">
                      {account.label}
                    </span>
                  </div>
                  <p className="truncate text-[10.5px] text-violet-700/70">{account.hint}</p>
                </div>

                <button
                  type="button"
                  onClick={() => handleQuickFill(account)}
                  className="shrink-0 rounded-md border border-violet-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-violet-700 transition-colors hover:bg-violet-50 cursor-pointer"
                >
                  {account.action}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Careers & Jobs Link for Public Visitors */}
      <div className="mt-5 text-center">
        <Link
          to="/careers"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-violet-600 dark:text-violet-400 hover:text-violet-700 hover:underline transition-colors"
        >
          <span>Looking to join our team? Explore Open Careers & Roles</span>
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}
