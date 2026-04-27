import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const JSON_RPC_METHODS = new Set([
  "eth_blockNumber",
  "eth_call",
  "eth_chainId",
  "eth_estimateGas",
  "eth_feeHistory",
  "eth_gasPrice",
  "eth_getBalance",
  "eth_getBlockByNumber",
  "eth_getCode",
  "eth_getLogs",
  "eth_getStorageAt",
  "eth_getTransactionByHash",
  "eth_getTransactionCount",
  "eth_getTransactionReceipt",
  "eth_sendRawTransaction",
  "eth_sendTransaction",
  "eth_simulateV1",
  "net_version",
  "wallet_getCapabilities",
]);

export async function POST(request: Request) {
  const rpcUrl =
    process.env.BASE_RPC_URL?.trim() ??
    process.env.NEXT_PUBLIC_BASE_RPC_URL?.trim() ??
    "https://sepolia.base.org";

  try {
    const body = await request.json();
    const method = body?.method;

    if (typeof method !== "string" || !JSON_RPC_METHODS.has(method)) {
      return NextResponse.json(
        { error: "Unsupported RPC method" },
        { status: 400 }
      );
    }

    const response = await fetch(rpcUrl, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });

    const text = await response.text();

    return new NextResponse(text, {
      status: response.status,
      headers: {
        "content-type": response.headers.get("content-type") ?? "application/json",
        "cache-control": "no-store",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "RPC proxy failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
