import express from "express";
import mediaInfo from "../controllers/mediaInfo";
import getStream from "../controllers/getStream";
import getSeasonList from "../controllers/getSeasonList";
import {
  searchController,
  trendingController,
  popularController,
  detailsController,
  resolveIdController,
} from "../controllers/tmdb";
import { playerApiController } from "../controllers/player";

const router = express.Router();

// Streaming & Media routes (support both IMDb IDs and TMDB IDs)
router.get("/mediaInfo", mediaInfo);
router.post("/getStream", getStream);
router.get("/getSeasonList", getSeasonList);
router.get("/player", playerApiController);

// TMDB Discovery & Metadata routes
router.get("/search", searchController);
router.get("/trending", trendingController);
router.get("/popular", popularController);
router.get("/details", detailsController);
router.get("/resolveId", resolveIdController);

export default router;
