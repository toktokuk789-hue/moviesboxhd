import { Request, Response } from "express";
import { resolveImdbId, getDetails } from "../lib/tmdb";

export interface StreamServer {
  name: string;
  embedUrl: string;
}

export function generateStreamServers(params: {
  imdbId?: string;
  tmdbId?: string;
  type: "movie" | "tv";
  season?: number;
  episode?: number;
}): StreamServer[] {
  const { imdbId, tmdbId, type, season = 1, episode = 1 } = params;
  const servers: StreamServer[] = [];

  // Server 1: Primary upstream (HDVB)
  if (imdbId) {
    servers.push({
      name: "Server 1 (Primary HD)",
      embedUrl: `https://slast430did.com/play/${imdbId}`,
    });
  }

  // Server 2: VidLink (Fast, multi-quality)
  if (tmdbId) {
    const vidlinkUrl =
      type === "tv"
        ? `https://vidlink.pro/tv/${tmdbId}/${season}/${episode}`
        : `https://vidlink.pro/movie/${tmdbId}`;
    servers.push({
      name: "Server 2 (VidLink)",
      embedUrl: vidlinkUrl,
    });
  }

  // Server 3: VidSrc (High compatibility)
  if (imdbId || tmdbId) {
    const idParam = imdbId ? `imdb=${imdbId}` : `tmdb=${tmdbId}`;
    const vidsrcUrl =
      type === "tv"
        ? `https://vidsrc.me/embed/tv?${idParam}&season=${season}&episode=${episode}`
        : `https://vidsrc.me/embed/movie?${idParam}`;
    servers.push({
      name: "Server 3 (VidSrc)",
      embedUrl: vidsrcUrl,
    });
  }

  // Server 4: SuperEmbed (Anime & Worldwide)
  if (imdbId || tmdbId) {
    const idVal = imdbId || tmdbId;
    const superUrl =
      type === "tv"
        ? `https://multiembed.mov/?video_id=${idVal}&s=${season}&e=${episode}`
        : `https://multiembed.mov/?video_id=${idVal}`;
    servers.push({
      name: "Server 4 (SuperEmbed)",
      embedUrl: superUrl,
    });
  }

  return servers;
}

export async function playerApiController(req: Request, res: Response) {
  const id = req.query.id as string;
  const type = ((req.query.type as string) || "movie").toLowerCase() as "movie" | "tv";
  const season = parseInt(req.query.s as string) || 1;
  const episode = parseInt(req.query.e as string) || 1;

  if (!id) {
    return res.status(400).json({
      success: false,
      message: "Please provide an ID (IMDb or TMDB ID, e.g. ?id=tt1877830 or ?id=27205)",
    });
  }

  try {
    let imdbId = id.startsWith("tt") ? id : undefined;
    let tmdbId = /^\d+$/.test(id) ? id : undefined;

    if (!imdbId && tmdbId) {
      const resolved = await resolveImdbId(tmdbId, type);
      if (resolved?.imdbId) {
        imdbId = resolved.imdbId;
      }
    } else if (imdbId && !tmdbId) {
      // Find TMDB ID from IMDb ID
      try {
        const details = await getDetails(imdbId, type);
        if (details?.id) {
          tmdbId = String(details.id);
        }
      } catch {}
    }

    const servers = generateStreamServers({ imdbId, tmdbId, type, season, episode });

    return res.json({
      success: true,
      data: {
        id,
        imdbId,
        tmdbId,
        type,
        season: type === "tv" ? season : undefined,
        episode: type === "tv" ? episode : undefined,
        servers,
      },
    });
  } catch (err: any) {
    console.error("playerApiController error:", err);
    return res.status(500).json({
      success: false,
      message: "Internal server error resolving stream player",
    });
  }
}

export async function playerHtmlController(req: Request, res: Response) {
  const id = (req.query.id as string) || "tt1877830";
  const type = ((req.query.type as string) || "movie").toLowerCase() as "movie" | "tv";
  const season = parseInt(req.query.s as string) || 1;
  const episode = parseInt(req.query.e as string) || 1;

  try {
    let imdbId = id.startsWith("tt") ? id : undefined;
    let tmdbId = /^\d+$/.test(id) ? id : undefined;

    if (!imdbId && tmdbId) {
      const resolved = await resolveImdbId(tmdbId, type);
      if (resolved?.imdbId) imdbId = resolved.imdbId;
    }

    const servers = generateStreamServers({ imdbId, tmdbId, type, season, episode });
    const primaryUrl = servers[0]?.embedUrl || "";

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MoviesBoxHD Player</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body, html { width: 100%; height: 100%; background: #000; overflow: hidden; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    .player-container { display: flex; flex-direction: column; width: 100%; height: 100%; }
    .server-bar {
      display: flex;
      gap: 8px;
      padding: 8px 12px;
      background: #0f1117;
      border-bottom: 1px solid #1f2430;
      overflow-x: auto;
      white-space: nowrap;
      scrollbar-width: thin;
    }
    .server-btn {
      background: #1e2230;
      color: #94a3b8;
      border: 1px solid #334155;
      padding: 6px 14px;
      font-size: 13px;
      font-weight: 500;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .server-btn:hover { background: #2d3748; color: #fff; }
    .server-btn.active {
      background: #3b82f6;
      color: #fff;
      border-color: #60a5fa;
      box-shadow: 0 0 10px rgba(59, 130, 246, 0.4);
    }
    .iframe-wrapper { flex: 1; width: 100%; height: 100%; position: relative; }
    iframe { width: 100%; height: 100%; border: none; }
  </style>
</head>
<body>
  <div class="player-container">
    <div class="server-bar">
      ${servers
        .map(
          (s, idx) => `
        <button class="server-btn ${idx === 0 ? "active" : ""}" onclick="switchServer('${s.embedUrl}', this)">
          ${s.name}
        </button>`
        )
        .join("")}
    </div>
    <div class="iframe-wrapper">
      <iframe id="videoPlayer" src="${primaryUrl}" allowfullscreen allow="autoplay; fullscreen; encrypted-media; picture-in-picture"></iframe>
    </div>
  </div>

  <script>
    function switchServer(url, btn) {
      document.querySelectorAll('.server-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('videoPlayer').src = url;
    }
  </script>
</body>
</html>`;

    res.setHeader("Content-Type", "text/html");
    return res.send(html);
  } catch (err: any) {
    return res.status(500).send("Player error");
  }
}
