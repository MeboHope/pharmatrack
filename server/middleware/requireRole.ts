import type {
NextFunction,
Response,
} from "express";

import type {
AuthenticatedRequest,
UserRole,
} from "./auth";

export const requireRole = (
...allowedRoles: UserRole[]
) => {
return (
req: AuthenticatedRequest,
res: Response,
next: NextFunction,
) => {
if (!req.user) {
return res.status(401).json({
success: false,
message: "Authentication required.",
});
}


if (
  !allowedRoles.includes(
    req.user.role,
  )
) {
  return res.status(403).json({
    success: false,
    message:
      "You do not have permission to perform this action.",
  });
}

return next();


};
};
