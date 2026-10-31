import { Role } from "@prisma/client";
import { getSessionUser, SessionUser } from "./auth";

export class UnauthorizedError extends Error {
  constructor(message = "Authentication required") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends Error {
  constructor(message = "You do not have permission to access this resource") {
    super(message);
    this.name = "ForbiddenError";
  }
}

/**
 * Ensures a valid session exists. Throws UnauthorizedError if not logged in.
 */
export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) {
    throw new UnauthorizedError();
  }
  return user;
}

/**
 * Enforces role-based authorization. Throws ForbiddenError if user role not allowed.
 */
export async function requireRole(allowedRoles: Role[]): Promise<SessionUser> {
  const user = await requireUser();
  if (!allowedRoles.includes(user.role)) {
    throw new ForbiddenError(
      `Access denied. Required role: [${allowedRoles.join(", ")}], but current role is ${user.role}`
    );
  }
  return user;
}
