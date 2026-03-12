"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  IDKitRequestWidget,
  orbLegacy,
  type IDKitResult,
  type RpContext,
} from "@worldcoin/idkit";
import {
  createPublicClient,
  createWalletClient,
  custom,
  decodeEventLog,
  encodeAbiParameters,
  http,
  keccak256,
} from "viem";
import type { EIP1193Provider } from "viem";
import { baseSepolia } from "viem/chains";
import {
  AlertCircle,
  CheckCircle2,
  MapPin,
  ShieldCheck,
  Wifi,
} from "lucide-react";

import WalletCard from "@/components/wallet/WalletCard";

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

type WorldVerifyResponse = {
  ok: boolean;
  token: string;
  nullifierHash: string;
  expiresAt: number;
};

type RpContextResponse = {
  rp_context: RpContext;
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

function getEthereum() {
  if (typeof window === "undefined") {
    return undefined;
  }
  return ((
    window as Window & {
      ethereum?: EIP1193Provider;
    }
  ).ethereum);
}

export default function EventClient({ eventId }: { eventId: string }) {
  const [step, setStep] = useState<0 | 1 | 2 | 3>(0);
  const [walletAddress, setWalletAddress] = useState("");

  const [event, setEvent] = useState<EventRecord | null>(null);
  const [statusMsg, setStatusMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [attestationUid, setAttestationUid] = useState("");
  const [worldToken, setWorldToken] = useState("");
  const [worldNullifierHash, setWorldNullifierHash] = useState("");
  const [worldStatus, setWorldStatus] = useState("");
  const [isPreparingWorld, setIsPreparingWorld] = useState(false);
  const [isVerifyingWorld, setIsVerifyingWorld] = useState(false);
  const [isWorldModalOpen, setIsWorldModalOpen] = useState(false);
  const [rpContext, setRpContext] = useState<RpContext | null>(null);
  const [artifactCid, setArtifactCid] = useState("");
  const [archiveWarning, setArchiveWarning] = useState("");

  const wifiproofAddress = (
    process.env.NEXT_PUBLIC_WIFIPROOF_ADDRESS ??
    "0xbcEfE9B5a2f1C0FA6f0E02c8c678CF41884e3f7C"
  ).trim();

  const rpcUrl = process.env.NEXT_PUBLIC_BASE_RPC_URL ?? "https://sepolia.base.org";
  const worldAppId = (process.env.NEXT_PUBLIC_WORLD_APP_ID ?? "").trim();
  const worldActionId = (process.env.NEXT_PUBLIC_WORLD_ACTION_ID ?? "").trim();
  const isWorldConfigured = Boolean(worldAppId && worldActionId);

  const publicClient = useMemo(
    () => createPublicClient({ chain: baseSepolia, transport: http(rpcUrl) }),
    [rpcUrl]
  );

  const fetchEvent = useCallback(async () => {
    try {
      const res = await fetch(`/api/events/${eventId}`);
      if (!res.ok) {
        throw new Error("Event not found or invalid event ID.");
      }
      const json = (await res.json()) as { event: EventRecord };
      setEvent(json.event);
    } catch (error) {
      setErrorMsg((error as Error).message);
    }
  }, [eventId]);

  useEffect(() => {
    void fetchEvent();
  }, [fetchEvent]);

  useEffect(() => {
    setWorldToken("");
    setWorldNullifierHash("");
    setWorldStatus("");
    setRpContext(null);
    setIsWorldModalOpen(false);
    setArtifactCid("");
    setArchiveWarning("");
  }, [walletAddress, eventId]);

  async function prepareWorldVerification() {
    try {
      setErrorMsg("");
      setWorldStatus("");

      if (!walletAddress) throw new Error("Connect wallet before World verification.");
      if (!isWorldConfigured) {
        throw new Error("World ID is not configured in environment variables.");
      }

      setIsPreparingWorld(true);
      setWorldStatus("Preparing World verification...");

      const response = await fetch("/api/world/rp-context", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: worldActionId,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to prepare World verification: ${await response.text()}`);
      }

      const result = (await response.json()) as RpContextResponse;
      if (!result.rp_context) {
        throw new Error("Missing rp_context from backend.");
      }

      setRpContext(result.rp_context);
      setIsWorldModalOpen(true);
      setWorldStatus("Open World App to complete verification.");
    } catch (error) {
      setWorldStatus("");
      setErrorMsg((error as Error).message);
    } finally {
      setIsPreparingWorld(false);
    }
  }

  async function handleWorldSuccess(idkitResult: IDKitResult) {
    try {
      setErrorMsg("");
      setIsVerifyingWorld(true);
      setWorldStatus("Confirming World proof...");

      const response = await fetch("/api/world/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          wallet: walletAddress,
          eventId,
          idkitResult,
        }),
      });

      if (!response.ok) {
        throw new Error(`World verification failed: ${await response.text()}`);
      }

      const result = (await response.json()) as WorldVerifyResponse;
      if (!result.ok || !result.token) {
        throw new Error("World verification response missing token.");
      }

      setWorldToken(result.token);
      setWorldNullifierHash(result.nullifierHash);
      setWorldStatus("Humanity verified.");
    } catch (error) {
      setWorldToken("");
      setWorldNullifierHash("");
      setWorldStatus("");
      setErrorMsg((error as Error).message);
    } finally {
      setIsVerifyingWorld(false);
    }
  }

  async function handleClaim() {
    try {
      setErrorMsg("");
      setStatusMsg("Connecting secure environment...");
      setStep(2);

      if (!event) throw new Error("Event data not loaded.");
      if (!walletAddress) throw new Error("Wallet not connected.");
      if (!worldToken) throw new Error("World verification is required before claiming.");
      if (!getEthereum()) throw new Error("Wallet connection lost.");

      setStatusMsg("Verifying venue subnet...");
      const deadline = Math.floor(Date.now() / 1000) + 90;
      const devHeaders: Record<string, string> =
        process.env.NODE_ENV === "development" && event.subnet_prefix
          ? { "x-forwarded-for": `${event.subnet_prefix}1` }
          : {};

      const ipRes = await fetch("/api/verify-ip", {
        method: "POST",
        headers: { "content-type": "application/json", ...devHeaders },
        body: JSON.stringify({
          wallet: walletAddress,
          eventId,
          venueHash: event.venue_hash,
          deadline,
          worldToken,
        }),
      });

      if (!ipRes.ok) {
        throw new Error(`IP verification failed: ${await ipRes.text()}`);
      }
      const { signature: ipSignature } = (await ipRes.json()) as {
        signature: `0x${string}`;
      };

      setStatusMsg("Getting GPS location...");
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject);
      });

      setStatusMsg("Generating zero-knowledge proof...");
      const { WiFiProofProver, buildInputs } = await import("@wifiproof/proof-app");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const circuit = (await loadCircuit()) as any;
      const prover = new WiFiProofProver();
      await prover.init(circuit);

      const inputs = buildInputs(
        { lat: position.coords.latitude, lon: position.coords.longitude },
        { lat: Number(event.venue_lat), lon: Number(event.venue_lon) },
        Number(event.radius_meters),
        eventId
      );

      const { proof, publicInputs } = await prover.generateProof(inputs);
      await prover.destroy();

      const proofHex = uint8ArrayToHex(proof);
      const publicInputsBytes32 = publicInputs.map(toBytes32Hex);
      const proofHash = keccak256(proofHex);
      const publicInputsHash = keccak256(
        encodeAbiParameters([{ type: "bytes32[]" }], [publicInputsBytes32])
      );

      setStatusMsg("Minting attestation on Base Sepolia...");
      const ethereum = getEthereum();
      if (!ethereum) throw new Error("Wallet connection lost.");
      const walletClient = createWalletClient({
        chain: baseSepolia,
        transport: custom(ethereum),
      });

      const txHash = await walletClient.writeContract({
        address: wifiproofAddress as `0x${string}`,
        abi: WIFI_PROOF_ABI,
        functionName: "claimAttendance",
        account: walletAddress as `0x${string}`,
        args: [
          proofHex,
          publicInputsBytes32,
          ipSignature,
          BigInt(deadline),
          eventId as `0x${string}`,
        ],
      });

      setStatusMsg("Waiting for confirmation...");
      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });

      let foundUid = "";
      for (const log of receipt.logs) {
        try {
          const decoded = decodeEventLog({
            abi: WIFI_PROOF_ABI,
            data: log.data,
            topics: log.topics,
          });
          if (decoded.eventName === "AttendanceClaimed") {
            foundUid = decoded.args.attestationUid as string;
            break;
          }
        } catch {
          continue;
        }
      }

      setAttestationUid(foundUid || "Pending indexer sync...");
      setArtifactCid("");
      setArchiveWarning("");

      if (foundUid.startsWith("0x") && foundUid.length === 66) {
        const archiveRes = await fetch("/api/claims/archive", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            eventId,
            wallet: walletAddress,
            txHash,
            attestationUid: foundUid,
            proofHash,
            publicInputsHash,
            worldNullifierHash: worldNullifierHash || undefined,
            network: "base-sepolia",
          }),
        });

        if (archiveRes.ok) {
          const archiveJson = (await archiveRes.json()) as { cid?: string };
          if (archiveJson.cid) {
            setArtifactCid(archiveJson.cid);
          }
        } else {
          const archiveErrorText = await archiveRes.text();
          let warning = "Claim succeeded, but decentralized archival failed.";
          try {
            const parsed = JSON.parse(archiveErrorText) as { error?: string; detail?: string };
            if (parsed.error && parsed.detail) {
              warning = `${warning} ${parsed.error}: ${parsed.detail}`;
            } else if (parsed.error) {
              warning = `${warning} ${parsed.error}`;
            }
          } catch {
            if (archiveErrorText.trim()) {
              warning = `${warning} ${archiveErrorText.trim()}`;
            }
          }
          setArchiveWarning(warning);
        }
      }

      setStatusMsg("");
      setStep(3);
    } catch (error) {
      setErrorMsg((error as Error).message);
      setStep(1);
    }
  }

  return (
    <section className="relative min-h-[100dvh] overflow-x-hidden bg-[#02040A] pb-12 pt-16 text-slate-200">
      <div
        className="pointer-events-none absolute inset-0 z-0 opacity-20 mix-blend-screen"
        style={{
          backgroundImage: "url('/brand/event-proof-visual.png')",
          backgroundSize: "cover",
          backgroundPosition: "top center",
        }}
      />
      <div className="pointer-events-none absolute inset-0 z-0 bg-gradient-to-b from-transparent via-[#02040A]/80 to-[#02040A]" />

      <div className="container relative z-10 mx-auto mt-12 max-w-2xl space-y-8 px-4">
        <div className="space-y-4 text-center">
          <div className="mb-2 inline-flex h-16 w-16 items-center justify-center rounded-full border border-cyan-500/50 bg-cyan-900/30 text-cyan-400">
            <ShieldCheck className="h-8 w-8" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            {event ? event.venue_name : "Loading event..."}
          </h1>
          {event && (
            <div className="flex flex-wrap items-center justify-center gap-4 text-sm font-medium text-slate-400">
              <span className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4" /> Proximity required
              </span>
              <span className="flex items-center gap-1.5">
                <Wifi className="h-4 w-4" /> Subnet check
              </span>
            </div>
          )}
        </div>

        {errorMsg && (
          <div className="flex items-start gap-3 rounded-xl border border-red-900/50 bg-red-950/30 p-4 text-red-400">
            <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0" />
            <p className="text-sm font-medium leading-relaxed">{errorMsg}</p>
          </div>
        )}

        <div className="rounded-3xl border border-cyan-900/30 bg-slate-900/60 p-6 shadow-2xl backdrop-blur-xl sm:p-8">
          {step === 0 && (
            <div className="space-y-6">
              <p className="mb-6 text-center text-sm text-slate-400">
                Connect your wallet to generate a proof of physical presence.
              </p>
              <WalletCard
                walletAddress={walletAddress}
                setWalletAddress={setWalletAddress}
                onReady={() => setStep(1)}
              />
            </div>
          )}

          {step === 1 && (
            <div className="space-y-8 text-center">
              <div className="grid grid-cols-2 gap-4 text-left">
                <div className="rounded-xl border border-cyan-900/30 bg-[#02040A] p-4">
                  <span className="mb-1 block font-mono text-xs text-slate-500">NETWORK</span>
                  <span className="block truncate text-sm font-medium text-cyan-400">
                    Base Sepolia
                  </span>
                </div>
                <div className="rounded-xl border border-cyan-900/30 bg-[#02040A] p-4">
                  <span className="mb-1 block font-mono text-xs text-slate-500">WALLET</span>
                  <span className="block truncate font-mono text-sm text-cyan-400">
                    {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                  </span>
                </div>
              </div>

              <div className="space-y-3 rounded-2xl border border-cyan-900/30 bg-[#02040A] p-4 text-left">
                <button
                  onClick={prepareWorldVerification}
                  disabled={!isWorldConfigured || isPreparingWorld || isVerifyingWorld}
                  className="w-full rounded-xl border border-cyan-500/40 bg-cyan-950/30 py-2.5 text-sm font-semibold text-cyan-300 transition-colors hover:bg-cyan-900/40 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isPreparingWorld
                    ? "Preparing..."
                    : isVerifyingWorld
                      ? "Confirming..."
                      : "Verify with World ID"}
                </button>

                {worldStatus && (
                  <p className="text-xs font-medium text-green-400">{worldStatus}</p>
                )}
                {!isWorldConfigured && (
                  <p className="text-xs font-medium text-amber-400">
                    Missing `NEXT_PUBLIC_WORLD_APP_ID` or `NEXT_PUBLIC_WORLD_ACTION_ID`.
                  </p>
                )}
                <p className="text-xs text-slate-500">
                  Desktop: scan QR in World App. Mobile: World App opens directly.
                </p>
                {worldNullifierHash && (
                  <p className="break-all font-mono text-[11px] text-slate-500">
                    nullifier: {worldNullifierHash}
                  </p>
                )}
              </div>

              <button
                onClick={handleClaim}
                disabled={!worldToken}
                className="w-full rounded-xl bg-cyan-500 py-4 text-lg font-bold text-slate-900 transition-all hover:bg-cyan-400 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-cyan-900/40 disabled:text-slate-400"
              >
                {worldToken ? "Prove Presence & Mint" : "Verify with World first"}
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6 py-8 text-center">
              <div className="relative mx-auto h-16 w-16">
                <div className="absolute inset-0 rounded-full border-2 border-cyan-900/30" />
                <div className="absolute inset-0 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
              </div>
              <div>
                <h3 className="mb-2 text-xl font-bold text-white">Generating Proof</h3>
                <p className="h-6 font-mono text-sm text-cyan-400">{statusMsg}</p>
              </div>
              <p className="mt-4 text-xs text-slate-500">
                This runs on your device. Coordinates are not sent to a server.
              </p>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6 py-6 text-center">
              <CheckCircle2 className="mx-auto h-16 w-16 text-green-400" />
              <div>
                <h3 className="mb-2 text-2xl font-bold text-white">Presence Verified</h3>
                <p className="text-slate-400">Your attendance attestation has been minted.</p>
              </div>
              <div className="rounded-xl border border-green-500/20 bg-[#02040A] p-4 text-left">
                <span className="mb-1 block font-mono text-xs text-slate-500">ATTESTATION UID</span>
                <span className="block break-all font-mono text-sm leading-relaxed text-green-400">
                  {attestationUid}
                </span>
              </div>
              {artifactCid && (
                <div className="rounded-xl border border-cyan-500/20 bg-[#02040A] p-4 text-left">
                  <span className="mb-1 block font-mono text-xs text-slate-500">
                    ARCHIVE CID
                  </span>
                  <span className="block break-all font-mono text-sm leading-relaxed text-cyan-300">
                    {artifactCid}
                  </span>
                </div>
              )}
              {archiveWarning && (
                <p className="text-xs font-medium text-amber-400">{archiveWarning}</p>
              )}
              {attestationUid && attestationUid.startsWith("0x") && (
                <a
                  href={`https://base-sepolia.easscan.org/attestation/view/${attestationUid}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block rounded-xl border border-green-500/30 bg-green-950/20 px-4 py-2 text-sm font-medium text-green-400 transition-colors hover:bg-green-950/40 hover:text-green-300"
                >
                  View on EASScan →
                </a>
              )}
              {artifactCid && (
                <a
                  href={`https://ipfs.io/ipfs/${artifactCid}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block rounded-xl border border-cyan-500/30 bg-cyan-950/20 px-4 py-2 text-sm font-medium text-cyan-300 transition-colors hover:bg-cyan-950/40 hover:text-cyan-200"
                >
                  View archived payload →
                </a>
              )}
            </div>
          )}
        </div>
      </div>

      {isWorldConfigured && rpContext && walletAddress && (
        <IDKitRequestWidget
          open={isWorldModalOpen}
          onOpenChange={setIsWorldModalOpen}
          app_id={worldAppId as `app_${string}`}
          action={worldActionId}
          rp_context={rpContext}
          allow_legacy_proofs={true}
          preset={orbLegacy({ signal: walletAddress.toLowerCase() })}
          onSuccess={handleWorldSuccess}
          onError={(errorCode) => {
            setErrorMsg(`World verification error: ${errorCode}`);
            setWorldStatus("");
          }}
        />
      )}
    </section>
  );
}
