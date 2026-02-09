import { ApiError } from "@/lib/api";

type TranslateFn = (key: string, params?: Record<string, string | number>) => string;

const codeToTranslationKey: Record<string, string> = {
  UNAUTHORIZED: "apiErrors.codes.unauthorized",
  VALIDATION_ERROR: "apiErrors.codes.validation",
  PLAYER_SYNC_FAILED: "apiErrors.codes.playerSyncFailed",
  NO_CLASH_TAG: "apiErrors.codes.noClashTag",
  FREE_COACH_DAILY_LIMIT_REACHED: "apiErrors.codes.coachLimitReached",
  COACH_CHAT_FAILED: "apiErrors.codes.coachChatFailed",
  NO_USER_MESSAGE: "apiErrors.codes.noUserMessage",
  PRO_REQUIRED: "apiErrors.codes.proRequired",
  NO_PUSH_SESSION: "apiErrors.codes.noPushSession",
  PUSH_ANALYSIS_FAILED: "apiErrors.codes.pushAnalysisFailed",
  PUSH_ANALYSIS_FETCH_FAILED: "apiErrors.codes.pushAnalysisFetchFailed",
  NO_PUSH_ANALYSIS: "apiErrors.codes.noPushAnalysis",
  DRILL_UPDATE_FAILED: "apiErrors.codes.drillUpdateFailed",
  TRAINING_PLAN_UPDATE_FAILED: "apiErrors.codes.trainingPlanUpdateFailed",
  TRAINING_PLAN_NOT_FOUND: "apiErrors.codes.trainingPlanNotFound",
  CLASH_PLAYER_FETCH_FAILED: "apiErrors.codes.clashPlayerFetchFailed",
  CLASH_BATTLES_FETCH_FAILED: "apiErrors.codes.clashBattlesFetchFailed",
  CLASH_CARDS_FETCH_FAILED: "apiErrors.codes.clashCardsFetchFailed",
  STRIPE_NOT_CONFIGURED: "apiErrors.codes.stripeNotConfigured",
  PRICE_ID_REQUIRED: "apiErrors.codes.priceIdRequired",
  INVALID_PRICE_ID: "apiErrors.codes.invalidPriceId",
  NO_SUBSCRIPTION: "apiErrors.codes.noSubscription",
  CHECKOUT_SESSION_FAILED: "apiErrors.codes.checkoutFailed",
  PORTAL_SESSION_FAILED: "apiErrors.codes.portalFailed",
  INVOICE_FETCH_FAILED: "apiErrors.codes.invoicesFailed",
  NOTIFICATIONS_FETCH_FAILED: "apiErrors.codes.notificationsFetchFailed",
  NOTIFICATION_READ_FAILED: "apiErrors.codes.notificationReadFailed",
  NOTIFICATIONS_MARK_ALL_READ_FAILED: "apiErrors.codes.notificationsMarkAllReadFailed",
  NOTIFICATIONS_CLEAR_FAILED: "apiErrors.codes.notificationsClearFailed",
  SETTINGS_UPDATE_FAILED: "apiErrors.codes.settingsUpdateFailed",
  SETTINGS_FETCH_FAILED: "apiErrors.codes.settingsFetchFailed",
  NOTIFICATION_PREFERENCES_UPDATE_FAILED: "apiErrors.codes.preferencesUpdateFailed",
  FREE_PROFILE_LIMIT_REACHED: "apiErrors.codes.freeProfileLimitReached",
  DECK_COUNTER_DAILY_LIMIT_REACHED: "apiErrors.codes.deckCounterLimitReached",
  DECK_OPTIMIZER_DAILY_LIMIT_REACHED: "apiErrors.codes.deckOptimizerLimitReached",
};

export function getApiErrorMessage(
  error: unknown,
  t: TranslateFn,
  fallbackKey = "errors.generic",
): string {
  if (error instanceof ApiError) {
    const translationKey = error.code ? codeToTranslationKey[error.code] : undefined;
    if (translationKey) return t(translationKey);
    if (error.message) return error.message;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return t(fallbackKey);
}

export function getApiTechnicalDetails(error: unknown) {
  if (!(error instanceof ApiError)) return null;

  return {
    code: error.code || "UNKNOWN_ERROR",
    status: error.status,
    requestId: error.requestId || null,
    message: error.message,
  };
}
