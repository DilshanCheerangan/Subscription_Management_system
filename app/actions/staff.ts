"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { hashPassword } from "@/lib/auth";
import { passwordSchema } from "@/lib/validators/password";

const createStaffSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  temporaryPassword: passwordSchema,
});

export async function getStaffListAction() {
  await requireRole(["ADMIN"]);

  return prisma.user.findMany({
    where: {
      role: { in: ["ADMIN", "STAFF"] },
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function createStaffAction(data: unknown) {
  await requireRole(["ADMIN"]);

  const parsed = createStaffSchema.safeParse(data);
  if (!parsed.success) {
    return {
      success: false,
      message: "Validation failed",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  const { name, email, temporaryPassword } = parsed.data;
  const normalizedEmail = email.toLowerCase().trim();

  const existing = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (existing) {
    return {
      success: false,
      message: "A user with this email address already exists.",
      errors: { email: ["Email already in use"] },
    };
  }

  const passwordHash = await hashPassword(temporaryPassword);

  const newStaff = await prisma.user.create({
    data: {
      name,
      email: normalizedEmail,
      passwordHash,
      role: "STAFF",
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
    },
  });

  return {
    success: true,
    message: `Staff member ${newStaff.name} created successfully.`,
    data: newStaff,
  };
}
