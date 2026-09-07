export interface PasswordPolicyLike {
  passwordMinLength: number;
  passwordRequireUppercase: boolean;
  passwordRequireLowercase: boolean;
  passwordRequireNumbers: boolean;
  passwordRequireSymbols: boolean;
}

/**
 * Fallback values used whenever no SecurityPolicy document exists yet
 * (fresh installs before UsersService.onModuleInit seeds one). Mirrors the
 * SecurityPolicy schema's own @Prop defaults.
 */
export const DEFAULT_SECURITY_POLICY = {
  passwordMinLength: 8,
  passwordRequireUppercase: true,
  passwordRequireLowercase: true,
  passwordRequireNumbers: true,
  passwordRequireSymbols: true,
  sessionTimeoutMinutes: 60,
  maxFailedAttempts: 5,
  lockoutDurationMinutes: 30,
};

/**
 * Validates a candidate password against the organization's live SecurityPolicy.
 * Returns a list of human-readable violation messages (empty = valid).
 */
export function validatePasswordAgainstPolicy(
  password: string,
  policy: PasswordPolicyLike,
): string[] {
  const violations: string[] = [];

  if (!password || password.length < policy.passwordMinLength) {
    violations.push(`Password must be at least ${policy.passwordMinLength} characters long`);
  }
  if (policy.passwordRequireUppercase && !/[A-Z]/.test(password)) {
    violations.push('Password must contain at least one uppercase letter');
  }
  if (policy.passwordRequireLowercase && !/[a-z]/.test(password)) {
    violations.push('Password must contain at least one lowercase letter');
  }
  if (policy.passwordRequireNumbers && !/[0-9]/.test(password)) {
    violations.push('Password must contain at least one number');
  }
  if (policy.passwordRequireSymbols && !/[^A-Za-z0-9]/.test(password)) {
    violations.push('Password must contain at least one special character');
  }

  return violations;
}
