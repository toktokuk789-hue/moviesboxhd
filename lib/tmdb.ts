import axios from "axios";

const TMDB_BASE_URL = "https://api.themoviedb.org/3";

export function getTmdbHeaders() {
  const token =
    process.env.TMDB_READ_ACCESS_TOKEN ||
    "eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiI0NmNkMDU1NzVmYWQ1OTM4MDlkYjVkZjA3MWY0NzI0YiIsIm5iZiI6MTc5MjE1MzU1NC44NTksInN1YiI6IjZhZDIxN2QyZGI0YmYxMmI2MmIzZWQ0OCIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.lrPzI9MX8N8imMPx6jaCRd-EKeC35mS5e3YYlvajEVo";

  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/json",
  };
}

export async function tmdbGet(path: string, params: Record<string, any> = {}) {
  const apiKey = process.env.TMDB_API_KEY || "46cd05575fad593809db5df071f4724b";
  const url = `${TMDB_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;

  const response = await axios.get(url, {
    headers: getTmdbHeaders(),
    params: {
      api_key: apiKey,
      ...params,
    },
    timeout: 10000,
  });

  return response.data;
}

export async function searchMedia(query: string, page = 1, type: "multi" | "movie" | "tv" = "multi") {
  const endpoint = type === "movie" ? "/search/movie" : type === "tv" ? "/search/tv" : "/search/multi";
  return await tmdbGet(endpoint, { query, page, include_adult: false });
}

export async function getTrending(mediaType: "all" | "movie" | "tv" = "all", timeWindow: "day" | "week" = "day") {
  return await tmdbGet(`/trending/${mediaType}/${timeWindow}`);
}

export async function getPopular(mediaType: "movie" | "tv" = "movie", page = 1) {
  return await tmdbGet(`/${mediaType}/popular`, { page });
}

export async function getDetails(id: string | number, mediaType: "movie" | "tv" = "movie") {
  return await tmdbGet(`/${mediaType}/${id}`, {
    append_to_response: "external_ids,videos,credits,recommendations",
  });
}

/**
 * Resolves an IMDb ID (e.g. tt1375666).
 * If the input already starts with 'tt', returns it immediately.
 * If given a numeric TMDB ID, looks up external_ids from TMDB.
 */
export async function resolveImdbId(
  id: string,
  hintType?: "movie" | "tv"
): Promise<{ imdbId: string; type?: "movie" | "tv" } | null> {
  const trimmed = id.trim();
  if (trimmed.startsWith("tt")) {
    return { imdbId: trimmed, type: hintType };
  }

  // If numeric ID, query TMDB external_ids
  if (/^\d+$/.test(trimmed)) {
    if (hintType === "tv") {
      try {
        const tvData = await tmdbGet(`/tv/${trimmed}/external_ids`);
        if (tvData?.imdb_id) return { imdbId: tvData.imdb_id, type: "tv" };
      } catch {}
    } else if (hintType === "movie") {
      try {
        const movieData = await tmdbGet(`/movie/${trimmed}/external_ids`);
        if (movieData?.imdb_id) return { imdbId: movieData.imdb_id, type: "movie" };
      } catch {}
    } else {
      // Try movie first, then tv
      try {
        const movieData = await tmdbGet(`/movie/${trimmed}/external_ids`);
        if (movieData?.imdb_id) return { imdbId: movieData.imdb_id, type: "movie" };
      } catch {}

      try {
        const tvData = await tmdbGet(`/tv/${trimmed}/external_ids`);
        if (tvData?.imdb_id) return { imdbId: tvData.imdb_id, type: "tv" };
      } catch {}
    }
  }

  return null;
}
