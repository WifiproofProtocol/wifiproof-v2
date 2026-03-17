"use client";

import Image from "next/image";
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
  ArrowUpRight,
  AlertCircle,
  CheckCircle2,
  Loader2,
  MapPin,
  ShieldCheck,
  Wifi,
} from "lucide-react";

import WalletCard from "@/components/wallet/WalletCard";
import { getInjectedEthereum } from "@/lib/wallet-provider";

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
  event_description: string | null;
  venue_lat: number;
  venue_lon: number;
  radius_meters: number;
  poster_image_url: string | null;
};

type WorldVerifyResponse = {
  ok: boolean;
  token: string;
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

function formatEventWindow(start: number, end: number) {
  const startDate = new Date(start * 1000);
  const endDate = new Date(end * 1000);
  const sameDay = startDate.toDateString() === endDate.toDateString();

  if (sameDay) {
    return `${startDate.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    })} · ${startDate.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    })} - ${endDate.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    })}`;
  }

  return `${startDate.toLocaleString()} - ${endDate.toLocaleString()}`;
}

export default function EventClient({ eventId }: { eventId: string }) {
  const [step, setStep] = useState<0 | 1 | 2 | 3>(0);
  const [walletAddress, setWalletAddress] = useState("");

  const [event, setEvent] = useState<EventRecord | null>(null);
  const [statusMsg, setStatusMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [attestationUid, setAttestationUid] = useState("");
  const [worldToken, setWorldToken] = useState("");
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

  const handleWalletReady = useCallback(() => setStep(1), []);
  const stageLabels = [
    "Connect wallet",
    "Verify attendee",
    "Generate proof",
    "Mint attestation",
  ] as const;
  const processingSteps = [
    { label: "Verify venue network", match: "Verifying venue subnet" },
    { label: "Read GPS location", match: "Getting GPS location" },
    { label: "Generate ZK proof", match: "Generating zero-knowledge proof" },
    { label: "Prepare wallet transaction", match: "Preparing mint transaction" },
    { label: "Wait for chain confirmation", match: "Waiting for confirmation" },
    { label: "Archive claim receipt", match: "Archiving claim receipt" },
  ] as const;
  const processingIndex = Math.max(
    processingSteps.findIndex((item) => statusMsg.includes(item.match)),
    0
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
      setWorldStatus("Humanity verified.");
    } catch (error) {
      setWorldToken("");
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
      if (!getInjectedEthereum()) throw new Error("Wallet connection lost.");

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

      setStatusMsg("Preparing mint transaction...");
      const ethereum = getInjectedEthereum() as EIP1193Provider | undefined;
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
        setStatusMsg("Archiving claim receipt...");
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
    <section className="relative min-h-[100dvh] overflow-x-hidden bg-[#f4f8ff] pb-16 pt-20 text-[#10233f]">
      <div
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          backgroundImage:
            "radial-gradient(circle at 10% 12%, rgba(96,165,250,0.18), transparent 26%), radial-gradient(circle at 88% 0%, rgba(37,99,235,0.12), transparent 24%), linear-gradient(rgba(59,130,246,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.03) 1px, transparent 1px)",
          backgroundSize: "auto, auto, 42px 42px, 42px 42px",
        }}
      />

      <div className="relative z-10 mx-auto max-w-6xl space-y-8 px-4 md:px-6">
        <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div className="space-y-4">
            <p className="section-kicker">Attendee check-in</p>
            <h1 className="display-type text-4xl leading-[0.98] tracking-[-0.04em] text-[#10233f] md:text-6xl">
              {event ? event.venue_name : "Loading event details..."}
            </h1>
            <p className="max-w-2xl text-base leading-8 text-[#52637e] md:text-lg">
              {event?.event_description?.trim()
                ? event.event_description
                : "Verify humanity, prove on-site presence, and mint your attendance attestation without exposing your exact coordinates."}
            </p>

            <div className="flex flex-wrap items-center gap-3 text-sm text-[#486284]">
              <span className="inline-flex items-center gap-2 rounded-full border border-[#cfe1ff] bg-white/80 px-3 py-2">
                <ShieldCheck className="h-4 w-4 text-[#2563eb]" />
                Privacy-preserving proof
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-[#cfe1ff] bg-white/80 px-3 py-2">
                <MapPin className="h-4 w-4 text-[#2563eb]" />
                Radius check
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-[#cfe1ff] bg-white/80 px-3 py-2">
                <Wifi className="h-4 w-4 text-[#2563eb]" />
                Venue network
              </span>
            </div>

            {event && (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-[1.4rem] border border-[#cfe1ff] bg-white/86 px-4 py-4 shadow-[0_18px_50px_rgba(37,99,235,0.08)]">
                  <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-[#5e7ca8]">
                    Event window
                  </span>
                  <p className="text-sm font-medium leading-7 text-[#10233f]">
                    {formatEventWindow(event.start_time, event.end_time)}
                  </p>
                </div>
                <div className="rounded-[1.4rem] border border-[#cfe1ff] bg-white/86 px-4 py-4 shadow-[0_18px_50px_rgba(37,99,235,0.08)]">
                  <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-[#5e7ca8]">
                    Attendance boundary
                  </span>
                  <p className="text-sm font-medium leading-7 text-[#10233f]">
                    Within {event.radius_meters} meters of the venue center
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="overflow-hidden rounded-[2rem] border border-[#cfe1ff] bg-white/84 shadow-[0_28px_80px_rgba(37,99,235,0.12)]">
            {event?.poster_image_url ? (
              <div className="relative aspect-[16/10] bg-[#dcecff]">
                <Image
                  src={event.poster_image_url}
                  alt={`${event.venue_name} poster`}
                  fill
                  unoptimized
                  className="object-cover"
                />
              </div>
            ) : (
              <div className="aspect-[16/10] bg-[radial-gradient(circle_at_top_left,_rgba(96,165,250,0.36),_transparent_28%),linear-gradient(135deg,_#dbeafe,_#eff6ff_52%,_#ffffff)] px-8 py-10">
                <div className="flex h-full flex-col justify-between">
                  <div className="inline-flex h-14 w-14 items-center justify-center rounded-full border border-white/60 bg-white/70 text-[#2563eb] shadow-lg">
                    <ShieldCheck className="h-7 w-7" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#2563eb]">
                      WiFiProof event
                    </p>
                    <p className="mt-3 max-w-sm text-2xl font-semibold leading-tight text-[#10233f]">
                      {event ? event.venue_name : "Preparing secure check-in"}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-4">
          {stageLabels.map((label, index) => {
            const isActive = step === index;
            const isComplete = step > index;

            return (
              <div
                key={label}
                className={`rounded-[1.35rem] border px-4 py-4 transition-colors ${
                  isActive
                    ? "border-[#6a8fcb] bg-[#e7f0ff]"
                    : isComplete
                      ? "border-[#b9cfad] bg-[#eef4ea]"
                      : "border-[#d7e4f6] bg-white/70"
                }`}
              >
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#5f7698]">
                  Step {index + 1}
                </p>
                <p className="mt-2 text-sm font-semibold text-[#10233f]">{label}</p>
              </div>
            );
          })}
        </div>

        {errorMsg && (
          <div className="flex items-start gap-3 rounded-[1.5rem] border border-[#e0b7b2] bg-[#fff3f1] p-4 text-[#a5483c]">
            <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0" />
            <p className="text-sm font-medium leading-7">{errorMsg}</p>
          </div>
        )}

        {step === 0 && (
          <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="rounded-[2rem] border border-[#cfe1ff] bg-white/86 p-6 shadow-[0_24px_70px_rgba(37,99,235,0.08)] md:p-8">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#5e7ca8]">
                Step 1
              </p>
              <h2 className="display-type mt-3 text-3xl leading-tight tracking-[-0.03em] text-[#10233f] md:text-4xl">
                Connect the wallet you want the attendance attestation tied to.
              </h2>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-[#52637e] md:text-base">
                This wallet becomes the attestation recipient on Base Sepolia.
                After connecting, you will verify humanity and then generate the
                proof locally on your device.
              </p>
              <div className="mt-6">
                <WalletCard
                  walletAddress={walletAddress}
                  setWalletAddress={setWalletAddress}
                  onReady={handleWalletReady}
                />
              </div>
            </div>

            <div className="ink-panel rounded-[2rem] p-6 md:p-8">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#d6e7ff]">
                What happens next
              </p>
              <ul className="mt-6 space-y-4 text-sm leading-7 text-[#e8f1ff] md:text-base">
                <li className="flex items-start gap-3">
                  <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#8fc0ff]" />
                  <span>Verify you are a unique attendee before claiming.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#8fc0ff]" />
                  <span>Generate the proximity proof in your browser.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#8fc0ff]" />
                  <span>Mint the attendance attestation on Base Sepolia.</span>
                </li>
              </ul>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="rounded-[2rem] border border-[#cfe1ff] bg-white/86 p-6 shadow-[0_24px_70px_rgba(37,99,235,0.08)] md:p-8">
              <div className="flex flex-col gap-4 border-b border-[#dbe8fb] pb-6 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#5e7ca8]">
                    Step 2
                  </p>
                  <h2 className="display-type mt-3 text-3xl leading-tight tracking-[-0.03em] text-[#10233f] md:text-4xl">
                    Verify humanity, then mint your proof of presence.
                  </h2>
                </div>
                <div className="rounded-full bg-[#e8f0ff] px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#2563eb]">
                  Wallet connected
                </div>
              </div>

              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                <div className="rounded-[1.4rem] border border-[#d7e4f6] bg-[#f8fbff] p-4">
                  <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-[#5e7ca8]">
                    Network
                  </span>
                  <p className="text-sm font-semibold text-[#10233f]">Base Sepolia</p>
                </div>
                <div className="rounded-[1.4rem] border border-[#d7e4f6] bg-[#f8fbff] p-4">
                  <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-[#5e7ca8]">
                    Wallet
                  </span>
                  <p className="truncate font-mono text-sm text-[#2563eb]">
                    {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                  </p>
                </div>
              </div>

              <div className="mt-6 rounded-[1.6rem] border border-[#d7e4f6] bg-[#f8fbff] p-5">
                <button
                  onClick={prepareWorldVerification}
                  disabled={!isWorldConfigured || isPreparingWorld || isVerifyingWorld}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#2563eb] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#1d4ed8] disabled:cursor-not-allowed disabled:bg-[#9db8e4]"
                >
                  {isPreparingWorld ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Preparing World verification...
                    </>
                  ) : isVerifyingWorld ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Confirming World proof...
                    </>
                  ) : (
                    "Verify with World ID"
                  )}
                </button>

                {worldStatus && (
                  <p className="mt-4 text-sm font-medium text-[#1d6f42]">{worldStatus}</p>
                )}
                {!isWorldConfigured && (
                  <p className="mt-4 text-sm font-medium text-[#9c6a0a]">
                    World ID is not configured in this environment.
                  </p>
                )}
                <p className="mt-3 text-xs leading-6 text-[#6a7891]">
                  Desktop: scan the QR in World App. Mobile: World App opens
                  directly.
                </p>
              </div>

              <button
                onClick={handleClaim}
                disabled={!worldToken}
                className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#10233f] px-5 py-4 text-sm font-semibold text-white transition hover:bg-[#17345e] disabled:cursor-not-allowed disabled:bg-[#96abc8]"
              >
                {worldToken ? "Prove presence and mint" : "Verify with World first"}
              </button>
            </div>

            <div className="space-y-4">
              <aside className="rounded-[1.75rem] border border-[#cfe1ff] bg-white/86 p-5 shadow-[0_18px_50px_rgba(37,99,235,0.08)]">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#5e7ca8]">
                  What we verify before minting
                </p>
                <ul className="mt-4 space-y-3 text-sm leading-7 text-[#52637e]">
                  <li>World-based humanity check</li>
                  <li>Venue network presence via signed IP check</li>
                  <li>Local zero-knowledge proximity proof</li>
                  <li>Event binding and on-chain contract verification</li>
                </ul>
              </aside>

              <aside className="ink-panel rounded-[1.75rem] p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#d6e7ff]">
                  Event details
                </p>
                <div className="mt-4 space-y-4 text-sm leading-7 text-[#e8f1ff]">
                  <div>
                    <span className="block text-xs uppercase tracking-[0.14em] text-[#c0d8ff]">
                      Time
                    </span>
                    <span>{event ? formatEventWindow(event.start_time, event.end_time) : "-"}</span>
                  </div>
                  {event?.event_description?.trim() && (
                    <div>
                      <span className="block text-xs uppercase tracking-[0.14em] text-[#c0d8ff]">
                        About this event
                      </span>
                      <span>{event.event_description}</span>
                    </div>
                  )}
                  <div>
                    <span className="block text-xs uppercase tracking-[0.14em] text-[#c0d8ff]">
                      Radius
                    </span>
                    <span>{event ? `${event.radius_meters}m boundary` : "-"}</span>
                  </div>
                  <div>
                    <span className="block text-xs uppercase tracking-[0.14em] text-[#c0d8ff]">
                      Event ID
                    </span>
                    <span className="block break-all font-mono text-xs text-[#cfe1ff]">
                      {eventId}
                    </span>
                  </div>
                </div>
              </aside>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
            <div className="ink-panel rounded-[2rem] p-8">
              <Loader2 className="h-12 w-12 animate-spin text-[#d6e7ff]" />
              <p className="mt-8 text-xs font-semibold uppercase tracking-[0.18em] text-[#d6e7ff]">
                Step 3
              </p>
              <h2 className="display-type mt-3 text-4xl leading-tight tracking-[-0.03em] text-white md:text-5xl">
                Building your on-site proof.
              </h2>
              <p className="mt-4 text-sm leading-7 text-[#d6e7ff] md:text-base">
                We are checking the venue network, reading geolocation in the
                browser, generating the ZK proof locally, sending the wallet
                transaction, and archiving the claim receipt.
              </p>
              <div className="mt-8 rounded-[1.5rem] border border-white/10 bg-white/5 p-4 font-mono text-sm text-[#f5f9ff]">
                {statusMsg}
              </div>
              <p className="mt-4 text-xs leading-6 text-[#c6d9f7]">
                Your exact coordinates are not sent to the backend while this is happening.
              </p>
            </div>

            <div className="rounded-[2rem] border border-[#cfe1ff] bg-white/86 p-6 shadow-[0_24px_70px_rgba(37,99,235,0.08)] md:p-8">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#5e7ca8]">
                Current progress
              </p>
              <div className="mt-6 space-y-4">
                {processingSteps.map((item, index) => {
                  const isComplete = processingIndex > index;
                  const isCurrent = processingIndex === index;

                  return (
                    <div
                      key={item.label}
                      className={`flex items-center gap-4 rounded-[1.25rem] border px-4 py-4 ${
                        isCurrent
                          ? "border-[#6a8fcb] bg-[#e7f0ff]"
                          : isComplete
                            ? "border-[#b9cfad] bg-[#eef4ea]"
                            : "border-[#dbe8fb] bg-[#f8fbff]"
                      }`}
                    >
                      <div
                        className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold ${
                          isCurrent
                            ? "bg-[#10233f] text-white"
                            : isComplete
                              ? "bg-[#567845] text-white"
                              : "bg-white text-[#5e7ca8]"
                        }`}
                      >
                        {isCurrent ? <Loader2 className="h-4 w-4 animate-spin" /> : index + 1}
                      </div>
                      <p className="text-sm font-medium text-[#10233f]">{item.label}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="ink-panel rounded-[2rem] p-8">
              <CheckCircle2 className="h-16 w-16 text-[#a7d99a]" />
              <p className="mt-8 text-xs font-semibold uppercase tracking-[0.18em] text-[#d6e7ff]">
                Step 4
              </p>
              <h2 className="display-type mt-3 text-4xl leading-tight tracking-[-0.03em] text-white md:text-5xl">
                Presence verified.
              </h2>
              <p className="mt-4 text-sm leading-7 text-[#d6e7ff] md:text-base">
                Your attendance attestation has been minted on Base Sepolia and
                can now be referenced as proof that you were there.
              </p>

              <div className="mt-8 rounded-[1.5rem] border border-white/10 bg-white/5 p-4">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.14em] text-[#d6e7ff]">
                  Attestation UID
                </span>
                <span className="block break-all font-mono text-sm text-[#f5f9ff]">
                  {attestationUid}
                </span>
              </div>

              {artifactCid && (
                <div className="mt-4 rounded-[1.5rem] border border-white/10 bg-white/5 p-4">
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.14em] text-[#d6e7ff]">
                    Archive CID
                  </span>
                  <span className="block break-all font-mono text-sm text-[#f5f9ff]">
                    {artifactCid}
                  </span>
                </div>
              )}

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                {attestationUid && attestationUid.startsWith("0x") && (
                  <a
                    href={`https://base-sepolia.easscan.org/attestation/view/${attestationUid}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-[#f5f9ff] px-5 py-3 text-sm font-semibold text-[#10233f] transition hover:bg-white"
                  >
                    View on EASScan
                    <ArrowUpRight className="h-4 w-4" />
                  </a>
                )}
                {artifactCid && (
                  <a
                    href={`https://ipfs.io/ipfs/${artifactCid}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-white/12 px-5 py-3 text-sm font-semibold text-[#f5f9ff] transition hover:bg-white/6"
                  >
                    View archived payload
                    <ArrowUpRight className="h-4 w-4" />
                  </a>
                )}
              </div>
            </div>

            <div className="space-y-4">
              {event?.poster_image_url && (
                <div className="overflow-hidden rounded-[1.75rem] border border-[#cfe1ff] bg-white/86 shadow-[0_18px_50px_rgba(37,99,235,0.08)]">
                  <div className="relative aspect-[16/10] bg-[#dcecff]">
                    <Image
                      src={event.poster_image_url}
                      alt={`${event.venue_name} poster`}
                      fill
                      unoptimized
                      className="object-cover"
                    />
                  </div>
                </div>
              )}

              <div className="rounded-[1.75rem] border border-[#cfe1ff] bg-white/86 p-5 shadow-[0_18px_50px_rgba(37,99,235,0.08)]">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#5e7ca8]">
                  Receipt summary
                </p>
                <div className="mt-4 space-y-4 text-sm leading-7 text-[#52637e]">
                  <div>
                    <span className="block text-xs uppercase tracking-[0.14em] text-[#6a89b6]">
                      Event
                    </span>
                    <span>{event?.venue_name ?? "-"}</span>
                  </div>
                  <div>
                    <span className="block text-xs uppercase tracking-[0.14em] text-[#6a89b6]">
                      Event window
                    </span>
                    <span>
                      {event ? formatEventWindow(event.start_time, event.end_time) : "-"}
                    </span>
                  </div>
                  {event?.event_description?.trim() && (
                    <div>
                      <span className="block text-xs uppercase tracking-[0.14em] text-[#6a89b6]">
                        Description
                      </span>
                      <span>{event.event_description}</span>
                    </div>
                  )}
                </div>
              </div>

              {archiveWarning && (
                <div className="rounded-[1.75rem] border border-[#edd9a3] bg-[#fff8e8] p-5 text-sm font-medium leading-7 text-[#8d6a00]">
                  {archiveWarning}
                </div>
              )}
            </div>
          </div>
        )}
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
