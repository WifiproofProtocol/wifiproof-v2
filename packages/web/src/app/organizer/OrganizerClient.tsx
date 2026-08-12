"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import {
  createPublicClient,
  encodeAbiParameters,
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
import StepRail from "@/components/product/StepRail";
import { getClientBaseRpcUrl } from "@/lib/base-rpc";
import { withBuilderCode } from "@/lib/builder-codes";
import { preparePosterImage } from "@/lib/poster-image";
import { computeEventMetadataHash } from "@/lib/event-policy";

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

const WIFI_PROOF_V2_ABI = [
  { type: "function", name: "eventCreationFee", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint256" }] },
  { type: "function", name: "usdc", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "address" }] },
  {
    type: "function",
    name: "createEvent",
    stateMutability: "nonpayable",
    inputs: [
      { name: "eventId", type: "bytes32" },
      { name: "metadataHash", type: "bytes32" },
      { name: "venueCommitment", type: "bytes32" },
      { name: "startTime", type: "uint64" },
      { name: "endTime", type: "uint64" },
      { name: "requiredFactorBitmap", type: "uint32" },
    ],
    outputs: [{ name: "policyHash", type: "bytes32" }],
  },
] as const;

const ERC20_ABI = [
  {
    type: "function",
    name: "allowance",
    stateMutability: "view",
    inputs: [{ name: "owner", type: "address" }, { name: "spender", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }],
    outputs: [{ name: "", type: "bool" }],
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
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [challengeExpiresAt, setChallengeExpiresAt] = useState(0);
  const [challengeFingerprint, setChallengeFingerprint] = useState("");
  const [challengeError, setChallengeError] = useState("");
  const { data: walletClient } = useWalletClient();
  const wifiproofAddress = (
    process.env.NEXT_PUBLIC_WIFIPROOF_ADDRESS ??
    "0xbcEfE9B5a2f1C0FA6f0E02c8c678CF41884e3f7C"
  ).trim();
  const wifiproofV2Address = (process.env.NEXT_PUBLIC_WIFIPROOF_V2_ADDRESS ?? "").trim();
  const organizerContactEmail = process.env.NEXT_PUBLIC_ORGANIZER_CONTACT_EMAIL?.trim();
  const organizerContactHref = organizerContactEmail
    ? `mailto:${organizerContactEmail}?subject=WiFiProof organizer access`
    : "https://x.com/WiFiProof";
  const organizerContactLabel = organizerContactEmail ?? "@WiFiProof on X";
  const [rpcUrl, setRpcUrl] = useState("");

  const publicClient = useMemo(
    () =>
      rpcUrl
        ? createPublicClient({ chain: baseSepolia, transport: http(rpcUrl) })
        : null,
    [rpcUrl]
  );

  useEffect(() => {
    setRpcUrl(getClientBaseRpcUrl());
  }, []);

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
    if (!walletAddress || !publicClient) {
      return;
    }

    if (wifiproofV2Address) {
      setOrganizerAccess("approved");
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
  }, [publicClient, walletAddress, wifiproofAddress, wifiproofV2Address]);

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

  useEffect(() => {
    if (step !== 3 || !eventId || !walletAddress || !walletClient) return;
    let cancelled = false;
    let interval: ReturnType<typeof setInterval> | null = null;

    void (async () => {
      try {
        setChallengeError("");
        const issuedAt = Math.floor(Date.now() / 1000);
        const message = [
          "WiFiProof venue display",
          `Event: ${eventId.toLowerCase()}`,
          `Organizer: ${walletAddress.toLowerCase()}`,
          `Issued at: ${issuedAt}`,
          "Purpose: authorize rotating in-venue check-in challenges",
        ].join("\n");
        const signature = await walletClient.signMessage({
          account: walletAddress as `0x${string}`,
          message,
        });

        const refresh = async () => {
          const response = await fetch(`/api/events/${eventId}/challenge`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ organizer: walletAddress, issuedAt, signature }),
            cache: "no-store",
          });
          if (!response.ok) throw new Error("The live venue challenge could not be refreshed.");
          const payload = (await response.json()) as { checkInUrl: string; expiresAt: number; fingerprint: string };
          const dataUrl = await QRCode.toDataURL(payload.checkInUrl, {
            margin: 1,
            width: 300,
            color: { dark: "#171824", light: "#FAF7EF" },
          });
          if (!cancelled) {
            setQrDataUrl(dataUrl);
            setChallengeExpiresAt(payload.expiresAt);
            setChallengeFingerprint(payload.fingerprint);
          }
        };

        await refresh();
        interval = setInterval(() => void refresh().catch(() => setChallengeError("Live challenge refresh paused. Check the venue connection.")), 5_000);
      } catch (error) {
        if (!cancelled) setChallengeError(error instanceof Error ? error.message : "Venue challenge unavailable.");
      }
    })();

    return () => {
      cancelled = true;
      if (interval) clearInterval(interval);
    };
  }, [eventId, step, walletAddress, walletClient]);

  const stageLabels = [
    "Wallet",
    "Event details",
    "Publish",
    "Share",
  ] as const;

  const processingSteps = [
    { label: "Prepare payload", match: "Preparing event payload" },
    { label: "Prepare venue", match: "Preparing venue" },
    { label: "Prepare event", match: "Preparing event proof" },
    { label: "Check organizer access", match: "Requesting organizer authorization" },
    { label: "Confirm wallet transaction", match: "Confirm transaction in your wallet" },
    { label: "Confirm event", match: "Confirming event" },
    { label: "Save event metadata", match: "Saving metadata" },
  ] as const;

  const inputClass =
    "product-input placeholder:text-[color:oklch(0.48_0.025_260_/_0.6)]";
  const labelClass =
    "product-label";

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
        `Detected ${result.ip}.`
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

      const eventSeed = `${walletAddress.toLowerCase()}:${normalizedVenueName}:${start}:${end}`;
      const derivedEventId = keccak256(toBytes(eventSeed));
      const scaledLat = BigInt(toScaled(lat));
      const scaledLon = BigInt(toScaled(lon));
      const thresholdSq = thresholdSqScaled(radius);

      if (!publicClient) {
        throw new Error("RPC client is still loading. Try again in a second.");
      }

      setStatusMsg("Preparing venue...");
      let computedVenueHash = "0x" as `0x${string}`;
      if (!wifiproofV2Address) {
        computedVenueHash = await publicClient.readContract({
          address: wifiproofAddress as `0x${string}`,
          abi: WIFI_PROOF_ABI,
          functionName: "computeVenueHashFromScaled",
          args: [scaledLat, scaledLon, thresholdSq, derivedEventId],
        });
      }

      setStatusMsg("Preparing event proof...");
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

      if (wifiproofV2Address) {
        computedVenueHash = keccak256(
          encodeAbiParameters([{ type: "bytes32[]" }], [publicInputsBytes32]),
        );
        const metadataHash = computeEventMetadataHash({
          venueName: normalizedVenueName,
          eventDescription: normalizedEventDescription,
          venueCidr: normalizedSubnetPrefix,
          posterImageUrl,
        });
        const [eventFee, usdcAddress] = await Promise.all([
          publicClient.readContract({
            address: wifiproofV2Address as `0x${string}`,
            abi: WIFI_PROOF_V2_ABI,
            functionName: "eventCreationFee",
          }),
          publicClient.readContract({
            address: wifiproofV2Address as `0x${string}`,
            abi: WIFI_PROOF_V2_ABI,
            functionName: "usdc",
          }),
        ]);
        const allowance = await publicClient.readContract({
          address: usdcAddress,
          abi: ERC20_ABI,
          functionName: "allowance",
          args: [walletAddress as `0x${string}`, wifiproofV2Address as `0x${string}`],
        });
        if (allowance < eventFee) {
          setStatusMsg("Approve the one-time event fee...");
          const approvalHash = await walletClient.writeContract({
            address: usdcAddress,
            abi: ERC20_ABI,
            functionName: "approve",
            account: walletAddress as `0x${string}`,
            args: [wifiproofV2Address as `0x${string}`, eventFee],
          });
          const approvalReceipt = await publicClient.waitForTransactionReceipt({ hash: approvalHash });
          if (approvalReceipt.status !== "success") throw new Error("USDC fee approval failed.");
        }

        setStatusMsg("Confirm the 5 USDC event creation...");
        const txHash = await walletClient.writeContract(withBuilderCode({
          address: wifiproofV2Address as `0x${string}`,
          abi: WIFI_PROOF_V2_ABI,
          functionName: "createEvent",
          account: walletAddress as `0x${string}`,
          args: [
            derivedEventId,
            metadataHash,
            computedVenueHash,
            BigInt(start),
            BigInt(end),
            15,
          ],
        }));
        const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
        if (receipt.status !== "success") throw new Error("Event creation failed.");

        setStatusMsg("Saving event policy...");
        const saveResponse = await fetch("/api/events/create-v2", {
          method: "POST",
          headers: { "content-type": "application/json", ...(process.env.NODE_ENV === "development" ? { "x-forwarded-for": normalizedSubnetPrefix.split("/")[0] } : {}) },
          body: JSON.stringify({
            organizer: walletAddress,
            eventId: derivedEventId,
            venueCommitment: computedVenueHash,
            startTime: start,
            endTime: end,
            requiredFactorBitmap: 15,
            venueName: normalizedVenueName,
            eventDescription: normalizedEventDescription,
            venueLat: lat,
            venueLon: lon,
            radiusMeters: radius,
            venueCidr: normalizedSubnetPrefix,
            posterImageUrl,
            txHash,
          }),
        });
        if (!saveResponse.ok) throw new Error(`Event policy save failed: ${await saveResponse.text()}`);
        setEventId(derivedEventId);
        setStatusMsg("");
        setStep(3);
        return;
      }

      setStatusMsg("Requesting organizer authorization...");
      const deadline = Math.floor(Date.now() / 1000) + 120;
      const devHeaders: Record<string, string> =
        process.env.NODE_ENV === "development"
          ? { "x-forwarded-for": normalizedSubnetPrefix.split("/")[0] }
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
      const txHash = await walletClient.writeContract(withBuilderCode({
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
      }));

      setStatusMsg("Confirming event...");
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

      setEventId(derivedEventId);
      setStep(3);
      setStatusMsg("");
    } catch (error) {
      setErrorMsg((error as Error).message);
      setStep(walletAddress ? 1 : 0);
    }
  }

  return (
    <div className="organizer-flow">
      <header className="organizer-flow-heading">
        <h1 className="organizer-flow-title">Create an event</h1>
        <p>Set the venue, time and network.</p>
      </header>

      <StepRail labels={stageLabels} current={step} />

      {errorMsg && (
        <div role="alert" className="organizer-error">
          <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0" />
          <p className="text-sm font-medium leading-7">{errorMsg}</p>
        </div>
      )}

      {step === 0 && (
        <div className="organizer-card max-w-2xl">
          <div>
            <h2 className="text-2xl font-semibold tracking-[-0.03em] md:text-3xl">
              Connect your wallet
            </h2>
            <p className="mt-2 text-sm leading-6 text-[var(--signal-muted)]">
              This wallet will own the event.
            </p>
            <div className="mt-6">
              <WalletCard
                walletAddress={walletAddress}
                onReady={handleWalletReady}
              />
            </div>
          </div>

          <div className="mt-6 border-t border-[var(--signal-line)] pt-5">
            {!walletAddress && (
              <p className="text-sm leading-6 text-[var(--signal-muted)]">
                Connect a wallet to check organizer access.
              </p>
            )}

            {walletAddress && organizerAccess === "checking" && (
              <div className="flex items-center gap-3 text-sm font-medium">
                <Loader2 className="h-4 w-4 animate-spin text-[var(--signal-cobalt)]" />
                Checking organizer access...
              </div>
            )}

            {walletAddress && organizerAccess === "approved" && (
              <div className="organizer-inline-status organizer-inline-status-success">
                <CheckCircle2 className="h-5 w-5" />
                <div>
                  <p className="text-sm font-semibold">Organizer approved</p>
                  <p className="text-xs leading-5">Your setup form is ready.</p>
                </div>
              </div>
            )}

            {walletAddress && organizerAccess === "rejected" && (
              <div className="organizer-inline-status organizer-inline-status-error">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold">This wallet is not approved yet.</p>
                  <p className="mt-1 text-xs leading-5">Request organizer access, then return to setup.</p>
                  <a
                    href={organizerContactHref}
                    target={organizerContactEmail ? undefined : "_blank"}
                    rel={organizerContactEmail ? undefined : "noreferrer noopener"}
                    className="mt-3 inline-flex text-sm font-semibold underline decoration-current/30 underline-offset-4"
                  >
                    Contact {organizerContactLabel}
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="organizer-form-shell">
          <div className="organizer-form-header">
            <div>
              <h2>Event details</h2>
              <p>Everything attendees need to find and join this check-in.</p>
            </div>
            <div className="organizer-verified">
              <CheckCircle2 className="h-4 w-4" />
              Organizer verified
            </div>
          </div>

          <div className="organizer-form-body">
            <section className="organizer-form-section organizer-form-section-first">
              <div>
                <h3>About</h3>
              </div>

                <label className="mt-5 block">
                  <span className={labelClass}>Event name</span>
                  <input
                    className={inputClass}
                    value={venueName}
                    onChange={(e) => setVenueName(e.target.value)}
                    placeholder="ETH Safari - Day 1"
                    required
                  />
                </label>

                <label className="mt-5 block">
                  <span className={labelClass}>Short description (optional)</span>
                  <textarea
                    className={`${inputClass} min-h-24 resize-y`}
                    value={eventDescription}
                    onChange={(e) => setEventDescription(e.target.value)}
                    placeholder="A short note for attendees."
                    maxLength={500}
                  />
                  <span className="mt-2 block text-right text-xs leading-6 text-[#6a7891]">
                    {eventDescription.trim().length}/500
                  </span>
                </label>

                <div className="organizer-upload-row">
                  <div>
                    <p className="text-sm font-semibold">Event poster</p>
                    <p className="mt-1 text-xs leading-5 text-[var(--signal-muted)]">
                      Optional. PNG, JPG or WebP.
                    </p>
                  </div>
                  <label className="organizer-secondary-action cursor-pointer">
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

                {posterImageUrl && (
                  <div className="organizer-poster-preview">
                    <div className="relative aspect-[16/9] overflow-hidden rounded-xl bg-[var(--signal-canvas)]">
                      <Image
                        src={posterImageUrl}
                        alt="Poster preview"
                        fill
                        unoptimized
                        className="object-cover"
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">
                        {posterFileName || "Event poster ready"}
                      </p>
                      <p className="mt-1 text-xs text-[var(--signal-muted)]">Ready to publish</p>
                    </div>
                    <div>
                      <div>
                        <button
                          type="button"
                          onClick={() => {
                            setPosterImageUrl("");
                            setPosterFileName("");
                          }}
                          className="organizer-icon-action"
                          aria-label="Remove event poster"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </section>

              <section className="organizer-form-section">
                <div className="organizer-section-heading">
                  <div>
                    <h3>Venue</h3>
                    <p>Set the center point and check-in radius.</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleUseCurrentLocation}
                    className="organizer-secondary-action"
                  >
                    <MapPin className="h-4 w-4" /> Use current location
                  </button>
                </div>

                <div className="mt-5 grid gap-4 sm:grid-cols-2 md:grid-cols-[1fr_1fr_0.72fr]">
                  <label className="block">
                    <span className={labelClass}>Latitude</span>
                    <input
                      className={`${inputClass} font-mono`}
                      value={venueLat}
                      onChange={(e) => setVenueLat(e.target.value)}
                      placeholder="-1.1018"
                      required
                    />
                  </label>
                  <label className="block">
                    <span className={labelClass}>Longitude</span>
                    <input
                      className={`${inputClass} font-mono`}
                      value={venueLon}
                      onChange={(e) => setVenueLon(e.target.value)}
                      placeholder="37.0144"
                      required
                    />
                  </label>
                  <label className="block">
                    <span className={labelClass}>Radius (meters)</span>
                    <input
                      className={`${inputClass} font-mono`}
                      value={radiusMeters}
                      onChange={(e) => setRadiusMeters(e.target.value)}
                      inputMode="numeric"
                      required
                    />
                  </label>
                </div>
              </section>

              <section className="organizer-form-section">
                <div className="organizer-section-heading">
                  <div>
                    <h3>Network and time</h3>
                    <p>Use the venue&apos;s public egress network.</p>
                  </div>
                </div>

                <div className="mt-5 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
                  <label className="block">
                    <span className={labelClass}>Venue public IP or CIDR</span>
                    <input
                      className={`${inputClass} font-mono`}
                      value={subnetPrefix}
                      onChange={(e) => setSubnetPrefix(e.target.value)}
                      placeholder="203.0.113.42/32"
                      required
                    />
                  </label>
                  <button
                    type="button"
                    onClick={handleUseCurrentPrefix}
                    className="organizer-secondary-action min-h-12 justify-center"
                  >
                    {isResolvingPrefix ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Detecting...
                      </>
                    ) : (
                      <>
                        <Wifi className="h-4 w-4" />
                        Detect network
                      </>
                    )}
                  </button>
                </div>

                {detectedNetworkHint && (
                  <p className="mt-3 text-xs leading-6 text-[#4870ad]">
                    {detectedNetworkHint}
                  </p>
                )}

                <div className="mt-6 grid gap-4 sm:grid-cols-2">
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
                <p className="mt-3 text-xs leading-5 text-[var(--signal-muted)]">Times use your local timezone.</p>
              </section>
            </div>

            <div className="organizer-form-footer">
              <p>
                {wifiproofV2Address
                  ? "5 USDC event fee on Base."
                  : "Publishes to the Base Sepolia prototype."}
              </p>
              <button
                type="button"
                onClick={handleCreateEvent}
                className="signal-button signal-button-primary min-w-44 px-6 py-3"
              >
                Publish event <ChevronRight className="h-5 w-5" />
              </button>
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
              Keep this page open while the event is created.
            </p>
            <div className="mt-8 rounded-[1.5rem] border border-white/10 bg-white/5 p-4 font-mono text-sm text-[#f5efe6]">
              {statusMsg}
            </div>
          </div>

          <div className="rounded-[2rem] border border-[#d2c5b0] bg-white/70 p-6 shadow-[0_24px_60px_rgba(57,43,30,0.08)] md:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#6c6459]">
              Progress
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
        <div className="space-y-6">
          <div className="ink-panel rounded-[2.25rem] p-8 md:p-10">
            <div className="max-w-3xl">
              <CheckCircle2 className="h-16 w-16 text-[#9dc28d]" />
              <p className="mt-8 text-xs font-semibold uppercase tracking-[0.18em] text-[#ccb9a2]">
                Step 4
              </p>
              <h2 className="display-type mt-3 text-4xl leading-[0.94] tracking-[-0.04em] text-white md:text-6xl">
                Event ready.
              </h2>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-[#d7c7b6] md:text-base">
                Display the live QR inside the venue. It rotates every 30 seconds.
              </p>
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
                Edit event
              </button>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.18fr_0.82fr]">
            <div className="rounded-[2rem] border border-[#d2c5b0] bg-white/78 p-6 shadow-[0_24px_60px_rgba(57,43,30,0.08)] md:p-8">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#6c6459]">
                Check-in card
              </p>

              <div className="mt-6 overflow-hidden rounded-[1.9rem] border border-[#d7e4f6] bg-white text-left shadow-[0_18px_40px_rgba(57,43,30,0.12)]">
                {posterImageUrl && (
                  <div className="relative aspect-[16/8] bg-[#eaf2ff]">
                    <Image
                      src={posterImageUrl}
                      alt="Event poster preview"
                      fill
                      unoptimized
                      className="object-cover"
                    />
                  </div>
                )}

                <div className="grid gap-8 p-6 lg:grid-cols-[minmax(0,1fr)_240px] lg:items-start">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#2563eb]">
                      WiFiProof check-in
                    </p>
                    <h3 className="mt-3 text-3xl font-semibold leading-tight text-[#1f1b17]">
                      {venueName}
                    </h3>
                    {eventDescription.trim() && (
                      <p className="mt-4 max-w-2xl text-sm leading-7 text-[#5f564d]">
                        {eventDescription}
                      </p>
                    )}
                    <div className="mt-6 rounded-[1.3rem] bg-[#f8fbff] p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#5e7ca8]">
                        Attendee page
                      </p>
                      <p className="mt-2 break-all font-mono text-sm leading-7 text-[#7b4d2e]">
                        {typeof window !== "undefined" ? window.location.origin : ""}/event/{eventId}
                      </p>
                    </div>
                    <p className="mt-5 text-xs font-semibold uppercase tracking-[0.14em] text-[#7b684f]">
                      Powered by WiFiProof
                    </p>
                  </div>

                  {qrDataUrl && (
                    <div className="flex flex-col items-center rounded-[1.6rem] bg-[#f8fbff] p-5 text-center">
                      <div className="rounded-[1.4rem] bg-white p-3 shadow-[0_10px_24px_rgba(37,99,235,0.12)]">
                        <Image
                          src={qrDataUrl}
                        alt="Rotating in-venue check-in QR code"
                          width={208}
                          height={208}
                          unoptimized
                          className="h-52 w-52"
                        />
                      </div>
                      <p className="mt-4 text-xs font-semibold uppercase tracking-[0.14em] text-[#5e7ca8]">
                        Live venue signal · {challengeFingerprint || "starting"}
                      </p>
                      <p className="mt-2 text-xs text-[#6a7891]">
                        Renews {challengeExpiresAt ? new Date(challengeExpiresAt * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "shortly"}
                      </p>
                    </div>
                  )}
                  {!qrDataUrl && (
                    <div className="flex min-h-60 flex-col items-center justify-center rounded-[1.6rem] bg-[#f8fbff] p-5 text-center">
                      <Loader2 className="h-7 w-7 animate-spin text-[#2563eb]" />
                      <p className="mt-4 text-sm font-semibold">Authorize live venue display</p>
                      <p className="mt-2 text-xs leading-5 text-[#6a7891]">Approve the wallet signature. It cannot move funds.</p>
                    </div>
                  )}
                </div>
              </div>
              {challengeError && <p role="alert" className="mt-4 text-sm text-[#a5483c]">{challengeError}</p>}
            </div>

            <div className="space-y-6">
              <div className="rounded-[1.75rem] border border-[#ded4c5] bg-[#fbf7ee] p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#6c6459]">
                  Next steps
                </p>
                <ul className="mt-4 space-y-3 text-sm leading-7 text-[#5f564d]">
                  <li>Display the QR.</li>
                  <li>Keep venue Wi-Fi available.</li>
                  <li>Monitor claims from the dashboard.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
