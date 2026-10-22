import axios from "axios";
import { Request, Response } from "express";
import { getPlayerUrl } from "../lib/getPlayerUrl";

export default async function getStream(req: Request, res: Response) {
  const { file, key } = req.body;
  if (!file || !key) {
    return res.status(400).json({
      success: false,
      message: "Please provide both 'file' and 'key' in the request body",
    });
  }

  const rawFile = String(file).trim();
  // Strip leading ~ if present and append .txt
  const cleanPath = (rawFile.startsWith("~") ? rawFile.slice(1) : rawFile) + ".txt";

  try {
    const playerUrl = await getPlayerUrl();
    const targetUrl = `${playerUrl}/playlist/${cleanPath}`;

    const streamResponse = await axios.get(targetUrl, {
      headers: {
        Accept: "*/*",
        "Accept-Language": "en-US,en;q=0.9",
        "Cache-Control": "no-cache",
        Origin: "https://friness-cherlormur-i-275.site",
        Pragma: "no-cache",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "X-Csrf-Token": String(key).trim(),
        Referer: "https://google.com/",
      },
      timeout: 12000,
    });

    const streamData = streamResponse.data;

    if (!streamData) {
      return res.status(404).json({
        success: false,
        message: "Stream link not available",
      });
    }

    return res.json({
      success: true,
      data: {
        link: typeof streamData === "string" ? streamData.trim() : streamData,
      },
    });
  } catch (err: any) {
    console.error("getStream error:", err?.response?.data || err?.message || err);
    return res.status(500).json({
      success: false,
      message: "Unable to resolve stream link from upstream",
    });
  }
}
