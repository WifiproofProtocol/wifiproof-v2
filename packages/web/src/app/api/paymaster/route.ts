import { NextRequest, NextResponse } from "next/server";

const PAYMASTER_METHODS = new Set(["pm_getPaymasterData", "pm_getPaymasterStubData"]);

export async function POST(request: NextRequest) {
  const paymasterUrl = process.env.CDP_PAYMASTER_URL?.trim();

  if (!paymasterUrl) {
    return NextResponse.json(
      { error: "Paymaster proxy is not configured." },
      { status: 503 }
    );
  }

  try {
    const body = (await request.json()) as { method?: string };

    if (!body?.method || !PAYMASTER_METHODS.has(body.method)) {
      return NextResponse.json(
        { error: "Unsupported paymaster method." },
        { status: 400 }
      );
    }

    const response = await fetch(paymasterUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });

    const text = await response.text();
    let data: unknown = null;
    if (text) {
      try {
        data = JSON.parse(text) as unknown;
      } catch {
        data = { error: text };
      }
    }

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("[paymaster-proxy] request failed", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
