/** Mirrors the backend's public password-policy summary (AuthService.getPasswordPolicySummary). */
export interface PasswordPolicy {
  passwordMinLength: number;
  passwordRequireUppercase: boolean;
  passwordRequireLowercase: boolean;
  passwordRequireNumbers: boolean;
  passwordRequireSymbols: boolean;
}

/** Used until the live policy has loaded, or if it fails to load. */
export const DEFAULT_PASSWORD_POLICY: PasswordPolicy = {
  passwordMinLength: 8,
  passwordRequireUppercase: true,
  passwordRequireLowercase: true,
  passwordRequireNumbers: true,
  passwordRequireSymbols: true,
};

export interface PasswordValidationRules {
  minLength: boolean;
  hasUppercase: boolean;
  hasLowercase: boolean;
  hasNumber: boolean;
  hasSymbol: boolean;
}

export type PasswordStrengthLevel = "very-weak" | "weak" | "fair" | "good" | "strong";

export interface PasswordStrengthResult {
  score: number; // 0 to 5
  level: PasswordStrengthLevel;
  label: string;
  percent: number; // 0 to 100
  color: string;
  rules: PasswordValidationRules;
  isValid: boolean;
}

/**
 * Rules not required by the policy are treated as already "met" so they
 * neither block validity nor render as unmet in the requirements checklist.
 */
export function validatePasswordRules(
  password: string,
  policy: PasswordPolicy = DEFAULT_PASSWORD_POLICY
): PasswordValidationRules {
  return {
    minLength: password.length >= policy.passwordMinLength,
    hasUppercase: !policy.passwordRequireUppercase || /[A-Z]/.test(password),
    hasLowercase: !policy.passwordRequireLowercase || /[a-z]/.test(password),
    hasNumber: !policy.passwordRequireNumbers || /[0-9]/.test(password),
    hasSymbol: !policy.passwordRequireSymbols || /[^A-Za-z0-9]/.test(password),
  };
}

export function calculatePasswordStrength(
  password: string,
  policy: PasswordPolicy = DEFAULT_PASSWORD_POLICY
): PasswordStrengthResult {
  if (!password) {
    return {
      score: 0,
      level: "very-weak",
      label: "Very Weak",
      percent: 0,
      color: "bg-slate-300 dark:bg-slate-700",
      rules: {
        minLength: false,
        hasUppercase: !policy.passwordRequireUppercase,
        hasLowercase: !policy.passwordRequireLowercase,
        hasNumber: !policy.passwordRequireNumbers,
        hasSymbol: !policy.passwordRequireSymbols,
      },
      isValid: false,
    };
  }

  const rules = validatePasswordRules(password, policy);
  let score = 0;
  if (rules.minLength) score += 1;
  if (rules.hasUppercase) score += 1;
  if (rules.hasLowercase) score += 1;
  if (rules.hasNumber) score += 1;
  if (rules.hasSymbol) score += 1;

  // Extra boost for lengthy passwords
  if (password.length >= 12 && score >= 4) {
    score = 5;
  }

  const levelMap: Record<number, { level: PasswordStrengthLevel; label: string; color: string }> = {
    0: { level: "very-weak", label: "Very Weak", color: "bg-rose-500" },
    1: { level: "weak", label: "Weak", color: "bg-rose-500" },
    2: { level: "fair", label: "Fair", color: "bg-amber-500" },
    3: { level: "good", label: "Good", color: "bg-amber-500" },
    4: { level: "strong", label: "Strong", color: "bg-emerald-500" },
    5: { level: "strong", label: "Very Strong", color: "bg-emerald-600" },
  };

  const { level, label, color } = levelMap[score] || levelMap[0];
  const percent = Math.min(100, Math.round((score / 5) * 100));
  const isValid = rules.minLength && rules.hasUppercase && rules.hasLowercase && rules.hasNumber && rules.hasSymbol;

  return {
    score,
    level,
    label,
    percent,
    color,
    rules,
    isValid,
  };
}
