# MoviesBoxHD API

High-performance REST API for resolving Movies and TV Series streaming links using IMDb IDs.

- **Streaming Protocol:** Direct HLS (`.m3u8`) streaming links.
- **Languages Supported:** Multi-audio support (English, Hindi, Bengali, Tamil, Telugu, etc.).
- **Built-in Security:** Optional API Key authentication (`x-api-key`).

---

## Quick Start

### 1. Installation

```bash
git clone https://github.com/toktokuk789-hue/moviesboxhd.git
cd moviesboxhd
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Edit `.env`:
```env
PORT=3000
BASE_URL=https://allmovieland.link/player.js?v=60%20128
RATE_LIMIT=true
API_KEY=your_optional_secret_api_key_here
```
*(If `API_KEY` is left blank, the API will be publicly accessible without authentication).*

### 3. Run

```bash
# Build TypeScript
npm run build

# Start Production Server
npm run start

# Or Run in Development Mode
npm run dev
```

---

## API Documentation

### 1. Get Media Info
Fetches available audio tracks and tokens for a movie or TV show.

- **Endpoint:** `GET /api/v1/mediaInfo?id={IMDb_ID}`
- **Example:** `GET /api/v1/mediaInfo?id=tt1877830`
- **Headers:** `x-api-key: your_key` *(if API_KEY is set)*
- **Response:**
```json
{
  "success": true,
  "data": {
    "playlist": [
      {
        "title": "English",
        "id": "fd93fd0a7fc57f1e0c9c54110322a05f",
        "file": "~GTE1z8T8rAcuWI3QaGEKR0oNFlOEr6grKv-..."
      },
      {
        "title": "Hindi",
        "id": "24b8c045e7fcd28fb2ee654de75a5771",
        "file": "~0ALZ3tMP71lNTMdSBfbldjRRjLuTyceuX41..."
      }
    ],
    "key": "JMGYgScwnlLzrUjks+bJsezEO8sQTo-cadEkMfn..."
  }
}
```

---

### 2. Get Seasons & Episodes (TV Shows)
Provides season and episode counts for series.

- **Endpoint:** `GET /api/v1/getSeasonList?id={IMDb_ID}`
- **Example:** `GET /api/v1/getSeasonList?id=tt11737520`
- **Headers:** `x-api-key: your_key` *(if API_KEY is set)*
- **Response:**
```json
{
  "success": true,
  "data": {
    "seasons": [
      {
        "season": "Season 1",
        "totalEpisodes": 8,
        "lang": ["Hindi", "English"]
      }
    ],
    "type": "tv"
  }
}
```

---

### 3. Resolve Direct Stream URL
Converts the `file` token and `key` from step 1 into a direct `.m3u8` link.

- **Endpoint:** `POST /api/v1/getStream`
- **Headers:**
  - `Content-Type: application/json`
  - `x-api-key: your_key` *(if API_KEY is set)*
- **Body:**
```json
{
  "file": "~GTE1z8T8rAcuWI3QaGEKR0oNFlOEr6grKv-...",
  "key": "JMGYgScwnlLzrUjks+bJsezEO8sQTo-cadEkMfn..."
}
```
- **Response:**
```json
{
  "success": true,
  "data": {
    "link": "https://i-arch-400.krico443jez.com/.../index.m3u8"
  }
}
```

---

## Deployment

### Deploy to Render
1. Create a Web Service on [Render](https://render.com).
2. Connect this repository (`toktokuk789-hue/moviesboxhd`).
3. Set build command: `npm install && npm run build`
4. Set start command: `npm run start`
5. Add environment variables (`BASE_URL`, `API_KEY`, `RATE_LIMIT`).

### Docker
```bash
docker build -t moviesboxhd-api .
docker run -p 3000:3000 -d moviesboxhd-api
```

---

## License
ISC
