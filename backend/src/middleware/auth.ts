import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export type Role = "district_admin" | "block_officer" | "field_inspector" | "emergency_responder" | "public_reporter";

export type AuthUser = { id: string; name: string; role: Role };

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";

export function signToken(user: AuthUser): string {
  return jwt.sign(user, JWT_SECRET, { expiresIn: (process.env.JWT_EXPIRES_IN as any) || "8h" });
}

/** Verifies the JWT (from the Authorization header or an httpOnly cookie) and attaches req.user. */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : req.cookies?.token;
  if (!token) return res.status(401).json({ error: "Authentication required." });
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthUser;
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired session." });
  }
}

/** Restricts a route to a set of roles. Call after requireAuth. */
export function requireRole(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: "Authentication required." });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: "You do not have permission to perform this action." });
    }
    next();
  };
}

/** Attaches req.user if a valid token is present, but never blocks the request. Used for public endpoints that behave differently when authenticated. */
export function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : req.cookies?.token;
  if (token) {
    try {
      req.user = jwt.verify(token, JWT_SECRET) as AuthUser;
    } catch {
      /* ignore invalid token on optional routes */
    }
  }
  next();
}
