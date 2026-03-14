"use client";

import { useState } from "react";

type Result = {
  ok: boolean;
  currentSignerMode?: string;
  litNetwork?: string;
  expectedLitSigner?: string;
  contractIpSigner?: string;
  contractMatchesLitSigner?: boolean;
  ipVerification?: {
    recovered: string;
    matchesExpected: boolean;
    signature: string;
  };
  eventAuthorization?: {
    recovered: string;
    matchesExpected: boolean;
    signature: string;
  };
  error?: string;
};

export function LitSignerTestClient() {
  const [result, setResult] = useState<Result | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function runTest() {
    try {
      setIsLoading(true);
      setResult(null);

      const response = await fetch("/api/dev/lit-signer-test", {
        cache: "no-store",
      });

      const json = (await response.json()) as Result;
      setResult(json);
    } catch (error) {
      setResult({
        ok: false,
        error: (error as Error).message,
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section className="mx-auto max-w-4xl space-y-6 px-4 py-10">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold text-white">Dev: Lit Signer Test</h1>
        <p className="text-sm text-slate-400">
          This hits the Lit signer directly, signs both EIP-712 payload types, recovers
          the signer, and compares it to the contract&apos;s current <code>ipSigner</code>.
        </p>
      </div>

      <button
        type="button"
        onClick={runTest}
        disabled={isLoading}
        className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-400 disabled:opacity-60"
      >
        {isLoading ? "Running..." : "Run Lit Signer Test"}
      </button>

      {result && (
        <div className="space-y-4 rounded-xl border border-slate-800 bg-slate-950/40 p-4">
          {!result.ok && (
            <div className="rounded-lg border border-red-900/40 bg-red-950/30 p-3 text-sm text-red-300">
              {result.error}
            </div>
          )}

          {result.ok && (
            <>
              <SummaryRow label="Current app signer mode" value={result.currentSignerMode ?? "-"} />
              <SummaryRow label="Lit network" value={result.litNetwork ?? "-"} />
              <SummaryRow label="Expected Lit signer" value={result.expectedLitSigner ?? "-"} />
              <SummaryRow label="Contract ipSigner" value={result.contractIpSigner ?? "-"} />
              <SummaryRow
                label="Contract matches Lit signer"
                value={String(result.contractMatchesLitSigner)}
                tone={result.contractMatchesLitSigner ? "ok" : "warn"}
              />
              <SummaryRow
                label="IPVerification recovered"
                value={result.ipVerification?.recovered ?? "-"}
                tone={result.ipVerification?.matchesExpected ? "ok" : "warn"}
              />
              <SummaryRow
                label="EventAuthorization recovered"
                value={result.eventAuthorization?.recovered ?? "-"}
                tone={result.eventAuthorization?.matchesExpected ? "ok" : "warn"}
              />

              <div className="space-y-3 pt-2">
                <pre className="overflow-x-auto rounded-lg bg-slate-900 p-3 text-xs text-slate-200">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </div>
            </>
          )}
        </div>
      )}
    </section>
  );
}

function SummaryRow(props: { label: string; value: string; tone?: "ok" | "warn" }) {
  const toneClass =
    props.tone === "ok"
      ? "text-emerald-300"
      : props.tone === "warn"
        ? "text-amber-300"
        : "text-slate-200";

  return (
    <div className="grid gap-1 sm:grid-cols-[220px_1fr]">
      <div className="text-sm text-slate-400">{props.label}</div>
      <div className={`break-all font-mono text-sm ${toneClass}`}>{props.value}</div>
    </div>
  );
}
