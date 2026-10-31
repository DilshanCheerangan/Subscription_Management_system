import { z } from "zod";

export interface PasswordRuleResult {
  label: string;
  met: boolean;
}

export function checkPasswordRules(password: string): PasswordRuleResult[] {
  return [
    {
      label: "More than 8 characters (minimum 9)",
      met: password.length >= 9,
    },
    {
      label: "At least one uppercase letter (A-Z)",
      met: /[A-Z]/.test(password),
    },
    {
      label: "At least one lowercase letter (a-z)",
      met: /[a-z]/.test(password),
    },
    {
      label: "At least one special character (!@#$%^&*...)",
      met: /[^A-Za-z0-9]/.test(password),
    },
  ];
}

export function isPasswordValid(password: string): boolean {
  return checkPasswordRules(password).every((rule) => rule.met);
}

/**
 * Shared Zod password validator enforcing MASTER.md accounts rule:
 * Password: more than 8 characters (min 9), at least one uppercase, one lowercase, one special character.
 */
export const passwordSchema = z
  .string()
  .min(9, "Password must be more than 8 characters (minimum 9 characters)")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character");
