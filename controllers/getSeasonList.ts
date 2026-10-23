import { Request, Response } from "express";
import getInfo from "../lib/getInfo";
import { resolveImdbId } from "../lib/tmdb";

export default async function getSeasonList(req: Request, res: Response) {
  const { id, type } = req.query;
  if (!id || typeof id !== "string") {
    return res.status(400).json({
      success: false,
      message: "Please provide a valid IMDb or TMDB ID (e.g. ?id=tt11737520 or ?id=1396)",
    });
  }

  try {
    let imdbId = id.trim();
    if (!imdbId.startsWith("tt")) {
      const resolved = await resolveImdbId(imdbId, (type as any) || "tv");
      if (!resolved || !resolved.imdbId) {
        return res.status(404).json({
          success: false,
          message: `Could not find an IMDb ID associated with TMDB ID ${imdbId}`,
        });
      }
      imdbId = resolved.imdbId;
    }

    const mediaInfo = await getInfo(imdbId);
    if (!mediaInfo.success || !mediaInfo.data?.playlist) {
      return res.status(404).json({
        success: false,
        message: mediaInfo.message || "Media not found",
        imdbId,
      });
    }

    const playlist = mediaInfo.data.playlist;

    // Check if this is a TV series by looking for "Season" title or nested "folder"
    const isSeries = playlist.some(
      (item: any) =>
        item &&
        ((item.title && typeof item.title === "string" && item.title.toLowerCase().includes("season")) ||
          (Array.isArray(item.folder) && item.folder.length > 0))
    );

    if (isSeries) {
      const seasons = playlist.map((seasonItem: any) => {
        const seasonTitle = seasonItem.title || "Season 1";
        const episodes = Array.isArray(seasonItem.folder) ? seasonItem.folder : [];
        const languages = new Set<string>();

        // Collect available audio languages from episodes
        episodes.forEach((ep: any) => {
          if (Array.isArray(ep.folder)) {
            ep.folder.forEach((audio: any) => {
              if (audio?.title && typeof audio.title === "string") {
                languages.add(audio.title);
              }
            });
          }
        });

        return {
          season: seasonTitle,
          totalEpisodes: episodes.length,
          lang: Array.from(languages),
        };
      });

      return res.json({
        success: true,
        data: {
          imdbId,
          seasons,
          type: "tv",
        },
      });
    } else {
      // Movie handling: collect languages
      const languages: string[] = [];
      playlist.forEach((track: any) => {
        if (track?.title && typeof track.title === "string") {
          languages.push(track.title);
        }
      });

      return res.json({
        success: true,
        data: {
          imdbId,
          seasons: [
            {
              lang: languages,
            },
          ],
          type: "movie",
        },
      });
    }
  } catch (err: any) {
    console.error("getSeasonList error:", err);
    return res.status(500).json({
      success: false,
      message: "Internal server error parsing seasons",
    });
  }
}
