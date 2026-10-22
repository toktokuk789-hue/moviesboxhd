import axios from "axios";

export async function getPlayerUrl(): Promise<string> {
  const baseUrl = process.env.BASE_URL || "https://allmovieland.link/player.js?v=60%20128";
  
  try {
    const res = await axios.get(baseUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "*/*",
      },
      timeout: 10000,
    });
    
    const resText = typeof res.data === "string" ? res.data : JSON.stringify(res.data);
    const match = resText.match(/const\s+AwsIndStreamDomain\s*=\s*'([^']+)'/);
    if (!match || !match[1]) {
      throw new Error("Could not parse stream domain from base URL");
    }
    return match[1];
  } catch (error: any) {
    console.error("Error fetching player URL:", error?.message || error);
    // Fallback known active domain if upstream resolver fails
    return "https://slast430did.com";
  }
}
