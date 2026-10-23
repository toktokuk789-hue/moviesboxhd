import { Request, Response } from "express";
import getInfo from "../lib/getInfo";
import { resolveImdbId } from "../lib/tmdb";

export default async function mediaInfo(req: Request, res: Response) {
  const { id, type } = req.query;
  if (!id || typeof id !== "string") {
    return res.status(400).json({
      success: false,
      message: "Please provide an IMDb ID or TMDB ID (e.g. ?id=tt1375666 or ?id=27205)",
    });
  }

  try {
    let imdbId = id.trim();
    if (!imdbId.startsWith("tt")) {
      const resolved = await resolveImdbId(imdbId, type as any);
      if (!resolved || !resolved.imdbId) {
        return res.status(404).json({
          success: false,
          message: `Could not find an IMDb ID associated with TMDB ID ${imdbId}`,
        });
      }
      imdbId = resolved.imdbId;
    }

    const data = await getInfo(imdbId);
    return res.json({
      ...data,
      imdbId,
    });
  } catch (err: any) {
    console.error("mediaInfo error:", err);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}
