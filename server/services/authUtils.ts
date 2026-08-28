import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export type AuthRole = "ADMIN" | "PHARMACIST" | "CLINICIAN";

export interface JwtPayload {
  sub: string;
  email: string;
  role: AuthRole;
  iat?: number;
  exp?: number;
}

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Generate an access token
 */
export function generateAccessToken(payload: JwtPayload): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET environment variable is not set");
  }
  return jwt.sign(payload, secret, { expiresIn: "15m" });
}

/**
 * Generate a refresh token
 */
export function generateRefreshToken(payload: JwtPayload): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET environment variable is not set");
  }
  return jwt.sign(payload, secret, { expiresIn: "7d" });
}

/**
 * Verify an access token
 */
export function verifyAccessToken(token: string): JwtPayload {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET environment variable is not set");
  }
  return jwt.verify(token, secret) as JwtPayload;
}

/**
 * Verify a refresh token
 */
export function verifyRefreshToken(token: string): JwtPayload {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET environment variable is not set");
  }
  return jwt.verify(token, secret) as JwtPayload;
}
