/**
 * Favorite players routes
 * Endpoints: GET /api/favorites, POST /api/favorites, DELETE /api/favorites/:id
 */
import { Router } from "express";
import { getUserStorage } from "../storage";
import { requireAuth } from "../supabaseAuth";
import { favoriteCreateInputSchema } from "@shared/schema";
import { getUserId, sendApiError, parseRequestBody, normalizeTag } from "./utils";

const router = Router();

// GET /api/favorites
router.get('/api/favorites', requireAuth, async (req: any, res) => {
  const route = "/api/favorites";
  const userId = getUserId(req);

  try {
    if (!userId) {
      return sendApiError(res, {
        route,
        userId,
        provider: "supabase-auth",
        status: 401,
        error: { code: "UNAUTHORIZED", message: "Unauthorized" },
      });
    }

    const storage = getUserStorage(req.auth!);
    const favorites = await storage.getFavoritePlayers(userId);
    return res.json(favorites);
  } catch (error) {
    console.error("Error fetching favorites:", error);
    return sendApiError(res, {
      route,
      userId,
      provider: "internal",
      status: 500,
      error: { code: "FAVORITES_FETCH_FAILED", message: "Failed to fetch favorites" },
    });
  }
});

// POST /api/favorites
router.post('/api/favorites', requireAuth, async (req: any, res) => {
  const route = "/api/favorites";
  const userId = getUserId(req);

  try {
    if (!userId) {
      return sendApiError(res, {
        route,
        userId,
        provider: "supabase-auth",
        status: 401,
        error: { code: "UNAUTHORIZED", message: "Unauthorized" },
      });
    }

    const storage = getUserStorage(req.auth!);
    const parsed = parseRequestBody(favoriteCreateInputSchema, req.body);
    if (!parsed.ok) {
      return sendApiError(res, {
        route,
        userId,
        provider: "internal",
        status: 400,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid favorite payload",
          details: parsed.details,
        },
      });
    }

    const isPro = await storage.isPro(userId);
    if (!isPro) {
      const existingFavorites = await storage.getFavoritePlayers(userId);
      const normalizedIncomingTag = normalizeTag(parsed.data.playerTag) || parsed.data.playerTag;
      const alreadyHasTag = existingFavorites.some(
        (fav) => (normalizeTag(fav.playerTag) || fav.playerTag) === normalizedIncomingTag,
      );

      if (existingFavorites.length >= 1 && !alreadyHasTag) {
        return sendApiError(res, {
          route,
          userId,
          provider: "internal",
          status: 403,
          error: {
            code: "FREE_PROFILE_LIMIT_REACHED",
            message: "No plano FREE, você pode salvar apenas 1 perfil. Faça upgrade para salvar mais.",
          },
        });
      }
    }

    const favorite = await storage.createFavoritePlayer({
      userId,
      playerTag: normalizeTag(parsed.data.playerTag) || parsed.data.playerTag,
      name: parsed.data.name,
      trophies: parsed.data.trophies,
      clan: parsed.data.clan,
    });

    if (parsed.data.setAsDefault) {
      await storage.updateProfile(userId, {
        defaultPlayerTag: favorite.playerTag,
        clashTag: favorite.playerTag,
      });
    }

    res.json(favorite);
  } catch (error) {
    console.error("Error creating favorite:", error);
    return sendApiError(res, {
      route,
      userId,
      provider: "internal",
      status: 500,
      error: { code: "FAVORITE_CREATE_FAILED", message: "Failed to create favorite" },
    });
  }
});

// DELETE /api/favorites/:id
router.delete('/api/favorites/:id', requireAuth, async (req: any, res) => {
  const route = "/api/favorites/:id";
  const userId = getUserId(req);

  try {
    if (!userId) {
      return sendApiError(res, {
        route,
        userId,
        provider: "supabase-auth",
        status: 401,
        error: { code: "UNAUTHORIZED", message: "Unauthorized" },
      });
    }

    const storage = getUserStorage(req.auth!);
    const { id } = req.params;
    const existingFavorite = await storage.getFavoritePlayer(id);
    if (!existingFavorite || existingFavorite.userId !== userId) {
      return sendApiError(res, {
        route,
        userId,
        provider: "internal",
        status: 404,
        error: { code: "FAVORITE_NOT_FOUND", message: "Favorite not found" },
      });
    }

    await storage.deleteFavoritePlayer(id);
    return res.json({ success: true });
  } catch (error) {
    console.error("Error deleting favorite:", error);
    return sendApiError(res, {
      route,
      userId,
      provider: "internal",
      status: 500,
      error: { code: "FAVORITE_DELETE_FAILED", message: "Failed to delete favorite" },
    });
  }
});

export default router;
