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
  <meta name="color-scheme" content="dark">
  <style>
    :root { color-scheme: dark; --page: #0a0f14; --surface: #111821; --line: #223040; --text: #e6edf3; --muted: #93a3b4; --accent: #ff5b2e; }
    * { box-sizing: border-box; }
    html, body { width: 100%; height: 100%; min-height: 0; margin: 0; background: var(--page); color: var(--text); font-family: "DM Sans", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    body { overflow: hidden; }
    .player-container { display: flex; flex-direction: column; width: 100%; height: 100%; min-height: 0; background: var(--page); }
    .server-bar { display: flex; align-items: center; gap: 8px; padding: 10px 12px; background: var(--surface); border-bottom: 1px solid var(--line); overflow-x: auto; white-space: nowrap; scrollbar-width: thin; }
    .server-btn { flex: 0 0 auto; appearance: none; background: #17212c; color: var(--muted); border: 1px solid #304052; padding: 9px 13px; min-height: 38px; font-size: 13px; font-weight: 600; border-radius: 6px; cursor: pointer; transition: background .16s ease, color .16s ease, border-color .16s ease; }
    .server-btn:hover { background: #202d3a; color: var(--text); }
    .server-btn:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
    .server-btn.active, .server-btn[aria-pressed="true"] { background: var(--accent); color: #15100e; border-color: var(--accent); }
    .player-note { padding: 8px 12px; color: var(--muted); background: #0d141c; border-bottom: 1px solid var(--line); font-size: 12px; line-height: 1.5; }
    .iframe-wrapper { flex: 1 1 auto; min-height: 0; width: 100%; position: relative; background: #050709; }
    iframe { display: block; width: 100%; height: 100%; min-height: 220px; border: 0; background: #050709; }
    @media (max-width: 520px) { .server-bar { gap: 6px; padding: 8px; } .server-btn { padding: 8px 10px; font-size: 12px; } .player-note { padding: 8px; } }
    @media (prefers-reduced-motion: reduce) { *, *::before, *::after { transition: none !important; scroll-behavior: auto !important; } }
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
      <iframe id="videoPlayer" title="Selected video provider" src="${primaryUrl}" loading="eager" allowfullscreen allow="autoplay; fullscreen; encrypted-media; picture-in-picture" referrerpolicy="strict-origin-when-cross-origin"></iframe>
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
