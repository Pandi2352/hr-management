import { Check, X } from "lucide-react";
import { cn } from "../../../utils/cn";
import {
  DEFAULT_PASSWORD_POLICY,
  type PasswordPolicy,
  type PasswordValidationRules,
} from "../validation/password.validation";

interface PasswordRequirementsProps {
  rules: PasswordValidationRules;
  policy?: PasswordPolicy;
  className?: string;
}

export function PasswordRequirements({ rules, policy = DEFAULT_PASSWORD_POLICY, className }: PasswordRequirementsProps) {
  const requirementItems = [
    { key: "minLength", label: `${policy.passwordMinLength}+ characters`, met: rules.minLength, active: true },
    { key: "hasUppercase", label: "Uppercase letter", met: rules.hasUppercase, active: policy.passwordRequireUppercase },
    { key: "hasLowercase", label: "Lowercase letter", met: rules.hasLowercase, active: policy.passwordRequireLowercase },
    { key: "hasNumber", label: "Number", met: rules.hasNumber, active: policy.passwordRequireNumbers },
    { key: "hasSymbol", label: "Special symbol (!@#$%^&*)", met: rules.hasSymbol, active: policy.passwordRequireSymbols },
  ].filter((item) => item.active);

  return (
    <div className={cn("space-y-1.5 pt-1", className)}>
      <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
        Password requirements:
      </p>
      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-xs">
        {requirementItems.map((item) => (
          <li
            key={item.key}
            className={cn(
              "flex items-center gap-1.5 text-[11px] transition-colors",
              item.met
                ? "text-emerald-600 dark:text-emerald-400 font-medium"
                : "text-slate-400 dark:text-slate-500"
            )}
          >
            {item.met ? (
              <Check className="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <X className="h-3 w-3 shrink-0 text-slate-300 dark:text-slate-600" />
            )}
            <span>{item.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
