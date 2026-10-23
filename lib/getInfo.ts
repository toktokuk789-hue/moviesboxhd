import axios from "axios";
import * as cheerio from "cheerio";
import { getPlayerUrl } from "./getPlayerUrl";

export interface MediaTrack {
  title?: string;
  id?: string;
  file?: string;
  translator?: string;
  folder?: any[];
  [key: string]: any;
}

export interface MediaInfoResult {
  success: boolean;
  message?: string;
  data?: {
    playlist: MediaTrack[];
    key: string;
    type?: "movie" | "tv";
  };
}

export default async function getInfo(id: string): Promise<MediaInfoResult> {
  try {
    const playerUrl = await getPlayerUrl();

    const response = await axios.get(`${playerUrl}/play/${id}`, {
      headers: {
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        Referer: "https://google.com/",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      timeout: 12000,
    });

    const $ = cheerio.load(response.data);

    // Upstream injects anti-devtool scripts at the end, so search all script tags
    let targetScript = "";
    $("script").each((_, el) => {
      const content = $(el).html() || "";
      if (
        content.includes("let p3 =") ||
        content.includes("var p3 =") ||
        (content.includes('"file"') && content.includes('"key"'))
      ) {
        targetScript = content;
      }
    });

    if (!targetScript) {
      return {
        success: false,
        message: "Media not found or unavailable upstream",
      };
    }

    // Extract JSON configuration
    const match =
      targetScript.match(/let\s+p3\s*=\s*(\{.*?\});\s*(?:var\s+ppl|\n)/s) ||
      targetScript.match(/var\s+p3\s*=\s*(\{.*?\});\s*(?:var\s+ppl|\n)/s) ||
      targetScript.match(/(\{[^;]+});/s) ||
      targetScript.match(/\((\{.*\})\)/s);

    if (!match || !match[1]) {
      return {
        success: false,
        message: "Failed to parse media configuration",
      };
    }

    const config = JSON.parse(match[1]);
    const file = config.file;
    const key = config.key;

    if (!file || !key) {
      return {
        success: false,
        message: "Missing media stream tokens",
      };
    }

    // Resolve absolute or relative playlist file URL
    const playlistLink = file.startsWith("http") ? file : `${playerUrl}${file}`;

    const playlistRes = await axios.get(playlistLink, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "*/*",
        "X-Csrf-Token": key,
        Referer: `${playerUrl}/play/${id}`,
        Origin: playerUrl,
      },
      timeout: 12000,
    });

    let rawPlaylist = playlistRes.data;

    // Sanitize playlist: remove empty arrays or invalid objects returned by upstream
    if (Array.isArray(rawPlaylist)) {
      rawPlaylist = rawPlaylist.filter(
        (item) => item && typeof item === "object" && !Array.isArray(item) && (item.title || item.folder || item.file)
      );
    }

    return {
      success: true,
      data: {
        playlist: rawPlaylist,
        key,
      },
    };
  } catch (error: any) {
    console.error("getInfo error:", error?.message || error);
    const failedUrl = error?.config?.url || "unknown";
    return {
      success: false,
      message: `${error?.message || "Internal server error"} (requested: ${failedUrl})`,
    };
  }
}
