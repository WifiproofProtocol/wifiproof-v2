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
import { baseSepolia } from "viem/chains";

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

export default function OrganizerClient() {
  const [venueName, setVenueName] = useState("");
  const [venueLat, setVenueLat] = useState("");
  const [venueLon, setVenueLon] = useState("");
  const [radiusMeters, setRadiusMeters] = useState("150");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [subnetPrefix, setSubnetPrefix] = useState("");
  const [status, setStatus] = useState<string>("");
  const [eventId, setEventId] = useState<string>("");
  const [venueHash, setVenueHash] = useState<string>("");
  const [qrDataUrl, setQrDataUrl] = useState<string>("");

  const wifiproofAddress = (
    process.env.NEXT_PUBLIC_WIFIPROOF_ADDRESS ??
    "0xbcEfE9B5a2f1C0FA6f0E02c8c678CF41884e3f7C"
  ).trim();

  const rpcUrl =
    process.env.NEXT_PUBLIC_BASE_RPC_URL ?? "https://sepolia.base.org";

  const publicClient = useMemo(() => {
    return createPublicClient({ chain: baseSepolia, transport: http(rpcUrl) });
  }, [rpcUrl]);

  async function ensureBaseSepolia() {
    if (!window.ethereum) {
      return false;
    }

    const chainIdHex = (await window.ethereum.request({
      method: "eth_chainId",
    })) as string;

    if (chainIdHex?.toLowerCase() === "0x14a34") {
      return true;
    }

    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: "0x14A34" }],
      });
      return true;
    } catch (error) {
      const err = error as { code?: number; message?: string };
      if (err.code === 4902) {
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: "0x14A34",
              chainName: "Base Sepolia",
              rpcUrls: ["https://sepolia.base.org"],
              nativeCurrency: {
                name: "Sepolia ETH",
                symbol: "ETH",
                decimals: 18,
              },
              blockExplorerUrls: ["https://sepolia.basescan.org"],
            },
          ],
        });
        return true;
      }
      setStatus(err.message ?? "Failed to switch network.");
      return false;
    }
  }

  async function handleUseCurrentLocation() {
    setStatus("Fetching GPS location...");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setVenueLat(pos.coords.latitude.toString());
        setVenueLon(pos.coords.longitude.toString());
        setStatus("");
      },
      (err) => {
        setStatus(`Location error: ${err.message}`);
      }
    );
  }

  async function handleCreateEvent() {
    try {
      setStatus("Preparing event...");

      if (!venueName || !venueLat || !venueLon || !startTime || !endTime || !subnetPrefix) {
        setStatus("Missing required fields.");
        return;
      }

      if (!window.ethereum) {
        setStatus("Wallet not found. Install a wallet like Coinbase Wallet or MetaMask.");
        return;
      }

      setStatus("Switching to Base Sepolia...");
      const switched = await ensureBaseSepolia();
      if (!switched) {
        return;
      }

      const lat = Number(venueLat);
      const lon = Number(venueLon);
      const radius = Number(radiusMeters);
      const start = Math.floor(new Date(startTime).getTime() / 1000);
      const end = Math.floor(new Date(endTime).getTime() / 1000);

      if (Number.isNaN(lat) || Number.isNaN(lon) || Number.isNaN(radius)) {
        setStatus("Invalid coordinates or radius.");
        return;
      }

      const eventSeed = `${venueName}:${start}:${end}`;
      const derivedEventId = keccak256(toBytes(eventSeed));

      const scaledLat = BigInt(toScaled(lat));
      const scaledLon = BigInt(toScaled(lon));
      const thresholdSq = thresholdSqScaled(radius);

      const computedVenueHash = await publicClient.readContract({
        address: wifiproofAddress as `0x${string}`,
        abi: WIFI_PROOF_ABI,
        functionName: "computeVenueHashFromScaled",
        args: [scaledLat, scaledLon, thresholdSq, derivedEventId],
      });

      setStatus("Requesting wallet signature...");
      const walletClient = createWalletClient({
        chain: baseSepolia,
        transport: custom(window.ethereum),
      });

      const [account] = await walletClient.requestAddresses();

      setStatus("Generating organizer proof...");
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject);
      });

      const userLat = position.coords.latitude;
      const userLon = position.coords.longitude;

      const { WiFiProofProver, buildInputs } = await import("@wifiproof/proof-app");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const circuit = await loadCircuit() as any;
      const prover = new WiFiProofProver();
      await prover.init(circuit);

      const inputs = buildInputs(
        { lat: userLat, lon: userLon },
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
      });

      setStatus("Requesting organizer authorization...");
      const deadline = Math.floor(Date.now() / 1000) + 600;
      const devHeaders: Record<string, string> =
        process.env.NODE_ENV === "development"
          ? { "x-forwarded-for": subnetPrefix + "1" }
          : {};
      const authorizeResponse = await fetch("/api/events/authorize", {
        method: "POST",
        headers: { "content-type": "application/json", ...devHeaders },
        body: JSON.stringify({
          organizer: account,
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
        const text = await authorizeResponse.text();
        throw new Error(`Authorization failed: ${text}`);
      }

      const { signature } = await authorizeResponse.json();

      setStatus("Creating event on-chain...");
      const txHash = await walletClient.writeContract({
        address: wifiproofAddress as `0x${string}`,
        abi: WIFI_PROOF_ABI,
        functionName: "createEventWithSig",
        account,
        args: [
          account,
          derivedEventId,
          computedVenueHash,
          BigInt(start),
          BigInt(end),
          venueName,
          BigInt(deadline),
          signature,
        ],
      });

      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
      if (receipt.status !== "success") {
        throw new Error("Transaction failed. Event not created.");
      }

      setStatus("Saving event metadata...");
      const saveResponse = await fetch("/api/events/create", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
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
      const qr = await QRCode.toDataURL(eventUrl, { margin: 1, width: 220 });
      setQrDataUrl(qr);
      setEventId(derivedEventId);
      setVenueHash(computedVenueHash);
      setStatus("Event created successfully.");
    } catch (error) {
      setStatus(`Error: ${(error as Error).message}`);
    }
  }

  return (
    <section className="mx-auto max-w-3xl space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold">Create an Event</h1>
        <p className="text-white/70">
          This writes the event on-chain and stores metadata in Supabase.
        </p>
      </div>

      <div className="grid gap-4 rounded-2xl border border-white/10 bg-white/5 p-6">
        <label className="grid gap-2">
          <span className="text-sm text-white/70">Event name</span>
          <input
            className="rounded-lg bg-black/40 px-3 py-2 text-white"
            value={venueName}
            onChange={(e) => setVenueName(e.target.value)}
            placeholder="Base Batches 003 test event"
          />
        </label>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-2">
            <span className="text-sm text-white/70">Venue latitude</span>
            <input
              className="rounded-lg bg-black/40 px-3 py-2 text-white"
              value={venueLat}
              onChange={(e) => setVenueLat(e.target.value)}
              placeholder="37.7749"
            />
          </label>
          <label className="grid gap-2">
            <span className="text-sm text-white/70">Venue longitude</span>
            <input
              className="rounded-lg bg-black/40 px-3 py-2 text-white"
              value={venueLon}
              onChange={(e) => setVenueLon(e.target.value)}
              placeholder="-122.4194"
            />
          </label>
        </div>

        <button
          type="button"
          onClick={handleUseCurrentLocation}
          className="rounded-lg border border-white/20 px-4 py-2 text-sm text-white/80 hover:bg-white/10"
        >
          Use current location
        </button>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-2">
            <span className="text-sm text-white/70">Radius (meters)</span>
            <input
              className="rounded-lg bg-black/40 px-3 py-2 text-white"
              value={radiusMeters}
              onChange={(e) => setRadiusMeters(e.target.value)}
            />
          </label>
          <label className="grid gap-2">
            <span className="text-sm text-white/70">WiFi subnet prefix</span>
            <input
              className="rounded-lg bg-black/40 px-3 py-2 text-white"
              value={subnetPrefix}
              onChange={(e) => setSubnetPrefix(e.target.value)}
              placeholder="192.168.1"
            />
          </label>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-2">
            <span className="text-sm text-white/70">Start time</span>
            <input
              type="datetime-local"
              className="rounded-lg bg-black/40 px-3 py-2 text-white"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            />
          </label>
          <label className="grid gap-2">
            <span className="text-sm text-white/70">End time</span>
            <input
              type="datetime-local"
              className="rounded-lg bg-black/40 px-3 py-2 text-white"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
            />
          </label>
        </div>

        <button
          type="button"
          onClick={handleCreateEvent}
          className="rounded-lg bg-white px-4 py-2 font-semibold text-black hover:bg-white/90"
        >
          Create event
        </button>

        {status && <p className="text-sm text-white/70">{status}</p>}
      </div>

      {eventId && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-3">
          <h2 className="text-xl font-semibold">Event created</h2>
          <p className="break-all text-sm text-white/70">Event ID: {eventId}</p>
          {venueHash && (
            <p className="break-all text-sm text-white/70">Venue hash: {venueHash}</p>
          )}
          {qrDataUrl && (
            <img
              src={qrDataUrl}
              alt="Event QR code"
              className="h-56 w-56 rounded-lg border border-white/20 bg-white/5 p-2"
            />
          )}
        </div>
      )}
    </section>
  );
}
