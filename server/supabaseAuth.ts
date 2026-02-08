import type { RequestHandler } from "express";
import { createRemoteJWKSet, jwtVerify } from "jose";

type JwtClaims = Record<string, unknown> & {
  sub?: string;
  role?: string;
  aud?: string | string[];
  exp?: number;
  email?: string;
};

export type SupabaseAuthContext = {
  userId: string;
  role: string;
  claims: JwtClaims;
  accessToken: string;
};

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
    interface Request {
      auth?: SupabaseAuthContext;
    }
  }
}

let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;
let jwtIssuer: string | null = null;

function getSupabaseIssuer(): string | null {
  const baseUrl = process.env.SUPABASE_URL;
  if (!baseUrl) return null;
  return `${baseUrl.replace(/\/+$/, "")}/auth/v1`;
}

function getSupabaseJwksUrl(): URL | null {
  const configured = process.env.SUPABASE_JWKS_URL;
  if (configured) return new URL(configured);

  const issuer = getSupabaseIssuer();
  if (!issuer) return null;
  return new URL(`${issuer}/.well-known/jwks.json`);
}

function getJwks() {
  if (jwks) return jwks;
  const url = getSupabaseJwksUrl();
  if (!url) return null;
  jwks = createRemoteJWKSet(url);
  return jwks;
}

function parseBearerToken(header: unknown): string | null {
  if (typeof header !== "string") return null;
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1] ?? null;
}

export const requireAuth: RequestHandler = async (req, res, next) => {
  const issuer = getSupabaseIssuer();
  const jwksSet = getJwks();

  if (!issuer || !jwksSet) {
    return res.status(503).json({
      code: "SUPABASE_NOT_CONFIGURED",
      message: "Supabase Auth is not configured",
    });
  }

  const token = parseBearerToken(req.headers.authorization);
  if (!token) {
    return res.status(401).json({ code: "UNAUTHORIZED", message: "Unauthorized" });
  }

  try {
    // Cache issuer too (mostly to avoid repeated string building).
    jwtIssuer = jwtIssuer ?? issuer;

    const { payload } = await jwtVerify<JwtClaims>(token, jwksSet, {
      issuer: jwtIssuer,
      audience: "authenticated",
    });

    const userId = payload.sub;
    if (!userId) {
      return res.status(401).json({ code: "UNAUTHORIZED", message: "Unauthorized" });
    }

    req.auth = {
      userId,
      role: (payload.role as string) || "authenticated",
      claims: payload,
      accessToken: token,
    };

    return next();
  } catch {
    return res.status(401).json({ code: "UNAUTHORIZED", message: "Unauthorized" });
  }
};

