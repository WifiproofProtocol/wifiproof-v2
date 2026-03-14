"use client";

import { useMemo, useState } from "react";

type ArchivePayload = {
  eventId: `0x${string}`;
  wallet: `0x${string}`;
  txHash: `0x${string}`;
  attestationUid: `0x${string}`;
  proofHash: `0x${string}`;
  publicInputsHash: `0x${string}`;
  network: string;
};

function randomHex(bytes: number): `0x${string}` {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  const hex = Array.from(arr, (x) => x.toString(16).padStart(2, "0")).join("");
  return `0x${hex}`;
}

function defaultPayload(): ArchivePayload {
  return {
    eventId: randomHex(32),
    wallet: randomHex(20),
    txHash: randomHex(32),
    attestationUid: randomHex(32),
    proofHash: randomHex(32),
    publicInputsHash: randomHex(32),
    network: "base-sepolia",
  };
}

export function ArchiveTestClient() {
  const [payload, setPayload] = useState<ArchivePayload>(() => defaultPayload());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<{ cid?: string; error?: string } | null>(null);

  const cidLink = useMemo(() => {
    if (!result?.cid) return "";
    return `https://ipfs.io/ipfs/${result.cid}`;
  }, [result?.cid]);

  function refreshSample() {
    setPayload(defaultPayload());
    setResult(null);
  }

  async function submitArchiveTest() {
    try {
      setResult(null);
      setIsSubmitting(true);

      const response = await fetch("/api/claims/archive", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = (await response.json().catch(() => ({}))) as {
        cid?: string;
        error?: string;
        detail?: string;
        code?: string;
      };
      if (!response.ok) {
        const detail = [json.detail, json.code].filter(Boolean).join(" | ");
        throw new Error(detail ? `${json.error ?? "Archive request failed"}: ${detail}` : (json.error ?? "Archive request failed"));
      }

      setResult({ cid: json.cid });
    } catch (error) {
      setResult({ error: (error as Error).message });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="mx-auto max-w-3xl space-y-6 px-4 py-10">
      <h1 className="text-2xl font-semibold">Dev: Storacha Archive Test</h1>
      <p className="text-sm text-slate-400">
        This page now verifies a real onchain attendance claim before it archives
        to <code>/api/claims/archive</code>.
      </p>
      <p className="text-xs text-amber-300">
        Use a real <code>eventId</code>, <code>wallet</code>, and Base Sepolia claim{" "}
        <code>txHash</code>.
      </p>

      <div className="grid gap-3 rounded-xl border border-slate-800 bg-slate-950/40 p-4">
        <Field
          label="eventId (bytes32)"
          value={payload.eventId}
          onChange={(v) => setPayload((prev) => ({ ...prev, eventId: v as `0x${string}` }))}
        />
        <Field
          label="wallet (address)"
          value={payload.wallet}
          onChange={(v) => setPayload((prev) => ({ ...prev, wallet: v as `0x${string}` }))}
        />
        <Field
          label="txHash (bytes32)"
          value={payload.txHash}
          onChange={(v) => setPayload((prev) => ({ ...prev, txHash: v as `0x${string}` }))}
        />
        <Field
          label="attestationUid (bytes32)"
          value={payload.attestationUid}
          onChange={(v) => setPayload((prev) => ({ ...prev, attestationUid: v as `0x${string}` }))}
        />
        <Field
          label="proofHash (bytes32)"
          value={payload.proofHash}
          onChange={(v) => setPayload((prev) => ({ ...prev, proofHash: v as `0x${string}` }))}
        />
        <Field
          label="publicInputsHash (bytes32)"
          value={payload.publicInputsHash}
          onChange={(v) =>
            setPayload((prev) => ({ ...prev, publicInputsHash: v as `0x${string}` }))
          }
        />
        <Field
          label="network"
          value={payload.network}
          onChange={(v) => setPayload((prev) => ({ ...prev, network: v }))}
        />

        <div className="mt-2 flex gap-3">
          <button
            type="button"
            onClick={submitArchiveTest}
            disabled={isSubmitting}
            className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-400 disabled:opacity-60"
          >
            {isSubmitting ? "Archiving..." : "Test Archive to Storacha"}
          </button>
          <button
            type="button"
            onClick={refreshSample}
            className="rounded-lg border border-slate-600 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-900"
          >
            New Sample Payload
          </button>
        </div>
      </div>

      {result?.error && (
        <div className="rounded-lg border border-red-900/40 bg-red-950/30 p-3 text-sm text-red-300">
          {result.error}
        </div>
      )}

      {result?.cid && (
        <div className="space-y-2 rounded-lg border border-emerald-900/40 bg-emerald-950/30 p-3 text-sm text-emerald-300">
          <p>
            CID: <span className="font-mono">{result.cid}</span>
          </p>
          <a
            href={cidLink}
            target="_blank"
            rel="noreferrer"
            className="inline-block text-cyan-300 underline"
          >
            Open on IPFS gateway
          </a>
        </div>
      )}
    </section>
  );
}

function Field(props: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-400">{props.label}</span>
      <input
        value={props.value}
        onChange={(e) => props.onChange(e.target.value.trim())}
        className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 font-mono text-xs text-slate-200 outline-none focus:border-cyan-500"
      />
    </label>
  );
}
