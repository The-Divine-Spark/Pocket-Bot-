import { NextResponse } from "next/server";
import { think } from "../../../brain";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const message = body.message?.trim();

    if (!message) {
      return NextResponse.json(
        { error: "No message provided" },
        { status: 400 }
      );
    }

    const reply = await think(message);

    return NextResponse.json({ reply });
  } catch (error) {
    console.error("API chat error:", error);

    return NextResponse.json(
      { error: "Server error processing request" },
      { status: 500 }
    );
  }
}
