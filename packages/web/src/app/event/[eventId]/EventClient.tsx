"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  IDKitRequestWidget,
  orbLegacy,
  type IDKitResult,
  type RpContext,
} from "@worldcoin/idkit";
import { SelfAppBuilder, SelfQRcodeWrapper } from "@selfxyz/qrcode";
import {
  createPublicClient,
  decodeEventLog,
  encodeAbiParameters,
  http,
  keccak256,
  numberToHex,
} from "viem";
import { baseSepolia } from "viem/chains";
import { useAccount, useConfig, useWalletClient } from "wagmi";
import { getCapabilities, sendCalls, waitForCallsStatus } from "wagmi/actions";
import {
  ArrowUpRight,
  AlertCircle,
  CheckCircle2,
  Copy,
  Loader2,
  MapPin,
  Share2,
  ShieldCheck,
  Wifi,
} from "lucide-react";

import WalletCard from "@/components/wallet/WalletCard";
import { getClientBaseRpcUrl } from "@/lib/base-rpc";
import { getBuilderCodeDataSuffix, withBuilderCode } from "@/lib/builder-codes";
import { getPaymasterProxyUrl } from "@/lib/paymaster";

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

type HumanityVerifyResponse = {
  ok: boolean;
  token: string;
  provider: "world" | "coinbase" | "self";
  network?: string;
  attestationUid?: string;
  expiresAt: number;
};

type RpContextResponse = {
  rp_context: RpContext;
};

function VerificationMark({
  provider,
}: {
  provider: "world" | "coinbase" | "self";
}) {
  if (provider === "world") {
    return (
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#2563eb] text-white shadow-[0_12px_30px_rgba(37,99,235,0.25)]">
        <svg aria-hidden="true" viewBox="0 0 32 32" className="h-7 w-7">
          <circle cx="16" cy="16" r="11" fill="none" stroke="currentColor" strokeWidth="2.4" />
          <path d="M6 16h20M16 5c4 4.2 4 17.8 0 22M16 5c-4 4.2-4 17.8 0 22" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
        </svg>
      </div>
    );
  }

  if (provider === "coinbase") {
    return (
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#0052ff] text-white shadow-[0_12px_30px_rgba(0,82,255,0.18)]">
        <span className="text-2xl font-semibold leading-none">c</span>
      </div>
    );
  }

  return (
    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#10233f] text-white shadow-[0_12px_30px_rgba(16,35,63,0.18)]">
      <svg aria-hidden="true" viewBox="0 0 32 32" className="h-7 w-7">
        <rect x="7" y="6" width="18" height="20" rx="4" fill="none" stroke="currentColor" strokeWidth="2.2" />
        <circle cx="16" cy="13" r="3" fill="currentColor" />
        <path d="M11 21c1.2-2.2 8.8-2.2 10 0" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
      </svg>
    </div>
  );
}

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
  const wagmiConfig = useConfig();
  const { address } = useAccount();
  const walletAddress = address ?? "";

  const [event, setEvent] = useState<EventRecord | null>(null);
  const [statusMsg, setStatusMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [attestationUid, setAttestationUid] = useState("");
  const [humanityToken, setHumanityToken] = useState("");
  const [humanityMethod, setHumanityMethod] = useState<"world" | "coinbase" | "self" | null>(null);
  const [worldStatus, setWorldStatus] = useState("");
  const [isPreparingWorld, setIsPreparingWorld] = useState(false);
  const [isVerifyingWorld, setIsVerifyingWorld] = useState(false);
  const [coinbaseStatus, setCoinbaseStatus] = useState("");
  const [isVerifyingCoinbase, setIsVerifyingCoinbase] = useState(false);
  const [selfStatus, setSelfStatus] = useState("");
  const [isSelfCardOpen, setIsSelfCardOpen] = useState(false);
  const [isFetchingSelfToken, setIsFetchingSelfToken] = useState(false);
  const [selfEndpoint, setSelfEndpoint] = useState("");
  const [selfQrSize, setSelfQrSize] = useState(260);
  const [isWorldModalOpen, setIsWorldModalOpen] = useState(false);
  const [rpContext, setRpContext] = useState<RpContext | null>(null);
  const [artifactCid, setArtifactCid] = useState("");
  const [archiveWarning, setArchiveWarning] = useState("");
  const [proofDurationMs, setProofDurationMs] = useState<number | null>(null);
  const [proofBytes, setProofBytes] = useState<number | null>(null);
  const [claimTxHash, setClaimTxHash] = useState("");
  const [claimedAt, setClaimedAt] = useState("");
  const [copiedUid, setCopiedUid] = useState(false);
  const [isCheckingSponsorship, setIsCheckingSponsorship] = useState(false);
  const [isSponsoredClaimAvailable, setIsSponsoredClaimAvailable] = useState<boolean | null>(null);
  const { data: walletClient } = useWalletClient();

  const wifiproofAddress = (
    process.env.NEXT_PUBLIC_WIFIPROOF_ADDRESS ??
    "0xbcEfE9B5a2f1C0FA6f0E02c8c678CF41884e3f7C"
  ).trim();

  const [rpcUrl, setRpcUrl] = useState("");
  const worldAppId = (process.env.NEXT_PUBLIC_WORLD_APP_ID ?? "").trim();
  const worldActionId = (process.env.NEXT_PUBLIC_WORLD_ACTION_ID ?? "").trim();
  const selfScope = (process.env.NEXT_PUBLIC_SELF_SCOPE ?? "wifiproof-humanity").trim();
  const isWorldConfigured = Boolean(worldAppId && worldActionId);

  const publicClient = useMemo(
    () =>
      rpcUrl
        ? createPublicClient({ chain: baseSepolia, transport: http(rpcUrl) })
        : null,
    [rpcUrl]
  );

  const handleWalletReady = useCallback(() => setStep(1), []);
  const isHumanityVerified = Boolean(humanityToken);
  const humanityMethodLabel =
    humanityMethod === "coinbase"
      ? "Coinbase Verified"
      : humanityMethod === "self"
        ? "Self Pass"
      : humanityMethod === "world"
        ? "World ID"
        : null;
  const selfApp = useMemo(() => {
    if (!walletAddress || !selfEndpoint) {
      return null;
    }

    return new SelfAppBuilder({
      appName: "WiFiProof",
      scope: selfScope,
      endpoint: selfEndpoint,
      userId: walletAddress.toLowerCase(),
      userIdType: "hex",
      userDefinedData: eventId,
      disclosures: {
        ofac: true,
      },
    }).build();
  }, [eventId, selfEndpoint, selfScope, walletAddress]);
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
    { label: "Request sponsorship", match: "Requesting sponsored claim" },
    { label: "Prepare wallet transaction", match: "Preparing mint transaction" },
    { label: "Wait for chain confirmation", match: "Waiting for sponsored confirmation" },
    { label: "Wait for chain confirmation", match: "Waiting for confirmation" },
    { label: "Archive claim receipt", match: "Archiving claim receipt" },
  ] as const;
  const processingIndex = Math.max(
    processingSteps.findIndex((item) => statusMsg.includes(item.match)),
    0
  );
  const progressValue = Math.round(((processingIndex + 1) / processingSteps.length) * 100);
  const easScanUrl =
    attestationUid && attestationUid.startsWith("0x")
      ? `https://base-sepolia.easscan.org/attestation/view/${attestationUid}`
      : "";
  const txExplorerUrl =
    claimTxHash && claimTxHash.startsWith("0x")
      ? `https://sepolia.basescan.org/tx/${claimTxHash}`
      : "";

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
    setRpcUrl(getClientBaseRpcUrl());
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const updateSelfQrSize = () => {
      const viewportWidth = window.innerWidth;
      if (viewportWidth < 360) {
        setSelfQrSize(176);
      } else if (viewportWidth < 420) {
        setSelfQrSize(196);
      } else if (viewportWidth < 640) {
        setSelfQrSize(224);
      } else {
        setSelfQrSize(260);
      }
    };

    updateSelfQrSize();
    window.addEventListener("resize", updateSelfQrSize);
    return () => window.removeEventListener("resize", updateSelfQrSize);
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setSelfEndpoint(new URL("/api/humanity/self", window.location.origin).toString());
    }
  }, []);

  useEffect(() => {
    if (!walletAddress && step !== 0) {
      setStep(0);
    }
  }, [step, walletAddress]);

  useEffect(() => {
    setHumanityToken("");
    setHumanityMethod(null);
    setWorldStatus("");
    setCoinbaseStatus("");
    setSelfStatus("");
    setIsSelfCardOpen(false);
    setIsFetchingSelfToken(false);
    setRpContext(null);
    setIsWorldModalOpen(false);
    setArtifactCid("");
    setArchiveWarning("");
    setProofDurationMs(null);
    setProofBytes(null);
    setClaimTxHash("");
    setClaimedAt("");
    setIsCheckingSponsorship(false);
    setIsSponsoredClaimAvailable(null);
  }, [walletAddress, eventId]);

  const checkSponsoredClaimSupport = useCallback(
    async (account: `0x${string}`) => {
      setIsCheckingSponsorship(true);

      try {
        const capabilities = await getCapabilities(wagmiConfig, {
          account,
        });
        const capabilitiesByChain = capabilities as
          | Record<string, { paymasterService?: { supported?: boolean } } | undefined>
          | undefined;
        const supported = Boolean(
          capabilitiesByChain?.[numberToHex(baseSepolia.id)]?.paymasterService?.supported
        );
        setIsSponsoredClaimAvailable(supported);
        return supported;
      } catch (error) {
        console.warn("[claim] capability lookup failed", error);
        setIsSponsoredClaimAvailable(false);
        return false;
      } finally {
        setIsCheckingSponsorship(false);
      }
    },
    [wagmiConfig]
  );

  useEffect(() => {
    if (!walletAddress) {
      return;
    }

    void checkSponsoredClaimSupport(walletAddress as `0x${string}`);
  }, [checkSponsoredClaimSupport, walletAddress]);

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
      setCoinbaseStatus("");
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

      const result = (await response.json()) as HumanityVerifyResponse;
      if (!result.ok || !result.token) {
        throw new Error("World verification response missing token.");
      }

      setHumanityToken(result.token);
      setHumanityMethod("world");
      setWorldStatus("Verified with World ID.");
    } catch (error) {
      if (humanityMethod === "world") {
        setHumanityToken("");
        setHumanityMethod(null);
      }
      setWorldStatus("");
      setErrorMsg((error as Error).message);
    } finally {
      setIsVerifyingWorld(false);
    }
  }

  async function handleCoinbaseVerification() {
    try {
      setErrorMsg("");
      setWorldStatus("");
      setSelfStatus("");

      if (!walletAddress) {
        throw new Error("Connect wallet before checking Coinbase verification.");
      }

      setIsVerifyingCoinbase(true);
      setCoinbaseStatus("Checking Coinbase verification on Base...");

      const response = await fetch("/api/humanity/coinbase", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          wallet: walletAddress,
          eventId,
        }),
      });

      const result = (await response.json().catch(() => ({}))) as Partial<
        HumanityVerifyResponse & { error: string }
      >;

      if (!response.ok) {
        throw new Error(result.error || "Coinbase verification failed.");
      }

      if (!result.ok || !result.token) {
        throw new Error("Coinbase verification response missing token.");
      }

      setHumanityToken(result.token);
      setHumanityMethod("coinbase");
      setCoinbaseStatus(`Verified with Coinbase${result.network ? ` on ${result.network}` : ""}.`);
    } catch (error) {
      if (humanityMethod === "coinbase") {
        setHumanityToken("");
        setHumanityMethod(null);
      }
      setCoinbaseStatus("");
      setErrorMsg((error as Error).message);
    } finally {
      setIsVerifyingCoinbase(false);
    }
  }

  function handleOpenSelfVerification() {
    setErrorMsg("");
    setWorldStatus("");
    setCoinbaseStatus("");
    setSelfStatus("Scan the QR code with Self to verify document-backed humanity.");
    setIsSelfCardOpen(true);
  }

  async function completeSelfVerification() {
    try {
      if (!walletAddress) {
        throw new Error("Connect wallet before using Self verification.");
      }

      setErrorMsg("");
      setWorldStatus("");
      setCoinbaseStatus("");
      setIsFetchingSelfToken(true);
      setSelfStatus("Finalizing Self verification...");

      let result: Partial<HumanityVerifyResponse & { error: string }> | null = null;
      let lastError = "Self verification failed.";

      for (let attempt = 0; attempt < 5; attempt += 1) {
        const response = await fetch(
          `/api/humanity/self?wallet=${encodeURIComponent(walletAddress)}&eventId=${encodeURIComponent(eventId)}`,
          { cache: "no-store" }
        );

        result = (await response.json().catch(() => ({}))) as Partial<
          HumanityVerifyResponse & { error: string }
        >;

        if (response.ok && result.ok && result.token) {
          break;
        }

        lastError = result.error || "Self verification failed.";
        if (response.status !== 404 || attempt === 4) {
          throw new Error(lastError);
        }

        await new Promise((resolve) => window.setTimeout(resolve, 800));
      }

      if (!result?.ok || !result.token) {
        throw new Error(lastError);
      }

      setHumanityToken(result.token);
      setHumanityMethod("self");
      setSelfStatus("Verified with Self Pass.");
      setIsSelfCardOpen(false);
    } catch (error) {
      if (humanityMethod === "self") {
        setHumanityToken("");
        setHumanityMethod(null);
      }
      setSelfStatus("");
      setErrorMsg((error as Error).message);
    } finally {
      setIsFetchingSelfToken(false);
    }
  }

  async function handleClaim() {
    try {
      setErrorMsg("");
      setStatusMsg("Connecting secure environment...");
      setStep(2);

      if (!event) throw new Error("Event data not loaded.");
      if (!walletAddress) throw new Error("Wallet not connected.");
      if (!humanityToken) throw new Error("Humanity verification is required before claiming.");
      if (!publicClient) throw new Error("RPC client is still loading. Try again in a second.");

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
          humanityToken,
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

      const proofStartedAt = performance.now();
      const { proof, publicInputs } = await prover.generateProof(inputs);
      const proofFinishedAt = performance.now();
      await prover.destroy();
      setProofDurationMs(proofFinishedAt - proofStartedAt);
      setProofBytes(proof.byteLength);

      const proofHex = uint8ArrayToHex(proof);
      const publicInputsBytes32 = publicInputs.map(toBytes32Hex);
      const proofHash = keccak256(proofHex);
      const publicInputsHash = keccak256(
        encodeAbiParameters([{ type: "bytes32[]" }], [publicInputsBytes32])
      );

      let receipt;
      const builderCodeDataSuffix = getBuilderCodeDataSuffix();
      const paymasterSupported =
        isSponsoredClaimAvailable ??
        (await checkSponsoredClaimSupport(walletAddress as `0x${string}`));

      if (paymasterSupported) {
        try {
          setStatusMsg("Requesting sponsored claim...");
          const sponsoredCall = await sendCalls(wagmiConfig, {
            account: walletAddress as `0x${string}`,
            chainId: baseSepolia.id,
            calls: [
              {
                to: wifiproofAddress as `0x${string}`,
                abi: WIFI_PROOF_ABI,
                functionName: "claimAttendance",
                args: [
                  proofHex,
                  publicInputsBytes32,
                  ipSignature,
                  BigInt(deadline),
                  eventId as `0x${string}`,
                ],
                ...(builderCodeDataSuffix ? { dataSuffix: builderCodeDataSuffix } : {}),
              },
            ],
            capabilities: {
              paymasterService: {
                url: getPaymasterProxyUrl(),
              },
            },
          });

          setStatusMsg("Waiting for sponsored confirmation...");
          const callsStatus = await waitForCallsStatus(wagmiConfig, {
            id: sponsoredCall.id,
          });
          const firstReceipt = callsStatus.receipts?.[0];

          if (!firstReceipt) {
            throw new Error("Sponsored claim did not return a transaction receipt.");
          }

          receipt = firstReceipt;
        } catch (error) {
          console.warn("[claim] sponsored path failed, falling back to wallet tx", error);
        }
      }

      if (!receipt) {
        if (!walletClient) throw new Error("Wallet connection lost.");

        setStatusMsg("Preparing mint transaction...");
        const txHash = await walletClient.writeContract(withBuilderCode({
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
        }));
        setClaimTxHash(txHash);

        setStatusMsg("Waiting for confirmation...");
        receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
      }

      const txHash = receipt.transactionHash;
      setClaimTxHash(txHash);

      if (receipt.status === "reverted") {
        throw new Error("AlreadyClaimed");
      }

      setClaimedAt(new Date().toISOString());

      let foundUid = "";
      for (const log of receipt.logs) {
        try {
          const decoded = decodeEventLog({
            abi: WIFI_PROOF_ABI,
            data: log.data,
            topics: log.topics as [signature: `0x${string}`, ...args: `0x${string}`[]],
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
      const msg = (error as Error).message ?? "";
      if (msg.includes("AlreadyClaimed") || msg.includes("already claimed")) {
        setErrorMsg("You have already claimed this event with this wallet.");
      } else {
        setErrorMsg(msg);
      }
      setStep(1);
    }
  }

  async function handleShareAttestation() {
    if (!easScanUrl) return;

    const shareText = event
      ? `I just minted my WiFiProof attendance attestation for ${event.venue_name}.`
      : "I just minted my WiFiProof attendance attestation.";

    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({
          title: event?.venue_name ?? "WiFiProof attestation",
          text: shareText,
          url: easScanUrl,
        });
        return;
      }

      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(easScanUrl);
      }
    } catch (error) {
      console.error("[claim] share failed", error);
    }
  }

  async function handleCopyUid() {
    if (!attestationUid) return;

    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(attestationUid);
      } else {
        const el = document.createElement("textarea");
        el.value = attestationUid;
        document.body.appendChild(el);
        el.select();
        document.execCommand("copy");
        document.body.removeChild(el);
      }
      setCopiedUid(true);
      setTimeout(() => setCopiedUid(false), 1500);
    } catch (error) {
      console.error("[claim] copy uid failed", error);
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
                : "Check in privately and mint your attendance attestation."}
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

          <div className="overflow-hidden rounded-[1.6rem] border border-[#cfe1ff] bg-white/84 shadow-[0_28px_80px_rgba(37,99,235,0.12)] sm:rounded-[2rem]">
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
              <div className="aspect-[16/10] bg-[radial-gradient(circle_at_top_left,_rgba(96,165,250,0.36),_transparent_28%),linear-gradient(135deg,_#dbeafe,_#eff6ff_52%,_#ffffff)] px-5 py-6 sm:px-8 sm:py-10">
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
            <div className="rounded-[1.6rem] border border-[#cfe1ff] bg-white/86 p-4 shadow-[0_24px_70px_rgba(37,99,235,0.08)] sm:rounded-[2rem] sm:p-6 md:p-8">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#5e7ca8]">
                Step 1
              </p>
              <h2 className="display-type mt-3 text-3xl leading-tight tracking-[-0.03em] text-[#10233f] md:text-4xl">
                Connect the wallet for this attestation.
              </h2>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-[#52637e] md:text-base">
                This wallet will receive the attestation on Base Sepolia.
              </p>
              <div className="mt-4 rounded-[1.25rem] border border-[#d7e4f6] bg-[#f8fbff] px-4 py-3 text-sm text-[#52637e]">
                {isCheckingSponsorship ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-[#2563eb]" />
                    Checking if this wallet can use sponsored claims...
                  </span>
                ) : isSponsoredClaimAvailable ? (
                  <span className="inline-flex items-center gap-2 text-[#155734]">
                    <CheckCircle2 className="h-4 w-4" />
                    Smart-wallet sponsorship is available for this wallet.
                  </span>
                ) : walletAddress ? (
                  <span>
                    This wallet will use a normal transaction and pay gas if you continue.
                  </span>
                ) : (
                  <span>Connect a wallet to see whether gasless claims are supported.</span>
                )}
              </div>
              <div className="mt-6">
                <WalletCard
                  walletAddress={walletAddress}
                  onReady={handleWalletReady}
                />
              </div>
            </div>

            <div className="ink-panel rounded-[1.6rem] p-5 sm:rounded-[2rem] sm:p-6 md:p-8">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#d6e7ff]">
                Flow
              </p>
              <div className="mt-5 flex flex-wrap gap-3 text-sm text-[#e8f1ff]">
                <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2">
                  Verify humanity
                </span>
                <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2">
                  Generate proof
                </span>
                <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2">
                  Mint attestation
                </span>
              </div>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="rounded-[1.6rem] border border-[#cfe1ff] bg-white/86 p-4 shadow-[0_24px_70px_rgba(37,99,235,0.08)] sm:rounded-[2rem] sm:p-6 md:p-8">
              <div className="flex flex-col gap-4 border-b border-[#dbe8fb] pb-6 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#5e7ca8]">
                    Step 2
                  </p>
                  <h2 className="display-type mt-3 text-3xl leading-tight tracking-[-0.03em] text-[#10233f] md:text-4xl">
                    Verify and mint.
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

              <div className="mt-4 rounded-[1.4rem] border border-[#d7e4f6] bg-[#f8fbff] p-4">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-[#5e7ca8]">
                  Gasless claim
                </span>
                <p className="text-sm font-semibold text-[#10233f]">
                  {isCheckingSponsorship
                    ? "Checking wallet capabilities..."
                    : isSponsoredClaimAvailable
                      ? "Available for this wallet"
                      : "Not available on this wallet"}
                </p>
                <p className="mt-1 text-xs leading-6 text-[#6a7891]">
                  {isSponsoredClaimAvailable
                    ? "WiFiProof will try a sponsored smart-wallet claim first. Base Smart Wallet works best here."
                    : "This wallet will use a standard onchain claim."}
                </p>
              </div>

              <div className="mt-6 rounded-[1.35rem] border border-[#d7e4f6] bg-[#f8fbff] p-4 sm:rounded-[1.6rem] sm:p-5">
                <span className="block text-xs font-semibold uppercase tracking-[0.16em] text-[#5e7ca8]">
                  Humanity check
                </span>
                <p className="mt-2 text-sm leading-7 text-[#52637e]">
                  Use World ID, Coinbase Verified, or Self Pass to prove the attendee is a real person before minting.
                </p>

                <div className="mt-4 grid gap-3 xl:grid-cols-3">
                  <button
                    onClick={prepareWorldVerification}
                    disabled={!isWorldConfigured || isPreparingWorld || isVerifyingWorld}
                    className={`min-h-[156px] rounded-[1.4rem] border px-4 py-4 text-left transition ${
                      humanityMethod === "world"
                        ? "border-[#7fb0ff] bg-[#e9f2ff] shadow-[0_18px_50px_rgba(37,99,235,0.12)]"
                        : "border-[#c9daf5] bg-white hover:bg-[#eef4ff]"
                    } disabled:cursor-not-allowed disabled:border-[#d7e4f6] disabled:bg-[#f5f8fc]`}
                  >
                    <div className="flex h-full flex-col justify-between gap-4">
                      <div className="flex items-center justify-between gap-3">
                        <VerificationMark provider="world" />
                        {humanityMethod === "world" ? (
                          <CheckCircle2 className="h-5 w-5 text-[#1d6f42]" />
                        ) : null}
                      </div>
                      <div>
                        <p className="text-base font-semibold text-[#10233f]">World ID</p>
                        <p className="mt-2 text-sm leading-6 text-[#5c6f8d]">
                          Private proof through World App.
                        </p>
                      </div>
                      <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[#2563eb]">
                        {isPreparingWorld
                          ? "Preparing"
                          : isVerifyingWorld
                            ? "Confirming"
                            : humanityMethod === "world"
                              ? "Verified"
                              : "Verify"}
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={handleCoinbaseVerification}
                    disabled={isVerifyingCoinbase}
                    className={`min-h-[156px] rounded-[1.4rem] border px-4 py-4 text-left transition ${
                      humanityMethod === "coinbase"
                        ? "border-[#7fb0ff] bg-[#e9f2ff] shadow-[0_18px_50px_rgba(0,82,255,0.10)]"
                        : "border-[#c9daf5] bg-white hover:bg-[#eef4ff]"
                    } disabled:cursor-not-allowed disabled:border-[#d7e4f6] disabled:bg-[#f5f8fc]`}
                  >
                    <div className="flex h-full flex-col justify-between gap-4">
                      <div className="flex items-center justify-between gap-3">
                        <VerificationMark provider="coinbase" />
                        {humanityMethod === "coinbase" ? (
                          <CheckCircle2 className="h-5 w-5 text-[#1d6f42]" />
                        ) : null}
                      </div>
                      <div>
                        <p className="text-base font-semibold text-[#10233f]">Coinbase Verified</p>
                        <p className="mt-2 text-sm leading-6 text-[#5c6f8d]">
                          Checks the Base mainnet verification tied to this wallet.
                        </p>
                      </div>
                      <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[#0052ff]">
                        {isVerifyingCoinbase
                          ? "Checking"
                          : humanityMethod === "coinbase"
                            ? "Verified"
                            : "Use Coinbase"}
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={handleOpenSelfVerification}
                    disabled={isFetchingSelfToken || !selfApp}
                    className={`min-h-[156px] rounded-[1.4rem] border px-4 py-4 text-left transition ${
                      humanityMethod === "self"
                        ? "border-[#7fb0ff] bg-[#e9f2ff] shadow-[0_18px_50px_rgba(16,35,63,0.10)]"
                        : "border-[#c9daf5] bg-white hover:bg-[#eef4ff]"
                    } disabled:cursor-not-allowed disabled:border-[#d7e4f6] disabled:bg-[#f5f8fc]`}
                  >
                    <div className="flex h-full flex-col justify-between gap-4">
                      <div className="flex items-center justify-between gap-3">
                        <VerificationMark provider="self" />
                        {humanityMethod === "self" ? (
                          <CheckCircle2 className="h-5 w-5 text-[#1d6f42]" />
                        ) : null}
                      </div>
                      <div>
                        <p className="text-base font-semibold text-[#10233f]">Self Pass</p>
                        <p className="mt-2 text-sm leading-6 text-[#5c6f8d]">
                          Opens a QR proof from the Self app.
                        </p>
                      </div>
                      <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[#10233f]">
                        {isFetchingSelfToken
                          ? "Finalizing"
                          : humanityMethod === "self"
                            ? "Verified"
                            : "Open QR"}
                      </div>
                    </div>
                  </button>
                </div>

                {isSelfCardOpen && selfApp ? (
                  <div className="mt-5 overflow-hidden rounded-[1.25rem] border border-[#d7e4f6] bg-white p-3 shadow-[0_16px_40px_rgba(37,99,235,0.08)] sm:rounded-[1.45rem] sm:p-4">
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                      <div className="max-w-md">
                        <p className="text-sm font-semibold text-[#10233f]">
                          Verify with Self Pass
                        </p>
                        <p className="mt-2 text-sm leading-7 text-[#52637e]">
                          Scan this QR code in Self to prove document-backed humanity without
                          revealing unnecessary personal data to WiFiProof.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsSelfCardOpen(false)}
                        className="min-h-11 rounded-full border border-[#d7e4f6] bg-[#f8fbff] px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#5e7ca8] transition hover:bg-white"
                      >
                        Hide Self QR
                      </button>
                    </div>

                    <div className="mt-5 flex justify-center overflow-hidden">
                      <div className="max-w-full rounded-[1.35rem] border border-[#e2ebfa] bg-[#fbfdff] p-2 sm:rounded-[1.75rem] sm:p-4">
                        <SelfQRcodeWrapper
                          selfApp={selfApp}
                          onSuccess={() => {
                            void completeSelfVerification();
                          }}
                          onError={(data) => {
                            setSelfStatus("");
                            setErrorMsg(
                              data.reason || data.error_code || "Self verification failed."
                            );
                          }}
                          size={selfQrSize}
                        />
                      </div>
                    </div>
                  </div>
                ) : null}

                {isHumanityVerified ? (
                  <div className="mt-4 rounded-[1.2rem] border border-[#b9d8be] bg-[#edf7ef] px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#1d6f42] text-white">
                        <CheckCircle2 className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-[#155734]">Humanity verified</p>
                        <p className="text-xs leading-6 text-[#35634a]">
                          Verified with {humanityMethodLabel}. You can continue to claim.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : worldStatus ? (
                  <p className="mt-4 text-sm font-medium text-[#1d6f42]">{worldStatus}</p>
                ) : coinbaseStatus ? (
                  <p className="mt-4 text-sm font-medium text-[#1d6f42]">{coinbaseStatus}</p>
                ) : selfStatus ? (
                  <p className="mt-4 text-sm font-medium text-[#1d6f42]">{selfStatus}</p>
                ) : null}
                {!isWorldConfigured && (
                  <p className="mt-4 text-sm font-medium text-[#9c6a0a]">
                    World ID is not configured in this environment, but Coinbase and Self verification are still available.
                  </p>
                )}
                <p className="mt-3 text-xs leading-6 text-[#6a7891]">
                  Desktop: scan in World App. Mobile: approve and return here.
                </p>
                <p className="mt-2 text-xs leading-6 text-[#6a7891]">
                  Coinbase path: connect the wallet that already holds your Coinbase/Base verification.
                </p>
                <p className="mt-2 text-xs leading-6 text-[#6a7891]">
                  Self path: use the Self app to prove document-backed humanity, then return here to mint.
                </p>
              </div>

              <button
                onClick={handleClaim}
                disabled={!humanityToken}
                className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#10233f] px-5 py-4 text-sm font-semibold text-white transition hover:bg-[#17345e] disabled:cursor-not-allowed disabled:bg-[#96abc8]"
              >
                {humanityToken ? "Prove presence and mint" : "Complete humanity check first"}
              </button>
            </div>

            <div className="space-y-4">
              <aside className="rounded-[1.75rem] border border-[#cfe1ff] bg-white/86 p-5 shadow-[0_18px_50px_rgba(37,99,235,0.08)]">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#5e7ca8]">
                  Checks
                </p>
                <ul className="mt-4 space-y-3 text-sm leading-7 text-[#52637e]">
                  <li>Humanity via World ID, Coinbase, or Self Pass</li>
                  <li>Venue network</li>
                  <li>Location proof</li>
                  <li>On-chain verification</li>
                </ul>
              </aside>

              <aside className="ink-panel rounded-[1.75rem] p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#d6e7ff]">
                  Event
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
            <div className="ink-panel rounded-[1.6rem] p-5 sm:rounded-[2rem] sm:p-8">
              <Loader2 className="h-12 w-12 animate-spin text-[#d6e7ff]" />
              <p className="mt-8 text-xs font-semibold uppercase tracking-[0.18em] text-[#d6e7ff]">
                Step 3
              </p>
              <h2 className="display-type mt-3 text-3xl leading-tight tracking-[-0.03em] text-white sm:text-4xl md:text-5xl">
                Building your on-site proof.
              </h2>
              <p className="mt-4 text-sm leading-7 text-[#d6e7ff] md:text-base">
                We are checking the venue network, reading geolocation in the
                browser, generating the ZK proof locally, sending the wallet
                transaction, and archiving the claim receipt.
              </p>
              <div className="mt-8 rounded-[1.5rem] border border-white/10 bg-white/5 p-4">
                <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.14em] text-[#c6d9f7]">
                  <span>Progress</span>
                  <span>{progressValue}%</span>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-[#8fc0ff] transition-all duration-500"
                    style={{ width: `${progressValue}%` }}
                  />
                </div>
              </div>
              <div className="mt-8 break-words rounded-[1.5rem] border border-white/10 bg-white/5 p-4 font-mono text-sm text-[#f5f9ff]">
                {statusMsg}
              </div>
              {proofDurationMs !== null && proofBytes !== null && (
                <div className="mt-4 rounded-[1.5rem] border border-[#8fc0ff]/20 bg-[#17365f] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#9fc0ff]">
                    Proof generated locally
                  </p>
                  <p className="mt-2 text-lg font-semibold text-white">
                    {(proofBytes / 1024).toFixed(1)} KB in {(proofDurationMs / 1000).toFixed(2)}s
                  </p>
                </div>
              )}
              <p className="mt-4 text-xs leading-6 text-[#c6d9f7]">
                Your exact coordinates are not sent to the backend while this is happening.
              </p>
            </div>

            <div className="rounded-[1.6rem] border border-[#cfe1ff] bg-white/86 p-4 shadow-[0_24px_70px_rgba(37,99,235,0.08)] sm:rounded-[2rem] sm:p-6 md:p-8">
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
                      className={`flex items-start gap-3 rounded-[1.25rem] border px-4 py-4 sm:items-center sm:gap-4 ${
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
                      <p className="min-w-0 text-sm font-medium leading-6 text-[#10233f]">{item.label}</p>
                    </div>
                  );
                })}
              </div>
              {proofDurationMs !== null && proofBytes !== null && (
                <div className="mt-6 rounded-[1.5rem] border border-[#dbe8fb] bg-[#f8fbff] p-4 text-sm leading-7 text-[#52637e]">
                  The zero-knowledge proof was generated in your browser, not on the server.
                </div>
              )}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <div className="ink-panel rounded-[1.6rem] p-5 sm:rounded-[2.25rem] sm:p-8 md:p-10">
              <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-end">
                <div>
                  <CheckCircle2 className="h-16 w-16 text-[#a7d99a]" />
                  <p className="mt-8 text-xs font-semibold uppercase tracking-[0.18em] text-[#d6e7ff]">
                    Step 4
                  </p>
                  <h2 className="display-type mt-3 max-w-3xl text-3xl leading-[0.98] tracking-[-0.04em] text-white sm:text-4xl md:text-6xl">
                    Presence verified.
                  </h2>
                  <p className="mt-4 max-w-2xl text-sm leading-7 text-[#d6e7ff] md:text-base">
                    This is your permanent, on-chain record that you were at{" "}
                    {event?.venue_name ?? "this event"}.
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-[1.6rem] border border-white/10 bg-white/5 p-4">
                    <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-[#d6e7ff]">
                      Event
                    </span>
                    <span className="block text-lg font-semibold text-white">
                      {event?.venue_name ?? "-"}
                    </span>
                  </div>
                  <div className="rounded-[1.6rem] border border-white/10 bg-white/5 p-4">
                    <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-[#d6e7ff]">
                      Minted
                    </span>
                    <span className="block text-sm leading-7 text-[#f5f9ff]">
                      {claimedAt
                        ? new Date(claimedAt).toLocaleString()
                        : new Date().toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                {easScanUrl && (
                  <a
                    href={easScanUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-[#f5f9ff] px-5 py-3 text-sm font-semibold text-[#10233f] transition hover:bg-white"
                  >
                    View on EASScan
                    <ArrowUpRight className="h-4 w-4" />
                  </a>
                )}
                {txExplorerUrl && (
                  <a
                    href={txExplorerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-white/12 px-5 py-3 text-sm font-semibold text-[#f5f9ff] transition hover:bg-white/6"
                  >
                    View transaction
                    <ArrowUpRight className="h-4 w-4" />
                  </a>
                )}
                {easScanUrl && (
                  <button
                    type="button"
                    onClick={handleShareAttestation}
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-white/12 px-5 py-3 text-sm font-semibold text-[#f5f9ff] transition hover:bg-white/6"
                  >
                    Share
                    <Share2 className="h-4 w-4" />
                  </button>
                )}
                {attestationUid && (
                  <button
                    type="button"
                    onClick={handleCopyUid}
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-white/12 px-5 py-3 text-sm font-semibold text-[#f5f9ff] transition hover:bg-white/6"
                  >
                    {copiedUid ? "Copied!" : "Copy UID"}
                    <Copy className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="rounded-[1.6rem] border border-[#cfe1ff] bg-white/88 p-4 shadow-[0_24px_70px_rgba(37,99,235,0.08)] sm:rounded-[2rem] sm:p-6 md:p-8">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#5e7ca8]">
                  Attestation card
                </p>
                <div className="mt-6 rounded-[1.4rem] border border-[#dbe8fb] bg-[#f8fbff] p-4 sm:rounded-[1.8rem] sm:p-5 md:p-6">
                  <div className="grid gap-5 md:grid-cols-2">
                    <div>
                      <span className="block text-xs font-semibold uppercase tracking-[0.14em] text-[#6a89b6]">
                        Event
                      </span>
                      <span className="mt-2 block text-2xl font-semibold text-[#10233f]">
                        {event?.venue_name ?? "-"}
                      </span>
                    </div>
                    <div>
                      <span className="block text-xs font-semibold uppercase tracking-[0.14em] text-[#6a89b6]">
                        Wallet
                      </span>
                      <span className="mt-2 block break-all font-mono text-sm leading-7 text-[#10233f]">
                        {walletAddress}
                      </span>
                    </div>
                    <div>
                      <span className="block text-xs font-semibold uppercase tracking-[0.14em] text-[#6a89b6]">
                        Minted
                      </span>
                      <span className="mt-2 block text-sm leading-7 text-[#52637e]">
                        {claimedAt
                          ? new Date(claimedAt).toLocaleString()
                          : new Date().toLocaleString()}
                      </span>
                    </div>
                    <div>
                      <span className="block text-xs font-semibold uppercase tracking-[0.14em] text-[#6a89b6]">
                        Attestation UID
                      </span>
                      <span className="mt-2 block break-all font-mono text-sm leading-7 text-[#10233f]">
                        {attestationUid}
                      </span>
                    </div>
                  </div>
                </div>

                {artifactCid && (
                  <div className="mt-5 rounded-[1.5rem] border border-[#dbe8fb] bg-[#f8fbff] p-4">
                    <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.14em] text-[#6a89b6]">
                      Archive CID
                    </span>
                    <span className="block break-all font-mono text-sm leading-7 text-[#10233f]">
                      {artifactCid}
                    </span>
                  </div>
                )}

                {artifactCid && (
                  <div className="mt-5">
                    <a
                      href={`https://ipfs.io/ipfs/${artifactCid}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2 rounded-full border border-[#cfe1ff] bg-white px-5 py-3 text-sm font-semibold text-[#10233f] transition hover:bg-[#f8fbff]"
                    >
                      View archived payload
                      <ArrowUpRight className="h-4 w-4" />
                    </a>
                  </div>
                )}
              </div>

              <div className="space-y-6">
                {event?.poster_image_url && (
                  <div className="overflow-hidden rounded-[1.9rem] border border-[#cfe1ff] bg-white/88 shadow-[0_18px_50px_rgba(37,99,235,0.08)]">
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

                <div className="rounded-[1.75rem] border border-[#cfe1ff] bg-white/88 p-5 shadow-[0_18px_50px_rgba(37,99,235,0.08)]">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#5e7ca8]">
                    Receipt summary
                  </p>
                  <div className="mt-4 space-y-4 text-sm leading-7 text-[#52637e]">
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
            if (humanityMethod === "world") {
              setHumanityToken("");
              setHumanityMethod(null);
            }
          }}
        />
      )}
    </section>
  );
}
