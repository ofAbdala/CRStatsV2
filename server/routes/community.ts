/**
 * Community rankings routes
 * Endpoints: GET /api/community/player-rankings, GET /api/community/clan-rankings
 */
import { Router } from "express";
import { getPlayerRankings, getClanRankings } from "../clashRoyaleApi";

const router = Router();

// GET /api/community/player-rankings
router.get('/api/community/player-rankings', async (req, res) => {
  try {
    const locationId = (req.query.locationId as string) || 'global';
    const result = await getPlayerRankings(locationId);

    if (result.error) {
      return res.status(result.status).json({ error: result.error });
    }

    res.json(result.data);
  } catch (error) {
    console.error("Error fetching player rankings:", error);
    res.status(500).json({ error: "Failed to fetch player rankings" });
  }
});

// GET /api/community/clan-rankings
router.get('/api/community/clan-rankings', async (req, res) => {
  try {
    const locationId = (req.query.locationId as string) || 'global';
    const result = await getClanRankings(locationId);

    if (result.error) {
      return res.status(result.status).json({ error: result.error });
    }

    res.json(result.data);
  } catch (error) {
    console.error("Error fetching clan rankings:", error);
    res.status(500).json({ error: "Failed to fetch clan rankings" });
  }
});

export default router;
