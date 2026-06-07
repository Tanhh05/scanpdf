import type { OAuthProvider, User } from "@prisma/client";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { prisma } from "../config/prisma.js";
import { HttpError } from "../utils/http-error.js";

type OAuthProfile = {
  provider: OAuthProvider;
  providerAccountId: string;
  email: string;
  fullName: string;
};

type GoogleToken = { access_token?: string; error?: string };
type GoogleProfile = { sub: string; email: string; email_verified: boolean; name?: string };
type GitHubToken = { access_token?: string; error?: string };
type GitHubProfile = { id: number; login: string; name: string | null; email: string | null };
type GitHubEmail = { email: string; primary: boolean; verified: boolean };

export function getOAuthConfig(provider: "google" | "github") {
  const config = provider === "google"
    ? {
        clientId: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
        authorizationUrl: "https://accounts.google.com/o/oauth2/v2/auth",
        callbackUrl: `${env.API_URL}/auth/google/callback`,
        scope: "openid email profile",
      }
    : {
        clientId: env.GITHUB_CLIENT_ID,
        clientSecret: env.GITHUB_CLIENT_SECRET,
        authorizationUrl: "https://github.com/login/oauth/authorize",
        callbackUrl: `${env.API_URL}/auth/github/callback`,
        scope: "read:user user:email",
      };
  if (!config.clientId || !config.clientSecret) {
    throw new HttpError(503, `Đăng nhập ${provider === "google" ? "Google" : "GitHub"} chưa được cấu hình`);
  }
  return config as typeof config & { clientId: string; clientSecret: string };
}

export function createOAuthState(provider: "google" | "github") {
  return jwt.sign({ provider, purpose: "oauth-state" }, env.JWT_SECRET, { expiresIn: "10m" });
}

export function verifyOAuthState(state: string, provider: "google" | "github") {
  try {
    const payload = jwt.verify(state, env.JWT_SECRET) as { provider: string; purpose: string };
    if (payload.provider !== provider || payload.purpose !== "oauth-state") throw new Error();
  } catch {
    throw new HttpError(400, "OAuth state không hợp lệ hoặc đã hết hạn");
  }
}

async function fetchGoogleProfile(code: string): Promise<OAuthProfile> {
  const config = getOAuthConfig("google");
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.callbackUrl,
      grant_type: "authorization_code",
    }),
  });
  const token = await tokenResponse.json() as GoogleToken;
  if (!tokenResponse.ok || !token.access_token) throw new HttpError(401, `Google OAuth thất bại: ${token.error ?? "token error"}`);
  const profileResponse = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: { Authorization: `Bearer ${token.access_token}` },
  });
  const profile = await profileResponse.json() as GoogleProfile;
  if (!profileResponse.ok || !profile.email_verified) throw new HttpError(401, "Google email chưa được xác minh");
  return {
    provider: "GOOGLE",
    providerAccountId: profile.sub,
    email: profile.email.toLowerCase(),
    fullName: profile.name || profile.email.split("@")[0]!,
  };
}

async function fetchGitHubProfile(code: string): Promise<OAuthProfile> {
  const config = getOAuthConfig("github");
  const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code,
      redirect_uri: config.callbackUrl,
    }),
  });
  const token = await tokenResponse.json() as GitHubToken;
  if (!tokenResponse.ok || !token.access_token) throw new HttpError(401, `GitHub OAuth thất bại: ${token.error ?? "token error"}`);
  const headers = {
    Authorization: `Bearer ${token.access_token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "ScanPDF",
  };
  const [profileResponse, emailsResponse] = await Promise.all([
    fetch("https://api.github.com/user", { headers }),
    fetch("https://api.github.com/user/emails", { headers }),
  ]);
  const profile = await profileResponse.json() as GitHubProfile;
  const emails = await emailsResponse.json() as GitHubEmail[];
  const verifiedEmail = Array.isArray(emails)
    ? emails.find((item) => item.primary && item.verified) ?? emails.find((item) => item.verified)
    : undefined;
  const email = verifiedEmail?.email;
  if (!profileResponse.ok || !email) throw new HttpError(401, "GitHub không cung cấp email đã xác minh");
  return {
    provider: "GITHUB",
    providerAccountId: String(profile.id),
    email: email.toLowerCase(),
    fullName: profile.name || profile.login,
  };
}

export async function getOAuthProfile(provider: "google" | "github", code: string) {
  return provider === "google" ? fetchGoogleProfile(code) : fetchGitHubProfile(code);
}

export async function findOrCreateOAuthUser(profile: OAuthProfile): Promise<User> {
  const account = await prisma.oAuthAccount.findUnique({
    where: {
      provider_providerAccountId: {
        provider: profile.provider,
        providerAccountId: profile.providerAccountId,
      },
    },
    include: { user: true },
  });
  if (account) return account.user;

  const existingUser = await prisma.user.findUnique({ where: { email: profile.email } });
  if (existingUser) {
    return prisma.user.update({
      where: { id: existingUser.id },
      data: {
        oauthAccounts: {
          create: { provider: profile.provider, providerAccountId: profile.providerAccountId },
        },
      },
    });
  }

  const freePlan = await prisma.plan.findUnique({ where: { name: "Free" } });
  if (!freePlan) throw new HttpError(503, "Hệ thống chưa khởi tạo gói Free");
  return prisma.user.create({
    data: {
      email: profile.email,
      fullName: profile.fullName,
      oauthAccounts: {
        create: { provider: profile.provider, providerAccountId: profile.providerAccountId },
      },
      subscriptions: { create: { planId: freePlan.id } },
    },
  });
}
