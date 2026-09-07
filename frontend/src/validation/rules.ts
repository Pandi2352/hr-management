export const VALIDATION_MESSAGES = {
  REQUIRED: (field: string) => `${field} is required`,
  INVALID_EMAIL: "Please enter a valid work email address",
  MIN_LENGTH: (field: string, min: number) => `${field} must be at least ${min} characters`,
  MAX_LENGTH: (field: string, max: number) => `${field} cannot exceed ${max} characters`,
  PASSWORD_MATCH: "Passwords do not match",
  PASSWORD_COMPLEXITY:
    "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character",
};

export const validationRules = {
  isValidEmail(email: string): boolean {
    if (!email || typeof email !== "string") return false;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  },

  isNonEmpty(value: string): boolean {
    return !!value && value.trim().length > 0;
  },

  isMinLength(value: string, min: number): boolean {
    return !!value && value.length >= min;
  },

  isMaxLength(value: string, max: number): boolean {
    return !value || value.length <= max;
  },

  isStrongPassword(password: string): boolean {
    if (!password || password.length < 8) return false;
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecial = /[^A-Za-z0-9]/.test(password);
    return hasUpper && hasLower && hasNumber && hasSpecial;
  },
};
