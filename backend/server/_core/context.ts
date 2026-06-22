import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import crypto from "crypto";
import { ENV } from "./env";

const ADMIN_COOKIE_NAME = "chitti_admin_session";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
  isAdmin: boolean;
};

function getAdminSessionSecret() {
  return ENV.adminSessionSecret || ENV.cookieSecret || "development-admin-session-secret";
}

function signAdminSession(payload: string) {
  return crypto
    .createHmac("sha256", getAdminSessionSecret())
    .update(payload)
    .digest("hex");
}

function parseCookies(cookieHeader: string | undefined) {
  return Object.fromEntries(
    (cookieHeader ?? "")
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const separatorIndex = part.indexOf("=");
        if (separatorIndex === -1) return [part, ""];
        return [
          decodeURIComponent(part.slice(0, separatorIndex)),
          decodeURIComponent(part.slice(separatorIndex + 1)),
        ];
      }),
  );
}

function isValidAdminSessionToken(token: string | undefined) {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;

  const [expiresAtText, nonce, signature] = parts;
  const payload = `${expiresAtText}.${nonce}`;
  const expectedSignature = signAdminSession(payload);
  const received = Buffer.from(signature);
  const expected = Buffer.from(expectedSignature);

  if (received.length !== expected.length || !crypto.timingSafeEqual(received, expected)) {
    return false;
  }

  const expiresAt = Number(expiresAtText);
  return Number.isFinite(expiresAt) && expiresAt > Date.now();
}

function getAdminBearerToken(authorization: string | undefined) {
  if (!authorization) return undefined;
  const [scheme, token] = authorization.split(" ");
  return scheme?.toLowerCase() === "bearer" ? token : undefined;
}

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  const cookies = parseCookies(opts.req.headers.cookie);
  const bearerToken = getAdminBearerToken(opts.req.headers.authorization);

  return {
    req: opts.req,
    res: opts.res,
    user: null,
    isAdmin:
      isValidAdminSessionToken(cookies[ADMIN_COOKIE_NAME]) ||
      isValidAdminSessionToken(bearerToken),
  };
}
