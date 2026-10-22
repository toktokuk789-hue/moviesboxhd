import { Request, Response } from "express";
import getInfo from "../lib/getInfo";

export default async function mediaInfo(req: Request, res: Response) {
  const { id } = req.query;
  if (!id || typeof id !== "string") {
    return res.status(400).json({
      success: false,
      message: "Please provide a valid IMDb ID (e.g. ?id=tt1877830)",
    });
  }

  try {
    const data = await getInfo(id.trim());
    return res.json(data);
  } catch (err: any) {
    console.error("mediaInfo error:", err);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}
