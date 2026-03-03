"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createPublicClient,
  createWalletClient,
  custom,
  decodeEventLog,
  http,
} from "viem";
import { baseSepolia } from "viem/chains";

const WIFI_PROOF_ABI = [
  {
    type: "function",
    name: "claimAttendance",
    stateMutability: "payable",
    inputs: [
      { name: "proof", type: "bytes" },
      { name: "publicInputs", type: "bytes32[]" },
      { name: "ipSignature", type: "bytes" },
      { name: "sigDeadline", type: "uint64" },
      { name: "eventId", type: "bytes32" },
    ],
    outputs: [{ name: "attestationUid", type: "bytes32" }],
  },
  {
    type: "event",
    name: "AttendanceClaimed",
    inputs: [
      { indexed: true, name: "attendee", type: "address" },
      { indexed: true, name: "eventId", type: "bytes32" },
      { indexed: false, name: "attestationUid", type: "bytes32" },
      { indexed: false, name: "timestamp", type: "uint256" },
    ],
  },
] as const;

type EventRecord = {
  event_id: string;
  venue_hash: string;
  subnet_prefix: string;
  start_time: number;
  end_time: number;
  venue_name: string;
  venue_lat: number;
  venue_lon: number;
  radius_meters: number;
};

function toBytes32Hex(value: string) {
  const big = BigInt(value);
  const hex = big.toString(16).padStart(64, "0");
  return `0x${hex}` as `0x${string}`;
}

function uint8ArrayToHex(bytes: Uint8Array) {
  let hex = "";
  for (const byte of bytes) {
    hex += byte.toString(16).padStart(2, "0");
  }
  return `0x${hex}` as `0x${string}`;
}

async function loadCircuit() {
  const mod = await import("@wifiproof/proof-app/circuit/target/circuit.json");
  return mod.default ?? mod;
}

export default function EventClient({ eventId }: { eventId: string }) {
  const [event, setEvent] = useState<EventRecord | null>(null);
  const [status, setStatus] = useState<string>("");
  const [wallet, setWallet] = useState<string>("");
  const [attestationUid, setAttestationUid] = useState<string>("");
  const [feedbackNotes, setFeedbackNotes] = useState<string>("");
  const [feedbackSent, setFeedbackSent] = useState<boolean>(false);

  const wifiproofAddress =
    process.env.NEXT_PUBLIC_WIFIPROOF_ADDRESS ??
    "0xbcEfE9B5a2f1C0FA6f0E02c8c678CF41884e3f7C";

  const rpcUrl =
    process.env.NEXT_PUBLIC_BASE_RPC_URL ?? "https://sepolia.base.org";

  const publicClient = useMemo(() => {
    return createPublicClient({ chain: baseSepolia, transport: http(rpcUrl) });
  }, [rpcUrl]);

  const fetchEvent = useCallback(async () => {
    const res = await fetch(`/api/events/${eventId}`);
    if (!res.ok) {
      throw new Error("Event not found");
    }
    const json = await res.json();
    setEvent(json.event);
  }, [eventId]);

  useEffect(() => {
    fetchEvent().catch((err) => setStatus(err.message));
  }, [fetchEvent]);

  async function connectWallet() {
    if (!window.ethereum) {
      setStatus("Wallet not found. Install a wallet like Coinbase Wallet or MetaMask.");
      return "";
    }

    const walletClient = createWalletClient({
      chain: baseSepolia,
      transport: custom(window.ethereum),
    });
    const [account] = await walletClient.requestAddresses();
    setWallet(account);
    setStatus("");
    return account;
  }

  async function handleClaim() {
    try {
      if (!event) {
        setStatus("Event not loaded.");
        return;
      }

      const account = wallet || (await connectWallet());
      if (!account) {
        return;
      }

      setStatus("Requesting IP signature...");
      const deadline = Math.floor(Date.now() / 1000) + 90;
      const ipRes = await fetch("/api/verify-ip", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          wallet: account,
          eventId,
          venueHash: event.venue_hash,
          deadline,
        }),
      });

      if (!ipRes.ok) {
        const text = await ipRes.text();
        throw new Error(`IP verification failed: ${text}`);
      }

      const ipJson = await ipRes.json();
      const ipSignature = ipJson.signature as `0x${string}`;

      setStatus("Getting GPS location...");
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject);
      });

      const userLat = position.coords.latitude;
      const userLon = position.coords.longitude;

      setStatus("Generating zero-knowledge proof...");
      const { WiFiProofProver, buildInputs } = await import("@wifiproof/proof-app");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const circuit = await loadCircuit() as any;
      const prover = new WiFiProofProver();
      await prover.init(circuit);

      const inputs = buildInputs(
        { lat: userLat, lon: userLon },
        { lat: Number(event.venue_lat), lon: Number(event.venue_lon) },
        Number(event.radius_meters),
        eventId
      );

      const { proof, publicInputs } = await prover.generateProof(inputs);
      await prover.destroy();

      const proofHex = uint8ArrayToHex(proof);
      const publicInputsBytes32 = publicInputs.map(toBytes32Hex);

      setStatus("Submitting on-chain claim...");
      if (!window.ethereum) throw new Error("Wallet not found");
      const walletClient = createWalletClient({
        chain: baseSepolia,
        transport: custom(window.ethereum),
      });

      const txHash = await walletClient.writeContract({
        address: wifiproofAddress as `0x${string}`,
        abi: WIFI_PROOF_ABI,
        functionName: "claimAttendance",
        account: account as `0x${string}`,
        args: [
          proofHex,
          publicInputsBytes32,
          ipSignature,
          BigInt(deadline),
          eventId as `0x${string}`,
        ],
      });

      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
      for (const log of receipt.logs) {
        if (log.address.toLowerCase() !== wifiproofAddress.toLowerCase()) {
          continue;
        }
        try {
          const decoded = decodeEventLog({
            abi: WIFI_PROOF_ABI,
            data: log.data,
            topics: log.topics,
          });
          if (decoded.eventName === "AttendanceClaimed") {
            setAttestationUid(decoded.args.attestationUid as string);
            break;
          }
        } catch (_err) {
          continue;
        }
      }

      setStatus("Claim complete.");
    } catch (error) {
      setStatus(`Error: ${(error as Error).message}`);
    }
  }

  async function handleFeedback(worked: boolean) {
    const account = wallet || (await connectWallet());
    if (!account) {
      return;
    }

    await fetch("/api/feedback", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        eventId,
        wallet: account,
        worked,
        notes: feedbackNotes,
      }),
    });
    setFeedbackSent(true);
  }

  return (
    <section className="mx-auto max-w-3xl space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold">Event Check-In</h1>
        <p className="text-white/70">Event ID: {eventId}</p>
      </div>

      {event && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-2">
          <h2 className="text-xl font-semibold">{event.venue_name}</h2>
          <p className="text-sm text-white/70">
            {new Date(Number(event.start_time) * 1000).toLocaleString()} —{" "}
            {new Date(Number(event.end_time) * 1000).toLocaleString()}
          </p>
        </div>
      )}

      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-4">
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={connectWallet}
            className="rounded-lg border border-white/20 px-4 py-2 text-sm text-white/80 hover:bg-white/10"
          >
            {wallet ? `Wallet: ${wallet.slice(0, 6)}...` : "Connect wallet"}
          </button>
          <button
            type="button"
            onClick={handleClaim}
            className="rounded-lg bg-white px-4 py-2 font-semibold text-black hover:bg-white/90"
          >
            Prove & Mint
          </button>
        </div>

        {status && <p className="text-sm text-white/70">{status}</p>}
        {attestationUid && (
          <p className="break-all text-sm text-white/70">
            Attestation UID: {attestationUid}
          </p>
        )}
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-3">
        <h3 className="text-lg font-semibold">Feedback</h3>
        {feedbackSent ? (
          <p className="text-sm text-white/70">Thanks — feedback received.</p>
        ) : (
          <>
            <textarea
              className="min-h-[100px] w-full rounded-lg bg-black/40 p-3 text-white"
              placeholder="Any issues or notes?"
              value={feedbackNotes}
              onChange={(e) => setFeedbackNotes(e.target.value)}
            />
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => handleFeedback(true)}
                className="rounded-lg bg-white px-4 py-2 font-semibold text-black"
              >
                Worked
              </button>
              <button
                type="button"
                onClick={() => handleFeedback(false)}
                className="rounded-lg border border-white/20 px-4 py-2 text-sm text-white/80 hover:bg-white/10"
              >
                Had issues
              </button>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
