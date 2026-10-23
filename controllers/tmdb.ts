import { Request, Response } from "express";
import { searchMedia, getTrending, getPopular, getDetails, resolveImdbId } from "../lib/tmdb";

export async function searchController(req: Request, res: Response) {
  const query = req.query.query as string;
  const page = parseInt(req.query.page as string) || 1;
  const type = (req.query.type as "multi" | "movie" | "tv") || "multi";

  if (!query || query.trim() === "") {
    return res.status(400).json({
      success: false,
      message: "Query parameter 'query' is required (e.g. ?query=Avatar)",
    });
  }

  try {
    const data = await searchMedia(query.trim(), page, type);
    return res.json({
      success: true,
      data,
    });
  } catch (err: any) {
    console.error("searchController error:", err?.response?.data || err.message);
    return res.status(err?.response?.status || 500).json({
      success: false,
      message: err?.response?.data?.status_message || "Failed to search media",
    });
  }
}

export async function trendingController(req: Request, res: Response) {
  const type = (req.query.type as "all" | "movie" | "tv") || "all";
  const time = (req.query.time as "day" | "week") || "day";

  try {
    const data = await getTrending(type, time);
    return res.json({
      success: true,
      data,
    });
  } catch (err: any) {
    console.error("trendingController error:", err?.response?.data || err.message);
    return res.status(err?.response?.status || 500).json({
      success: false,
      message: err?.response?.data?.status_message || "Failed to fetch trending media",
    });
  }
}

export async function popularController(req: Request, res: Response) {
  const type = (req.query.type as "movie" | "tv") || "movie";
  const page = parseInt(req.query.page as string) || 1;

  try {
    const data = await getPopular(type, page);
    return res.json({
      success: true,
      data,
    });
  } catch (err: any) {
    console.error("popularController error:", err?.response?.data || err.message);
    return res.status(err?.response?.status || 500).json({
      success: false,
      message: err?.response?.data?.status_message || "Failed to fetch popular media",
    });
  }
}

export async function detailsController(req: Request, res: Response) {
  const id = req.query.id as string;
  const type = (req.query.type as "movie" | "tv") || "movie";

  if (!id) {
    return res.status(400).json({
      success: false,
      message: "Parameter 'id' is required (TMDB ID, e.g. ?id=27205&type=movie)",
    });
  }

  try {
    const data = await getDetails(id, type);
    return res.json({
      success: true,
      data,
    });
  } catch (err: any) {
    console.error("detailsController error:", err?.response?.data || err.message);
    return res.status(err?.response?.status || 500).json({
      success: false,
      message: err?.response?.data?.status_message || "Failed to fetch media details",
    });
  }
}

export async function resolveIdController(req: Request, res: Response) {
  const id = req.query.id as string;
  const type = req.query.type as "movie" | "tv" | undefined;

  if (!id) {
    return res.status(400).json({
      success: false,
      message: "Parameter 'id' is required",
    });
  }

  try {
    const resolved = await resolveImdbId(id, type);
    if (!resolved) {
      return res.status(404).json({
        success: false,
        message: "Could not resolve an IMDb ID for the provided ID",
      });
    }
    return res.json({
      success: true,
      data: resolved,
    });
  } catch (err: any) {
    console.error("resolveIdController error:", err);
    return res.status(500).json({
      success: false,
      message: "Internal server error resolving ID",
    });
  }
}
