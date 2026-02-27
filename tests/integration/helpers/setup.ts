/**
 * Integration test setup — patches module exports before route handlers run.
 *
 * This file MUST be imported before any route module imports. It replaces:
 * - `server/storage.ts` → getUserStorage/serviceStorage with mock factories
 * - `server/supabaseAuth.ts` → requireAuth with pass-through middleware
 * - `server/clashRoyaleApi.ts` → all API functions with mock data
 * - `server/openai.ts` → all AI generation functions with mock responses
 * - `server/stripeService.ts` → Stripe service methods with mock responses
 * - `server/stripeClient.ts` → Stripe client factories with mocks
 *
 * Each test file calls `setupMocks(storage)` to configure the mock storage
 * for that specific test suite, then `resetMocks()` in afterEach/after.
 */
import type { IStorage } from "../../../server/storage";
import type { SupabaseAuthContext } from "../../../server/supabaseAuth";
import { createMockStorage, TEST_USER_ID } from "./mocks";
import { createTestAuth } from "./auth";

// ── Shared mutable state ────────────────────────────────────────────────────────

let _mockStorage: IStorage = createMockStorage();
let _mockAuth: SupabaseAuthContext = createTestAuth();
let _authenticated = true;

// Mock function call trackers
let _clashGetPlayerByTag: ((tag: string) => any) | null = null;
let _clashGetPlayerBattles: ((tag: string) => any) | null = null;
let _clashGetPlayerRankings: ((locationId: string) => any) | null = null;
let _clashGetClanRankings: ((locationId: string) => any) | null = null;
let _openaiGenerateCoachResponse: ((...args: any[]) => any) | null = null;
let _openaiGenerateCounterDeck: ((...args: any[]) => any) | null = null;
let _openaiGenerateDeckOptimizer: ((...args: any[]) => any) | null = null;
let _openaiGenerateTrainingPlan: ((...args: any[]) => any) | null = null;
let _openaiGeneratePushAnalysis: ((...args: any[]) => any) | null = null;

// ── Public API ──────────────────────────────────────────────────────────────────

export function getActiveMockStorage(): IStorage {
  return _mockStorage;
}

export function getActiveMockAuth(): SupabaseAuthContext {
  return _mockAuth;
}

export function isAuthenticated(): boolean {
  return _authenticated;
}

export function setupMocks(opts: {
  storage?: Partial<IStorage>;
  auth?: Partial<SupabaseAuthContext>;
  authenticated?: boolean;
  clashApi?: {
    getPlayerByTag?: (tag: string) => any;
    getPlayerBattles?: (tag: string) => any;
    getPlayerRankings?: (locationId: string) => any;
    getClanRankings?: (locationId: string) => any;
  };
  openai?: {
    generateCoachResponse?: (...args: any[]) => any;
    generateCounterDeck?: (...args: any[]) => any;
    generateDeckOptimizer?: (...args: any[]) => any;
    generateTrainingPlan?: (...args: any[]) => any;
    generatePushAnalysis?: (...args: any[]) => any;
  };
}) {
  _mockStorage = createMockStorage(opts.storage || {});
  _mockAuth = opts.auth ? createTestAuth(opts.auth) : createTestAuth();
  _authenticated = opts.authenticated ?? true;
  _clashGetPlayerByTag = opts.clashApi?.getPlayerByTag ?? null;
  _clashGetPlayerBattles = opts.clashApi?.getPlayerBattles ?? null;
  _clashGetPlayerRankings = opts.clashApi?.getPlayerRankings ?? null;
  _clashGetClanRankings = opts.clashApi?.getClanRankings ?? null;
  _openaiGenerateCoachResponse = opts.openai?.generateCoachResponse ?? null;
  _openaiGenerateCounterDeck = opts.openai?.generateCounterDeck ?? null;
  _openaiGenerateDeckOptimizer = opts.openai?.generateDeckOptimizer ?? null;
  _openaiGenerateTrainingPlan = opts.openai?.generateTrainingPlan ?? null;
  _openaiGeneratePushAnalysis = opts.openai?.generatePushAnalysis ?? null;
}

export function resetMocks() {
  _mockStorage = createMockStorage();
  _mockAuth = createTestAuth();
  _authenticated = true;
  _clashGetPlayerByTag = null;
  _clashGetPlayerBattles = null;
  _clashGetPlayerRankings = null;
  _clashGetClanRankings = null;
  _openaiGenerateCoachResponse = null;
  _openaiGenerateCounterDeck = null;
  _openaiGenerateDeckOptimizer = null;
  _openaiGenerateTrainingPlan = null;
  _openaiGeneratePushAnalysis = null;
}

// ── Getters for mocked external service functions ───────────────────────────────

export function getClashMock() {
  return {
    getPlayerByTag: _clashGetPlayerByTag,
    getPlayerBattles: _clashGetPlayerBattles,
    getPlayerRankings: _clashGetPlayerRankings,
    getClanRankings: _clashGetClanRankings,
  };
}

export function getOpenAIMock() {
  return {
    generateCoachResponse: _openaiGenerateCoachResponse,
    generateCounterDeck: _openaiGenerateCounterDeck,
    generateDeckOptimizer: _openaiGenerateDeckOptimizer,
    generateTrainingPlan: _openaiGenerateTrainingPlan,
    generatePushAnalysis: _openaiGeneratePushAnalysis,
  };
}
