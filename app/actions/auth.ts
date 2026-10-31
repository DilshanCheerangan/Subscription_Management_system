"use server";

import crypto from "crypto";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword, signJwt, setAuthCookie, clearAuthCookie } from "@/lib/auth";
import { passwordSchema } from "@/lib/validators/password";
import { sendPasswordResetEmail } from "@/lib/mail";

const signupSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: passwordSchema,
});

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1, "Reset token is required"),
  password: passwordSchema,
});

export interface ActionResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: Record<string, string[]>;
}

export async function signupAction(data: unknown): Promise<ActionResponse<{ role: string }>> {
  const parsed = signupSchema.safeParse(data);
  if (!parsed.success) {
    return {
      success: false,
      message: "Validation failed",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  const { name, email, password } = parsed.data;
  const normalizedEmail = email.toLowerCase().trim();

  // Check unique email
  const existingUser = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (existingUser) {
    return {
      success: false,
      message: "An account with this email already exists",
      errors: { email: ["An account with this email already exists"] },
    };
  }

  const passwordHash = await hashPassword(password);

  // Public signup creates CUSTOMER only per MASTER.md section 4
  const newUser = await prisma.user.create({
    data: {
      name,
      email: normalizedEmail,
      passwordHash,
      role: "CUSTOMER",
    },
  });

  const token = await signJwt({
    userId: newUser.id,
    email: newUser.email,
    role: newUser.role,
    name: newUser.name,
  });

  await setAuthCookie(token);

  return {
    success: true,
    message: "Account created successfully",
    data: { role: newUser.role },
  };
}

export async function loginAction(data: unknown): Promise<ActionResponse<{ role: string }>> {
  const parsed = loginSchema.safeParse(data);
  if (!parsed.success) {
    return {
      success: false,
      message: "Invalid email or password",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  const { email, password } = parsed.data;
  const normalizedEmail = email.toLowerCase().trim();

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (!user) {
    return {
      success: false,
      message: "Invalid email or password",
    };
  }

  const passwordValid = await verifyPassword(password, user.passwordHash);
  if (!passwordValid) {
    return {
      success: false,
      message: "Invalid email or password",
    };
  }

  const token = await signJwt({
    userId: user.id,
    email: user.email,
    role: user.role,
    name: user.name,
  });

  await setAuthCookie(token);

  return {
    success: true,
    message: "Logged in successfully",
    data: { role: user.role },
  };
}

export async function logoutAction(): Promise<ActionResponse> {
  await clearAuthCookie();
  return { success: true };
}

export async function forgotPasswordAction(email: string): Promise<ActionResponse> {
  const normalizedEmail = email.toLowerCase().trim();
  const genericMessage =
    "If an account with that email exists, we have sent a password reset link to it.";

  if (!normalizedEmail || !normalizedEmail.includes("@")) {
    return { success: true, message: genericMessage };
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (user) {
      // Generate secure 32-byte hex token and store SHA-256 hash
      const rawToken = crypto.randomBytes(32).toString("hex");
      const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

      await prisma.passwordResetToken.create({
        data: {
          tokenHash,
          expiresAt,
          userId: user.id,
        },
      });

      const appUrl = process.env.APP_URL || "http://localhost:3000";
      const resetUrl = `${appUrl}/reset-password/${rawToken}`;

      await sendPasswordResetEmail(user.email, resetUrl);
    }
  } catch (error) {
    console.error("[forgotPasswordAction] Error:", error);
  }

  // Always respond with the same message whether or not email exists per MASTER.md
  return {
    success: true,
    message: genericMessage,
  };
}

export async function resetPasswordAction(data: unknown): Promise<ActionResponse> {
  const parsed = resetPasswordSchema.safeParse(data);
  if (!parsed.success) {
    return {
      success: false,
      message: "Password does not meet the security requirements",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  const { token, password } = parsed.data;
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

  const resetRecord = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (!resetRecord || resetRecord.usedAt !== null || resetRecord.expiresAt < new Date()) {
    return {
      success: false,
      message: "This password reset link is invalid or has expired.",
    };
  }

  const newHash = await hashPassword(password);

  // Update user password and mark token as used in a transaction
  await prisma.$transaction([
    prisma.user.update({
      where: { id: resetRecord.userId },
      data: { passwordHash: newHash },
    }),
    prisma.passwordResetToken.update({
      where: { id: resetRecord.id },
      data: { usedAt: new Date() },
    }),
  ]);

  return {
    success: true,
    message: "Password has been successfully updated. You can now log in.",
  };
}
