
import {
  hashPassword,
  verifyPassword,
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  type JwtPayload,
  type AuthRole,
} from "./authUtils";

export type AuthRole = AuthRole;

interface BackendAuthUser {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  role: AuthRole;
  isVerified: boolean;
  createdAt?: string;
}

interface LoginResponse {
  user: BackendAuthUser;
  accessToken: string;
  refreshToken: string;
}

export const authService = {
  // Server-side utilities
  hashPassword,
  verifyPassword,
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,

  /**
   * Login using email and password
   */
  async login(
    email: string,
    password: string,
  ): Promise<LoginResponse> {
    const { prisma } = await import("../prisma.js");
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      throw new Error("Invalid email or password");
    }

    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      throw new Error("Invalid email or password");
    }

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role as AuthRole,
    };

    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role as AuthRole,
        isVerified: user.isVerified,
        createdAt: user.createdAt?.toISOString(),
      },
      accessToken,
      refreshToken,
    };
  },

  /**
   * Register a new user
   */
  async register(input: {
    name: string;
    email: string;
    phone?: string;
    password: string;
    role?: AuthRole;
  }): Promise<LoginResponse> {
    const { prisma } = await import("../prisma.js");
    
    const existingUser = await prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
    });

    if (existingUser) {
      throw new Error("An account with this email already exists");
    }

    const passwordHash = await hashPassword(input.password);
    const role = input.role || "PHARMACIST";

    const user = await prisma.user.create({
      data: {
        name: input.name.trim(),
        email: input.email.toLowerCase(),
        phone: input.phone?.trim() || null,
        passwordHash,
        role,
        isVerified: true,
      },
    });

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role as AuthRole,
    };

    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role as AuthRole,
        isVerified: user.isVerified,
        createdAt: user.createdAt?.toISOString(),
      },
      accessToken,
      refreshToken,
    };
  },

  /**
   * Refresh access token using refresh token
   */
  async refresh(): Promise<{ accessToken: string }> {
    // This is a placeholder - the actual refresh logic should be in the route
    // which has access to the refresh token from the request body
    throw new Error("Refresh token must be provided in the request body");
  },

  /**
   * Change password for a user
   */
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const { prisma } = await import("../prisma.js");
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error("User not found");
    }

    const isValid = await verifyPassword(currentPassword, user.passwordHash);
    if (!isValid) {
      throw new Error("Current password is incorrect");
    }

    const newPasswordHash = await hashPassword(newPassword);
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newPasswordHash },
    });
  },
};

export { hashPassword, verifyPassword, generateAccessToken, generateRefreshToken, verifyAccessToken, verifyRefreshToken, type JwtPayload, type AuthRole };
export default authService;
