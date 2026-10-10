import * as Ably from "ably";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "~/server/better-auth";
import { UserRoles } from "~/types/types";

export const runtime = "nodejs";

const apiKey = process.env.ABLY_API_KEY;

export async function POST() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== UserRoles.DRIVER) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!apiKey) {
    return NextResponse.json(
      { error: "Could not find server API key" },
      { status: 500 },
    );
  }

  try {
    const ably = new Ably.Rest({ key: apiKey });

    const tokenRequest = await ably.auth.createTokenRequest({
      clientId: session.user.id,
      capability: JSON.stringify({
        "driver-events": ["subscribe"],
      }),
    });

    return NextResponse.json(tokenRequest);
  } catch (error) {
    return NextResponse.json(
      { error: `Could not create token: ${error}` },
      { status: 500 },
    );
  }
}
