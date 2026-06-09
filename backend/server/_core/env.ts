import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const moduleDir = path.dirname(fileURLToPath(import.meta.url));
const envRoots = [
  path.resolve(process.cwd(), "backend"),
  process.cwd(),
  path.resolve(moduleDir, "../.."),
  path.resolve(moduleDir, ".."),
];

for (const root of envRoots.filter((value, index, roots) => roots.indexOf(value) === index)) {
  dotenv.config({ path: path.resolve(root, ".env.local") });
  dotenv.config({ path: path.resolve(root, ".env") });
}

export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  razorpayKeyId: process.env.RAZORPAY_KEY_ID ?? process.env.VITE_RAZORPAY_KEY_ID ?? "",
  razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET ?? "",
  fast2smsApiKey: process.env.FAST2SMS_API_KEY ?? "",
  fast2smsOtpId: process.env.FAST2SMS_OTP_ID ?? "",
  supabaseUrl: process.env.SUPABASE_URL ?? "",
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  backupAdminSecret: process.env.BACKUP_ADMIN_SECRET ?? "",
  frontendUrl: process.env.FRONTEND_URL ?? "http://localhost:5173",
  adminUsername: process.env.ADMIN_USERNAME ?? "admin",
  adminPassword: process.env.ADMIN_PASSWORD ?? "admin123",
  adminSessionSecret: process.env.ADMIN_SESSION_SECRET ?? process.env.JWT_SECRET ?? "",
};
