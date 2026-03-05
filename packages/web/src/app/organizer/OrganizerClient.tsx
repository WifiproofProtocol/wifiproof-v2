"use client";

import { useMemo, useState } from "react";
import QRCode from "qrcode";
import {
  createPublicClient,
  createWalletClient,
  custom,
  http,
  keccak256,
  toBytes,
} from "viem";
import type { EIP1193Provider } from "viem";
import { baseSepolia } from "viem/chains";
import {
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Loader2,
  MapPin,
} from "lucide-react";

import WalletCard from "@/components/wallet/WalletCard";

const WIFI_PROOF_ABI = [
  {
    type: "function",
    name: "owner",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  {
    type: "function",
    name: "computeVenueHashFromScaled",
    stateMutability: "pure",
    inputs: [
      { name: "venueLatScaled", type: "int256" },
      { name: "venueLonScaled", type: "int256" },
      { name: "thresholdSqScaled", type: "uint256" },
      { name: "eventId", type: "bytes32" },
    ],
    outputs: [{ name: "", type: "bytes32" }],
  },
  {
    type: "function",
    name: "createEvent",
    stateMutability: "nonpayable",
    inputs: [
      { name: "eventId", type: "bytes32" },
      { name: "venueHash", type: "bytes32" },
      { name: "startTime", type: "uint64" },
      { name: "endTime", type: "uint64" },
      { name: "venueName", type: "string" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "createEventWithSig",
    stateMutability: "nonpayable",
    inputs: [
      { name: "organizer", type: "address" },
      { name: "eventId", type: "bytes32" },
      { name: "venueHash", type: "bytes32" },
      { name: "startTime", type: "uint64" },
      { name: "endTime", type: "uint64" },
      { name: "venueName", type: "string" },
      { name: "deadline", type: "uint64" },
      { name: "signature", type: "bytes" },
    ],
    outputs: [],
  },
] as const;

function toScaled(coord: number) {
  return Math.round(coord * 1_000_000);
}

function thresholdSqScaled(radiusMeters: number) {
  const radiusScaled = Math.floor((radiusMeters * 1_000_000) / 111_320);
  return BigInt(radiusScaled) * BigInt(radiusScaled);
}

function uint8ArrayToHex(bytes: Uint8Array) {
  let hex = "";
  for (const byte of bytes) {
    hex += byte.toString(16).padStart(2, "0");
  }
  return `0x${hex}`;
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

export default function OrganizerClient() {
  const [step, setStep] = useState<0 | 1 | 2 | 3>(0);
  const [walletAddress, setWalletAddress] = useState("");

  const [venueName, setVenueName] = useState("");
  const [venueLat, setVenueLat] = useState("");
  const [venueLon, setVenueLon] = useState("");
  const [radiusMeters, setRadiusMeters] = useState("150");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [subnetPrefix, setSubnetPrefix] = useState("");

  const [statusMsg, setStatusMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [eventId, setEventId] = useState("");
  const [venueHash, setVenueHash] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState("");

  const wifiproofAddress = (
    process.env.NEXT_PUBLIC_WIFIPROOF_ADDRESS ??
    "0xbcEfE9B5a2f1C0FA6f0E02c8c678CF41884e3f7C"
  ).trim();

  const rpcUrl = process.env.NEXT_PUBLIC_BASE_RPC_URL ?? "https://sepolia.base.org";

  const publicClient = useMemo(
    () => createPublicClient({ chain: baseSepolia, transport: http(rpcUrl) }),
    [rpcUrl]
  );

  async function handleUseCurrentLocation() {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setVenueLat(pos.coords.latitude.toFixed(6));
        setVenueLon(pos.coords.longitude.toFixed(6));
      },
      (err) => setErrorMsg(`Location error: ${err.message}`)
    );
  }

  async function handleCreateEvent() {
    try {
      setErrorMsg("");
      setStatusMsg("Preparing event payload...");
      setStep(2);

      if (!venueName || !venueLat || !venueLon || !startTime || !endTime || !subnetPrefix) {
        throw new Error("Missing required fields.");
      }
      if (!walletAddress) {
        throw new Error("Wallet not connected.");
      }
      if (!getEthereum()) {
        throw new Error("Wallet connection lost.");
      }

      const lat = Number(venueLat);
      const lon = Number(venueLon);
      const radius = Number(radiusMeters);
      const start = Math.floor(new Date(startTime).getTime() / 1000);
      const end = Math.floor(new Date(endTime).getTime() / 1000);

      if (Number.isNaN(lat) || Number.isNaN(lon) || Number.isNaN(radius)) {
        throw new Error("Invalid coordinates or radius.");
      }
      if (!Number.isFinite(start) || !Number.isFinite(end) || start >= end) {
        throw new Error("Invalid event times.");
      }

      const eventSeed = `${venueName}:${start}:${end}`;
      const derivedEventId = keccak256(toBytes(eventSeed));
      const scaledLat = BigInt(toScaled(lat));
      const scaledLon = BigInt(toScaled(lon));
      const thresholdSq = thresholdSqScaled(radius);

      setStatusMsg("Computing venue hash...");
      const computedVenueHash = await publicClient.readContract({
        address: wifiproofAddress as `0x${string}`,
        abi: WIFI_PROOF_ABI,
        functionName: "computeVenueHashFromScaled",
        args: [scaledLat, scaledLon, thresholdSq, derivedEventId],
      });

      setStatusMsg("Generating organizer proof...");
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject);
      });

      const { WiFiProofProver, buildInputs } = await import("@wifiproof/proof-app");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const circuit = (await loadCircuit()) as any;
      const prover = new WiFiProofProver();
      await prover.init(circuit);

      const inputs = buildInputs(
        { lat: position.coords.latitude, lon: position.coords.longitude },
        { lat, lon },
        radius,
        derivedEventId
      );

      const { proof, publicInputs } = await prover.generateProof(inputs);
      await prover.destroy();

      const proofHex = uint8ArrayToHex(proof);
      const publicInputsBytes32 = publicInputs.map((value) => {
        const hex = BigInt(value).toString(16).padStart(64, "0");
        return `0x${hex}`;
      }) as `0x${string}`[];

      setStatusMsg("Requesting organizer authorization...");
      const deadline = Math.floor(Date.now() / 1000) + 120;
      const devHeaders: Record<string, string> =
        process.env.NODE_ENV === "development"
          ? { "x-forwarded-for": `${subnetPrefix}1` }
          : {};

      const authorizeResponse = await fetch("/api/events/authorize", {
        method: "POST",
        headers: { "content-type": "application/json", ...devHeaders },
        body: JSON.stringify({
          organizer: walletAddress,
          eventId: derivedEventId,
          venueHash: computedVenueHash,
          startTime: start,
          endTime: end,
          venueName,
          deadline,
          subnetPrefix,
          proof: proofHex,
          publicInputs: publicInputsBytes32,
        }),
      });

      if (!authorizeResponse.ok) {
        throw new Error(`Authorization failed: ${await authorizeResponse.text()}`);
      }
      const { signature } = (await authorizeResponse.json()) as { signature: `0x${string}` };

      setStatusMsg("Confirm transaction in your wallet...");
      const ethereum = getEthereum();
      if (!ethereum) throw new Error("Wallet connection lost.");
      const walletClient = createWalletClient({
        chain: baseSepolia,
        transport: custom(ethereum),
      });

      const txHash = await walletClient.writeContract({
        address: wifiproofAddress as `0x${string}`,
        abi: WIFI_PROOF_ABI,
        functionName: "createEventWithSig",
        account: walletAddress as `0x${string}`,
        args: [
          walletAddress as `0x${string}`,
          derivedEventId,
          computedVenueHash,
          BigInt(start),
          BigInt(end),
          venueName,
          BigInt(deadline),
          signature,
        ],
      });

      setStatusMsg("Waiting for Base Sepolia confirmation...");
      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
      if (receipt.status !== "success") {
        throw new Error("Transaction failed. Event not created.");
      }

      setStatusMsg("Saving metadata...");
      const saveResponse = await fetch("/api/events/create", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          eventId: derivedEventId,
          venueHash: computedVenueHash,
          subnetPrefix,
          startTime: start,
          endTime: end,
          venueName,
          venueLat: lat,
          venueLon: lon,
          radiusMeters: radius,
        }),
      });
      if (!saveResponse.ok) {
        throw new Error("Failed to save event metadata.");
      }

      const eventUrl = `${window.location.origin}/event/${derivedEventId}`;
      setQrDataUrl(
        await QRCode.toDataURL(eventUrl, {
          margin: 1,
          width: 300,
          color: { dark: "#02040A", light: "#FFFFFF" },
        })
      );

      setEventId(derivedEventId);
      setVenueHash(computedVenueHash);
      setStep(3);
      setStatusMsg("");
    } catch (error) {
      setErrorMsg((error as Error).message);
      setStep(1);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="space-y-2">
        <h1 className="text-4xl font-bold tracking-tight text-white">Event Setup</h1>
        <p className="text-lg text-slate-400">
          Secure your venue with zero-knowledge attendance.
        </p>
      </div>

      {errorMsg && (
        <div className="flex items-start gap-3 rounded-xl border border-red-900/50 bg-red-950/30 p-4 text-red-400">
          <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0" />
          <p className="text-sm font-medium leading-relaxed">{errorMsg}</p>
        </div>
      )}

      {step === 0 && (
        <WalletCard
          walletAddress={walletAddress}
          setWalletAddress={setWalletAddress}
          onReady={() => setStep(1)}
        />
      )}

      {step === 1 && (
        <div className="space-y-6 rounded-3xl border border-cyan-900/30 bg-slate-900/60 p-6 shadow-2xl backdrop-blur-xl sm:p-8">
          <div className="mb-6 flex items-center gap-3 border-b border-cyan-900/30 pb-6">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-cyan-500/10 font-mono text-sm font-bold text-cyan-400">
              2
            </div>
            <h2 className="text-xl font-bold text-white">Venue Configuration</h2>
          </div>

          <label className="grid gap-2">
            <span className="text-sm font-medium text-slate-300">Event Name</span>
            <input
              className="w-full rounded-xl border border-cyan-900/30 bg-[#02040A] px-4 py-3 text-white placeholder:text-slate-600 focus:border-cyan-500/50 focus:outline-none"
              value={venueName}
              onChange={(e) => setVenueName(e.target.value)}
              placeholder="ETH Safari - Day 1"
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2">
              <span className="text-sm font-medium text-slate-300">Latitude</span>
              <input
                className="w-full rounded-xl border border-cyan-900/30 bg-[#02040A] px-4 py-3 font-mono text-white placeholder:text-slate-600 focus:border-cyan-500/50 focus:outline-none"
                value={venueLat}
                onChange={(e) => setVenueLat(e.target.value)}
                placeholder="-1.1018"
              />
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-medium text-slate-300">Longitude</span>
              <input
                className="w-full rounded-xl border border-cyan-900/30 bg-[#02040A] px-4 py-3 font-mono text-white placeholder:text-slate-600 focus:border-cyan-500/50 focus:outline-none"
                value={venueLon}
                onChange={(e) => setVenueLon(e.target.value)}
                placeholder="37.0144"
              />
            </label>
          </div>

          <button
            type="button"
            onClick={handleUseCurrentLocation}
            className="flex items-center gap-2 text-sm font-medium text-cyan-400 transition-colors hover:text-cyan-300"
          >
            <MapPin className="h-4 w-4" /> Fetch My Current Coordinates
          </button>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2">
              <span className="text-sm font-medium text-slate-300">Radius (meters)</span>
              <input
                className="w-full rounded-xl border border-cyan-900/30 bg-[#02040A] px-4 py-3 font-mono text-white placeholder:text-slate-600 focus:border-cyan-500/50 focus:outline-none"
                value={radiusMeters}
                onChange={(e) => setRadiusMeters(e.target.value)}
              />
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-medium text-slate-300">WiFi Subnet Prefix</span>
              <input
                className="w-full rounded-xl border border-cyan-900/30 bg-[#02040A] px-4 py-3 font-mono text-white placeholder:text-slate-600 focus:border-cyan-500/50 focus:outline-none"
                value={subnetPrefix}
                onChange={(e) => setSubnetPrefix(e.target.value)}
                placeholder="192.168.1."
              />
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2">
              <span className="text-sm font-medium text-slate-300">Start Time</span>
              <input
                type="datetime-local"
                className="w-full rounded-xl border border-cyan-900/30 bg-[#02040A] px-4 py-3 text-white focus:border-cyan-500/50 focus:outline-none"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-medium text-slate-300">End Time</span>
              <input
                type="datetime-local"
                className="w-full rounded-xl border border-cyan-900/30 bg-[#02040A] px-4 py-3 text-white focus:border-cyan-500/50 focus:outline-none"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </label>
          </div>

          <button
            type="button"
            onClick={handleCreateEvent}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-500 px-4 py-4 font-bold text-slate-900 transition-all hover:bg-cyan-400 active:scale-[0.98]"
          >
            Generate ZK Proof & Mint Event <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-6 rounded-3xl border border-cyan-900/30 bg-slate-900/60 p-12 text-center shadow-2xl backdrop-blur-xl">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-cyan-400" />
          <h2 className="text-2xl font-bold text-white tracking-tight">Processing Setup</h2>
          <p className="font-mono text-sm text-slate-400">{statusMsg}</p>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-8 rounded-3xl border border-green-500/30 bg-slate-900/60 p-8 text-center shadow-[0_0_40px_rgba(34,197,94,0.1)] backdrop-blur-xl sm:p-12">
          <CheckCircle2 className="mx-auto h-16 w-16 text-green-400" />
          <div>
            <h2 className="mb-2 text-3xl font-bold text-white">Event Secured</h2>
            <p className="text-slate-400">Your event is live on Base Sepolia.</p>
          </div>

          <div className="mx-auto max-w-md space-y-4 rounded-2xl border border-cyan-900/30 bg-[#02040A] p-6 text-left">
            <div>
              <span className="mb-1 block font-mono text-xs text-slate-500">EVENT ID</span>
              <span className="block break-all font-mono text-sm text-cyan-400">
                {eventId}
              </span>
            </div>
            <div>
              <span className="mb-1 block font-mono text-xs text-slate-500">VENUE HASH</span>
              <span className="block break-all font-mono text-sm text-cyan-400">
                {venueHash}
              </span>
            </div>
          </div>

          {qrDataUrl && (
            <div className="flex flex-col items-center justify-center space-y-4 border-t border-cyan-900/30 pt-6">
              <span className="text-sm font-medium text-slate-300">Print & display at venue</span>
              <div className="rounded-2xl bg-white p-4 shadow-xl">
                <img src={qrDataUrl} alt="Event Check-in QR code" className="h-48 w-48" />
              </div>
              <a
                href={`/event/${eventId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-sm text-cyan-400 underline underline-offset-4 hover:text-cyan-300"
              >
                {typeof window !== "undefined" ? window.location.origin : ""}/event/{eventId}
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
