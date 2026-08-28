import "dotenv/config";

import { prisma } from "../prisma.js";
import { hashPassword } from "../services/auth.js";

const ADMIN_NAME =
process.env.BOOTSTRAP_ADMIN_NAME;

const ADMIN_EMAIL =
process.env.BOOTSTRAP_ADMIN_EMAIL;

const ADMIN_PHONE =
process.env.BOOTSTRAP_ADMIN_PHONE;

const ADMIN_PASSWORD =
process.env.BOOTSTRAP_ADMIN_PASSWORD;

async function main() {
if (
!ADMIN_NAME ||
!ADMIN_EMAIL ||
!ADMIN_PASSWORD
) {
throw new Error(
[
"Bootstrap administrator variables are missing.",
"",
"Required:",
"BOOTSTRAP_ADMIN_NAME",
"BOOTSTRAP_ADMIN_EMAIL",
"BOOTSTRAP_ADMIN_PASSWORD",
].join("\n"),
);
}

if (ADMIN_PASSWORD.length < 8) {
throw new Error(
"BOOTSTRAP_ADMIN_PASSWORD must contain at least 8 characters.",
);
}

const email =
ADMIN_EMAIL
.trim()
.toLowerCase();

const passwordHash =
await hashPassword(
ADMIN_PASSWORD,
);

const existing =
await prisma.user.findUnique({
where: {
email,
},
});

if (existing) {
const updated =
await prisma.user.update({
where: {
id: existing.id,
},
data: {
name:
ADMIN_NAME.trim(),
phone:
ADMIN_PHONE?.trim() ||
null,
role: "ADMIN",
isVerified: true,
passwordHash,
},
});


console.log(
  "==========================================",
);
console.log(
  "PharmaTrack ADMIN account repaired.",
);
console.log(
  "==========================================",
);
console.log(
  `Name:  ${updated.name}`,
);
console.log(
  `Email: ${updated.email}`,
);
console.log(
  `Role:  ${updated.role}`,
);
console.log(
  "Password hash: updated",
);
console.log(
  "==========================================",
);

return;


}

const created =
await prisma.user.create({
data: {
name:
ADMIN_NAME.trim(),
email,
phone:
ADMIN_PHONE?.trim() ||
null,
role: "ADMIN",
isVerified: true,
passwordHash,
},
});

console.log(
"==========================================",
);
console.log(
"PharmaTrack ADMIN account created.",
);
console.log(
"==========================================",
);
console.log(
`Name:  ${created.name}`,
);
console.log(
`Email: ${created.email}`,
);
console.log(
`Role:  ${created.role}`,
);
console.log(
"Password hash: created",
);
console.log(
"==========================================",
);
}

main()
.catch((error) => {
console.error(
"ADMIN bootstrap failed:",
error,
);


process.exitCode = 1;


})
.finally(async () => {
await prisma.$disconnect();
});
