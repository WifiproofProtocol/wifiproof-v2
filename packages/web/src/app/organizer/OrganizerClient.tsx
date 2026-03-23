"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import {
  createPublicClient,
  http,
  keccak256,
  toBytes,
} from "viem";
import { baseSepolia } from "viem/chains";
import { useAccount, useWalletClient } from "wagmi";
import {
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  ImagePlus,
  Loader2,
  MapPin,
  Wifi,
  X,
} from "lucide-react";

import WalletCard from "@/components/wallet/WalletCard";
import DateTimePicker from "@/components/DateTimePicker";
import { preparePosterImage } from "@/lib/poster-image";

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
    name: "isOrganizer",
    stateMutability: "view",
    inputs: [{ name: "", type: "address" }],
    outputs: [{ name: "", type: "bool" }],
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

type NetworkPrefixResponse = {
  ok: true;
  ip: string;
  suggestedPrefix: string;
  source: "request" | "ipify";
  family: "ipv4" | "ipv6" | "unknown";
  scope: "private" | "public" | "loopback" | "unknown";
};

type OrganizerAccessState = "idle" | "checking" | "approved" | "rejected";

export default function OrganizerClient() {
  const [step, setStep] = useState<0 | 1 | 2 | 3>(0);
  const [walletReady, setWalletReady] = useState(false);
  const [organizerAccess, setOrganizerAccess] = useState<OrganizerAccessState>("idle");
  const handleWalletReady = useCallback(() => setWalletReady(true), []);
  const { address } = useAccount();
  const walletAddress = address ?? "";

  const [venueName, setVenueName] = useState("");
  const [eventDescription, setEventDescription] = useState("");
  const [venueLat, setVenueLat] = useState("");
  const [venueLon, setVenueLon] = useState("");
  const [radiusMeters, setRadiusMeters] = useState("150");
  const [startDateTime, setStartDateTime] = useState<Date | null>(() => new Date());
  const [endDateTime, setEndDateTime] = useState<Date | null>(
    () => new Date(Date.now() + 2 * 60 * 60 * 1000)
  );
  const [subnetPrefix, setSubnetPrefix] = useState("");
  const [posterImageUrl, setPosterImageUrl] = useState("");
  const [posterFileName, setPosterFileName] = useState("");
  const [isPosterProcessing, setIsPosterProcessing] = useState(false);
  const [isResolvingPrefix, setIsResolvingPrefix] = useState(false);
  const [detectedNetworkHint, setDetectedNetworkHint] = useState("");

  const [statusMsg, setStatusMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [eventId, setEventId] = useState("");
  const [venueHash, setVenueHash] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState("");
  const { data: walletClient } = useWalletClient();
  const wifiproofAddress = (
    process.env.NEXT_PUBLIC_WIFIPROOF_ADDRESS ??
    "0xbcEfE9B5a2f1C0FA6f0E02c8c678CF41884e3f7C"
  ).trim();
  const organizerContactEmail = process.env.NEXT_PUBLIC_ORGANIZER_CONTACT_EMAIL?.trim();
  const organizerContactHref = organizerContactEmail
    ? `mailto:${organizerContactEmail}?subject=WiFiProof organizer access`
    : "https://x.com/WiFiProof";
  const organizerContactLabel = organizerContactEmail ?? "@WiFiProof on X";

  const rpcUrl = process.env.NEXT_PUBLIC_BASE_RPC_URL ?? "https://sepolia.base.org";

  const publicClient = useMemo(
    () => createPublicClient({ chain: baseSepolia, transport: http(rpcUrl) }),
    [rpcUrl]
  );

  useEffect(() => {
    if (!walletAddress && step !== 0) {
      setStep(0);
    }
    if (!walletAddress) {
      setWalletReady(false);
      setOrganizerAccess("idle");
    }
  }, [step, walletAddress]);

  useEffect(() => {
    if (!walletAddress) {
      return;
    }

    let cancelled = false;
    setOrganizerAccess("checking");

    void Promise.all([
      publicClient.readContract({
        address: wifiproofAddress as `0x${string}`,
        abi: WIFI_PROOF_ABI,
        functionName: "owner",
      }),
      publicClient.readContract({
        address: wifiproofAddress as `0x${string}`,
        abi: WIFI_PROOF_ABI,
        functionName: "isOrganizer",
        args: [walletAddress as `0x${string}`],
      }),
    ])
      .then(([owner, allowed]) => {
        if (cancelled) return;
        const approved =
          owner.toLowerCase() === walletAddress.toLowerCase() || Boolean(allowed);
        setOrganizerAccess(approved ? "approved" : "rejected");
      })
      .catch((error) => {
        console.error("[organizer] allowlist check failed", error);
        if (!cancelled) {
          setOrganizerAccess("rejected");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [publicClient, walletAddress, wifiproofAddress]);

  useEffect(() => {
    if (walletReady && organizerAccess === "approved" && step === 0) {
      setStep(1);
    }
  }, [organizerAccess, step, walletReady]);

  useEffect(() => {
    if (step > 0 && organizerAccess !== "approved") {
      setStep(0);
    }
  }, [organizerAccess, step]);

  const stageLabels = [
    "Connect wallet",
    "Configure venue",
    "Authorize event",
    "Share check-in",
  ] as const;

  const processingSteps = [
    { label: "Prepare payload", match: "Preparing event payload" },
    { label: "Compute venue hash", match: "Computing venue hash" },
    { label: "Generate organizer proof", match: "Generating organizer proof" },
    { label: "Check organizer access", match: "Requesting organizer authorization" },
    { label: "Confirm wallet transaction", match: "Confirm transaction in your wallet" },
    { label: "Wait for chain confirmation", match: "Waiting for Base Sepolia confirmation" },
    { label: "Save event metadata", match: "Saving metadata" },
  ] as const;

  const inputClass =
    "w-full rounded-[1.25rem] border border-[#d2c5b0] bg-[#fbf7ee] px-4 py-3.5 text-[#1f1b17] placeholder:text-[#948674] shadow-sm transition focus:border-[#8c765b] focus:outline-none";
  const labelClass =
    "mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-[#6c6459]";

  const processingIndex = Math.max(
    processingSteps.findIndex((item) => statusMsg.includes(item.match)),
    0
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

  async function handlePosterSelection(file: File | null) {
    if (!file) {
      return;
    }

    try {
      setErrorMsg("");
      setIsPosterProcessing(true);
      const preparedPoster = await preparePosterImage(file);
      setPosterImageUrl(preparedPoster);
      setPosterFileName(file.name);
    } catch (error) {
      setErrorMsg((error as Error).message);
    } finally {
      setIsPosterProcessing(false);
    }
  }

  async function handleUseCurrentPrefix() {
    try {
      setErrorMsg("");
      setIsResolvingPrefix(true);
      const response = await fetch("/api/network/prefix", { cache: "no-store" });
      if (!response.ok) {
        throw new Error(`Failed to detect network prefix: ${await response.text()}`);
      }

      const result = (await response.json()) as NetworkPrefixResponse;
      setSubnetPrefix(result.suggestedPrefix);
      setDetectedNetworkHint(
        `Detected ${result.ip} via ${result.source === "request" ? "request IP" : "ipify"}.`
      );
    } catch (error) {
      setErrorMsg((error as Error).message);
    } finally {
      setIsResolvingPrefix(false);
    }
  }

  async function handleCreateEvent() {
    try {
      setErrorMsg("");
      setStatusMsg("Preparing event payload...");
      setStep(2);

      if (
        !venueName ||
        !venueLat ||
        !venueLon ||
        !startDateTime ||
        !endDateTime ||
        !subnetPrefix
      ) {
        throw new Error("Missing required fields.");
      }
      if (!walletAddress) {
        throw new Error("Wallet not connected.");
      }
      if (!walletClient) {
        throw new Error("Wallet connection lost.");
      }

      const lat = Number(venueLat);
      const lon = Number(venueLon);
      const radius = Number(radiusMeters);
      const normalizedVenueName = venueName.trim();
      const normalizedEventDescription = eventDescription.trim();
      const normalizedSubnetPrefix = subnetPrefix.trim();

      const start = Math.floor(startDateTime.getTime() / 1000);
      const end = Math.floor(endDateTime.getTime() / 1000);

      if (Number.isNaN(lat) || Number.isNaN(lon) || Number.isNaN(radius)) {
        throw new Error("Invalid coordinates or radius.");
      }
      if (!Number.isFinite(start) || !Number.isFinite(end) || start >= end) {
        throw new Error("Invalid event times.");
      }
      if (!normalizedVenueName || !normalizedSubnetPrefix) {
        throw new Error("Missing required fields.");
      }

      const eventSeed = `${normalizedVenueName}:${start}:${end}`;
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
          venueName: normalizedVenueName,
          eventDescription: normalizedEventDescription,
          deadline,
          subnetPrefix: normalizedSubnetPrefix,
          posterImageUrl,
          proof: proofHex,
          publicInputs: publicInputsBytes32,
        }),
      });

      if (!authorizeResponse.ok) {
        throw new Error(`Authorization failed: ${await authorizeResponse.text()}`);
      }
      const { signature, metadataToken } = (await authorizeResponse.json()) as {
        signature?: `0x${string}`;
        metadataToken?: string;
      };

      if (!signature || !metadataToken) {
        throw new Error("Authorization response missing required fields.");
      }

      setStatusMsg("Confirm transaction in your wallet...");
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
          normalizedVenueName,
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
          organizer: walletAddress,
          eventId: derivedEventId,
          venueHash: computedVenueHash,
          subnetPrefix: normalizedSubnetPrefix,
          startTime: start,
          endTime: end,
          venueName: normalizedVenueName,
          eventDescription: normalizedEventDescription,
          venueLat: lat,
          venueLon: lon,
          radiusMeters: radius,
          posterImageUrl,
          txHash,
          metadataToken,
        }),
      });
      if (!saveResponse.ok) {
        throw new Error(`Failed to save event metadata: ${await saveResponse.text()}`);
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
      setStep(walletAddress ? 1 : 0);
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="space-y-3">
        <p className="section-kicker">Organizer setup</p>
        <h1 className="display-type text-4xl leading-tight tracking-[-0.03em] text-[#1f1b17] md:text-5xl">
          Create your event.
        </h1>
        <p className="max-w-2xl text-base leading-8 text-[#5f564d] md:text-lg">
          Approved organizers can set the venue, publish the attendee page, and
          share the QR from here.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        {stageLabels.map((label, index) => {
          const isActive = step === index;
          const isComplete = step > index;

          return (
            <div
              key={label}
              className={`rounded-[1.4rem] border px-4 py-4 transition-colors ${
                isActive
                  ? "border-[#7b684f] bg-[#efe2d0]"
                  : isComplete
                    ? "border-[#a8c09b] bg-[#eef4ea]"
                    : "border-[#d2c5b0] bg-white/55"
              }`}
            >
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#6c6459]">
                Step {index + 1}
              </p>
              <p className="mt-2 text-sm font-semibold text-[#1f1b17]">{label}</p>
            </div>
          );
        })}
      </div>

      {errorMsg && (
        <div className="flex items-start gap-3 rounded-[1.5rem] border border-[#d8b3ab] bg-[#fff2ef] p-4 text-[#a5483c]">
          <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0" />
          <p className="text-sm font-medium leading-7">{errorMsg}</p>
        </div>
      )}

      {step === 0 && (
        <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-[2rem] border border-[#d2c5b0] bg-white/70 p-6 shadow-[0_24px_60px_rgba(57,43,30,0.08)] md:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#6c6459]">
              Step 1
            </p>
            <h2 className="display-type mt-3 text-3xl leading-tight tracking-[-0.03em] text-[#1f1b17] md:text-4xl">
              Connect your organizer wallet.
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-[#5f564d] md:text-base">
              We will check whether the connected wallet is approved before the
              event form is unlocked.
            </p>
            <div className="mt-6">
              <WalletCard
                walletAddress={walletAddress}
                onReady={handleWalletReady}
              />
            </div>
          </div>

          <div className="space-y-4">
            <aside className="rounded-[1.75rem] border border-[#d2c5b0] bg-white/70 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#6c6459]">
                Status
              </p>

              {!walletAddress && (
                <p className="mt-4 text-sm leading-7 text-[#5f564d]">
                  Connect a wallet to check access.
                </p>
              )}

              {walletAddress && organizerAccess === "checking" && (
                <div className="mt-4 flex items-center gap-3 text-sm font-medium text-[#1f1b17]">
                  <Loader2 className="h-4 w-4 animate-spin text-[#2563eb]" />
                  Checking organizer access...
                </div>
              )}

              {walletAddress && organizerAccess === "approved" && (
                <div className="mt-4 rounded-[1.35rem] border border-[#b9cfad] bg-[#eef4ea] p-4">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-[#5f6f52]" />
                    <div>
                      <p className="text-sm font-semibold text-[#1f1b17]">
                        Organizer approved
                      </p>
                      <p className="text-xs leading-6 text-[#52604a]">
                        Your setup form is ready.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {walletAddress && organizerAccess === "rejected" && (
                <div className="mt-4 rounded-[1.35rem] border border-[#e2cbc4] bg-[#fff3ef] p-4">
                  <p className="text-sm font-semibold text-[#7d3f33]">
                    This wallet is not approved yet.
                  </p>
                  <p className="mt-2 text-xs leading-6 text-[#7b5c53]">
                    Request organizer access first, then come back to setup.
                  </p>
                  <a
                    href={organizerContactHref}
                    target={organizerContactEmail ? undefined : "_blank"}
                    rel={organizerContactEmail ? undefined : "noreferrer noopener"}
                    className="mt-4 inline-flex rounded-full border border-[#dfb4ab] bg-white px-4 py-2 text-sm font-semibold text-[#7d3f33] transition hover:bg-[#fff9f7]"
                  >
                    Contact {organizerContactLabel}
                  </a>
                </div>
              )}
            </aside>

            <aside className="ink-panel rounded-[1.75rem] p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#ccb9a2]">
                Setup includes
              </p>
              <ul className="mt-4 space-y-3 text-sm leading-7 text-[#e8ddd1]">
                <li>Event details and poster</li>
                <li>Venue location and radius</li>
                <li>Wi-Fi subnet and schedule</li>
                <li>Shareable attendee page and QR</li>
              </ul>
            </aside>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_340px]">
          <div className="rounded-[2rem] border border-[#d2c5b0] bg-white/70 p-6 shadow-[0_24px_60px_rgba(57,43,30,0.08)] md:p-8">
            <div className="flex flex-col gap-4 border-b border-[#d8cebf] pb-6 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#6c6459]">
                  Step 2
                </p>
                <h2 className="display-type mt-3 text-3xl leading-tight tracking-[-0.03em] text-[#1f1b17] md:text-4xl">
                  Set the event details.
                </h2>
              </div>
              <div className="rounded-full bg-[#efe2d0] px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#7b684f]">
                Approved organizer
              </div>
            </div>

            <div className="mt-8 space-y-6">
              <section className="rounded-[1.75rem] border border-[#ded4c5] bg-[#fbf7ee] p-5">
                <h3 className="text-lg font-semibold text-[#1f1b17]">Event identity</h3>

                <label className="mt-5 block">
                  <span className={labelClass}>Event name</span>
                  <input
                    className={inputClass}
                    value={venueName}
                    onChange={(e) => setVenueName(e.target.value)}
                    placeholder="ETH Safari - Day 1"
                  />
                </label>

                <label className="mt-5 block">
                  <span className={labelClass}>Short description</span>
                  <textarea
                    className={`${inputClass} min-h-[132px] resize-y`}
                    value={eventDescription}
                    onChange={(e) => setEventDescription(e.target.value)}
                    placeholder="Tell attendees what this event is, what room they are checking into, or what they should expect before minting."
                    maxLength={500}
                  />
                  <span className="mt-2 block text-right text-xs leading-6 text-[#6a7891]">
                    {eventDescription.trim().length}/500
                  </span>
                </label>
              </section>

              <section className="rounded-[1.75rem] border border-[#ded4c5] bg-[#fbf7ee] p-5">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-[#1f1b17]">Event poster</h3>
                    <p className="mt-2 text-sm leading-7 text-[#5f564d]">Shown on the event page and list.</p>
                  </div>
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-[#d2c5b0] bg-white px-4 py-2 text-sm font-medium text-[#1f1b17] transition hover:bg-[#f3ebdf]">
                    {isPosterProcessing ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <ImagePlus className="h-4 w-4" />
                        Upload poster
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="hidden"
                      onChange={(event) => {
                        const file = event.target.files?.[0] ?? null;
                        void handlePosterSelection(file);
                        event.currentTarget.value = "";
                      }}
                    />
                  </label>
                </div>

                {posterImageUrl ? (
                  <div className="mt-5 overflow-hidden rounded-[1.5rem] border border-[#d7e4f6] bg-white">
                    <div className="relative aspect-[16/9] bg-[#eaf2ff]">
                      <Image
                        src={posterImageUrl}
                        alt="Poster preview"
                        fill
                        unoptimized
                        className="object-cover"
                      />
                    </div>
                    <div className="flex flex-col gap-3 px-4 py-4 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-[#1f1b17]">
                          {posterFileName || "Event poster ready"}
                        </p>
                        <p className="text-xs leading-6 text-[#6a7891]">
                          This artwork will appear on the attendee page and the
                          events index.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setPosterImageUrl("");
                          setPosterFileName("");
                        }}
                        className="inline-flex items-center gap-2 rounded-full border border-[#d8c6bc] px-3 py-2 text-sm font-medium text-[#7b4d2e] transition hover:bg-[#fff6f0]"
                      >
                        <X className="h-4 w-4" />
                        Remove poster
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-5 rounded-[1.5rem] border border-dashed border-[#c8d9f2] bg-white/70 px-4 py-8 text-center">
                    <p className="text-sm font-medium text-[#1f1b17]">
                      No poster uploaded yet
                    </p>
                    <p className="mt-2 text-xs leading-6 text-[#6a7891]">
                      A wide poster works best. PNG, JPEG, and WebP are
                      accepted.
                    </p>
                  </div>
                )}
              </section>

              <section className="rounded-[1.75rem] border border-[#ded4c5] bg-[#fbf7ee] p-5">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-[#1f1b17]">Venue boundary</h3>
                    <p className="mt-2 text-sm leading-7 text-[#5f564d]">Guests must be inside this radius.</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleUseCurrentLocation}
                    className="inline-flex items-center gap-2 rounded-full border border-[#d2c5b0] bg-white px-4 py-2 text-sm font-medium text-[#1f1b17] transition hover:bg-[#f3ebdf]"
                  >
                    <MapPin className="h-4 w-4" /> Use current location
                  </button>
                </div>

                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className={labelClass}>Latitude</span>
                    <input
                      className={`${inputClass} font-mono`}
                      value={venueLat}
                      onChange={(e) => setVenueLat(e.target.value)}
                      placeholder="-1.1018"
                    />
                  </label>
                  <label className="block">
                    <span className={labelClass}>Longitude</span>
                    <input
                      className={`${inputClass} font-mono`}
                      value={venueLon}
                      onChange={(e) => setVenueLon(e.target.value)}
                      placeholder="37.0144"
                    />
                  </label>
                </div>

                <div className="mt-4 max-w-xs">
                  <label className="block">
                    <span className={labelClass}>Radius (meters)</span>
                    <input
                      className={`${inputClass} font-mono`}
                      value={radiusMeters}
                      onChange={(e) => setRadiusMeters(e.target.value)}
                    />
                  </label>
                </div>
              </section>

              <section className="rounded-[1.75rem] border border-[#ded4c5] bg-[#fbf7ee] p-5">
                <h3 className="text-lg font-semibold text-[#1f1b17]">
                  Network and time window
                </h3>
                <p className="mt-2 text-sm leading-7 text-[#5f564d]">
                  Attendees must be on the venue network during this window.
                </p>

                <label className="mt-5 block">
                  <span className={labelClass}>WiFi subnet prefix</span>
                  <input
                    className={`${inputClass} font-mono`}
                    value={subnetPrefix}
                    onChange={(e) => setSubnetPrefix(e.target.value)}
                    placeholder="192.168.1."
                  />
                </label>

                <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <button
                    type="button"
                    onClick={handleUseCurrentPrefix}
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-[#d2c5b0] bg-white px-4 py-2 text-sm font-medium text-[#1f1b17] transition hover:bg-[#f3ebdf]"
                  >
                    {isResolvingPrefix ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Detecting network...
                      </>
                    ) : (
                      <>
                        <Wifi className="h-4 w-4" />
                        Use current network prefix
                      </>
                    )}
                  </button>
                  <p className="text-xs leading-6 text-[#6a7891]">
                    Uses the same request IP check as the backend.
                  </p>
                </div>

                {detectedNetworkHint && (
                  <p className="mt-3 text-xs leading-6 text-[#4870ad]">
                    {detectedNetworkHint}
                  </p>
                )}

                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <DateTimePicker
                    label="Start"
                    value={startDateTime}
                    onChange={setStartDateTime}
                  />
                  <DateTimePicker
                    label="End"
                    value={endDateTime}
                    onChange={setEndDateTime}
                    minDate={startDateTime ?? undefined}
                  />
                </div>

                <p className="mt-4 text-xs leading-6 text-[#7a7063]">
                  Times use your local timezone while configuring.
                </p>
              </section>
            </div>

            <button
              type="button"
              onClick={handleCreateEvent}
              className="mt-8 flex w-full items-center justify-center gap-2 rounded-full bg-[#201b18] px-5 py-4 text-sm font-semibold text-[#f7f1e7] transition hover:bg-[#362e27] active:scale-[0.99]"
            >
              Create organizer proof and event page <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          <div className="space-y-4">
            <aside className="rounded-[1.75rem] border border-[#d2c5b0] bg-white/70 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#6c6459]">Saved</p>
              <ul className="mt-4 space-y-3 text-sm leading-7 text-[#5f564d]">
                <li>Event ID and venue hash</li>
                <li>Event name, summary, and schedule</li>
                <li>Poster artwork for the attendee page</li>
                <li>Shareable attendee page and QR code</li>
              </ul>
            </aside>

            <aside className="ink-panel rounded-[1.75rem] p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#ccb9a2]">Private</p>
              <ul className="mt-4 space-y-3 text-sm leading-7 text-[#e8ddd1]">
                <li>Exact attendee coordinates</li>
                <li>Raw device location history</li>
                <li>Guest emails, phones, and identity fields</li>
              </ul>
            </aside>

            <aside className="rounded-[1.75rem] border border-[#d2c5b0] bg-[#efe2d0] p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#7b684f]">Before publish</p>
              <p className="mt-4 text-sm leading-7 text-[#5b5249]">
                Check the poster, network prefix, and schedule one more time.
              </p>
            </aside>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="ink-panel rounded-[2rem] p-8">
            <Loader2 className="h-12 w-12 animate-spin text-[#ccb9a2]" />
            <p className="mt-8 text-xs font-semibold uppercase tracking-[0.18em] text-[#ccb9a2]">
              Step 3
            </p>
            <h2 className="display-type mt-3 text-4xl leading-tight tracking-[-0.03em] text-white md:text-5xl">
              Publishing your event.
            </h2>
            <p className="mt-4 text-sm leading-7 text-[#d7c7b6] md:text-base">
              Generating the organizer proof, sending the transaction, and saving the event.
            </p>
            <div className="mt-8 rounded-[1.5rem] border border-white/10 bg-white/5 p-4 font-mono text-sm text-[#f5efe6]">
              {statusMsg}
            </div>
          </div>

          <div className="rounded-[2rem] border border-[#d2c5b0] bg-white/70 p-6 shadow-[0_24px_60px_rgba(57,43,30,0.08)] md:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#6c6459]">
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
                        ? "border-[#7b684f] bg-[#efe2d0]"
                        : isComplete
                          ? "border-[#b9cfad] bg-[#eef4ea]"
                          : "border-[#e0d6c8] bg-[#fbf7ee]"
                    }`}
                  >
                    <div
                      className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold ${
                        isCurrent
                          ? "bg-[#201b18] text-[#f5efe6]"
                          : isComplete
                            ? "bg-[#5f6f52] text-[#f5efe6]"
                            : "bg-white text-[#6c6459]"
                      }`}
                    >
                      {index + 1}
                    </div>
                    <p className="text-sm font-medium text-[#1f1b17]">{item.label}</p>
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
            <CheckCircle2 className="h-16 w-16 text-[#9dc28d]" />
            <p className="mt-8 text-xs font-semibold uppercase tracking-[0.18em] text-[#ccb9a2]">
              Step 4
            </p>
            <h2 className="display-type mt-3 text-4xl leading-tight tracking-[-0.03em] text-white md:text-5xl">
              Event secured and ready to share.
            </h2>
            <p className="mt-4 text-sm leading-7 text-[#d7c7b6] md:text-base">
              Your event is live on Base Sepolia. Share the QR or attendee page on-site.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.14em] text-[#ccb9a2]">
                  Event ID
                </span>
                <span className="block break-all font-mono text-sm text-[#f5efe6]">
                  {eventId}
                </span>
              </div>
              <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.14em] text-[#ccb9a2]">
                  Venue hash
                </span>
                <span className="block break-all font-mono text-sm text-[#f5efe6]">
                  {venueHash}
                </span>
              </div>
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a
                href={`/event/${eventId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center rounded-full bg-[#f5efe6] px-5 py-3 text-sm font-semibold text-[#1f1b17] transition hover:bg-white"
              >
                Open attendee page
              </a>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="inline-flex items-center justify-center rounded-full border border-white/12 px-5 py-3 text-sm font-semibold text-[#f5efe6] transition hover:bg-white/6"
              >
                Edit event details
              </button>
            </div>
          </div>

          <div className="rounded-[2rem] border border-[#d2c5b0] bg-white/70 p-6 text-center shadow-[0_24px_60px_rgba(57,43,30,0.08)] md:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#6c6459]">
              Print or display at the venue
            </p>

            {qrDataUrl && (
              <div className="mt-6 flex flex-col items-center">
                <div className="rounded-[1.75rem] bg-white p-4 shadow-[0_18px_40px_rgba(57,43,30,0.12)]">
                  <Image
                    src={qrDataUrl}
                    alt="Event Check-in QR code"
                    width={224}
                    height={224}
                    unoptimized
                    className="h-56 w-56"
                  />
                </div>
              </div>
            )}

            {posterImageUrl && (
              <div className="mt-8 overflow-hidden rounded-[1.5rem] border border-[#d7e4f6] bg-white">
                <div className="relative aspect-[16/9] bg-[#eaf2ff]">
                  <Image
                    src={posterImageUrl}
                    alt="Event poster preview"
                    fill
                    unoptimized
                    className="object-cover"
                  />
                </div>
              </div>
            )}

            <p className="mt-6 text-sm leading-7 text-[#5f564d]">
              Guests open this page on-site and complete check-in from there.
            </p>

            <a
              href={`/event/${eventId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 block break-all font-mono text-sm text-[#7b4d2e] underline underline-offset-4"
            >
              {typeof window !== "undefined" ? window.location.origin : ""}/event/{eventId}
            </a>

            <div className="mt-8 rounded-[1.5rem] border border-[#ded4c5] bg-[#fbf7ee] p-5 text-left">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#6c6459]">
                Next steps
              </p>
              <ul className="mt-4 space-y-3 text-sm leading-7 text-[#5f564d]">
                <li>Display the QR or attendee page at the venue entrance.</li>
                <li>Make sure guests can connect to the venue Wi-Fi.</li>
                <li>Keep the event page open during the event window.</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
