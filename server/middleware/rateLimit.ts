
import { rateLimit } from "express-rate-limit";

/**
 * Authentication rate limiter.
 *
 * Protects login/register/password-reset endpoints
 * from excessive repeated requests.
 *
 * Skips rate limiting for localhost/127.0.0.1 during development.
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,

  // Allow 10 authentication attempts per IP
  // within the 15-minute window.
  limit: 10,

  // Skip rate limiting for localhost in development
  skip: (req) => {
    const isLocalhost = 
      req.ip === '127.0.0.1' || 
      req.ip === '::1' ||
      req.ip === 'localhost' ||
      process.env.NODE_ENV !== 'production';
    return isLocalhost;
  },

  standardHeaders: "draft-8",
  legacyHeaders: false,

  message: {
    success: false,
    message:
      "Too many authentication attempts. Please try again later.",
  },

  statusCode: 429,

  handler: (_request, response) => {
    response.status(429).json({
      success: false,
      message:
        "Too many authentication attempts. Please try again later.",
    });
  },
});

/**
 * General API limiter.
 *
 * This is intentionally more generous than the
 * authentication limiter.
 */
export const generalApiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,

  limit: 300,

  standardHeaders: "draft-8",
  legacyHeaders: false,

  message: {
    success: false,
    message:
      "Too many requests. Please try again later.",
  },

  statusCode: 429,
});

export default authRateLimiter;
