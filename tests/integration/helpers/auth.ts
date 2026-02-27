/**
 * Authentication test helpers.
 *
 * Instead of generating real JWTs and verifying them against a JWKS endpoint,
 * the integration tests bypass the `requireAuth` middleware entirely by
 * attaching `req.auth` directly. This helper provides the typed auth context
 * objects that the test app injects.
 */
import type { SupabaseAuthContext } from "../../../server/supabaseAuth";
import { TEST_USER_ID, TEST_USER_EMAIL } from "./mocks";

/**
 * Create a fake Supabase auth context for a test user.
 * The `accessToken` is a dummy value — the middleware is mocked so it is never verified.
 */
export function createTestAuth(overrides?: Partial<SupabaseAuthContext>): SupabaseAuthContext {
  return {
    userId: TEST_USER_ID,
    role: "authenticated",
    claims: {
      sub: TEST_USER_ID,
      role: "authenticated",
      aud: "authenticated",
      email: TEST_USER_EMAIL,
      exp: Math.floor(Date.now() / 1000) + 3600,
    },
    accessToken: "test-access-token-fake",
    ...overrides,
  };
}

/**
 * Create a second distinct test user for multi-user isolation tests.
 */
export function createSecondTestAuth(): SupabaseAuthContext {
  return createTestAuth({
    userId: "test-user-id-2222",
    claims: {
      sub: "test-user-id-2222",
      role: "authenticated",
      aud: "authenticated",
      email: "user2@crstats.app",
      exp: Math.floor(Date.now() / 1000) + 3600,
    },
  });
}
