"use client";

import { useState } from "react";

import ProductShell from "@/components/product/ProductShell";

type Result = {
  ok: boolean;
  currentSignerMode?: string;
  litNetwork?: string;
  expectedLitSigner?: string;
  actionCid?: string;
  attendanceAuthorization?: {
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
    <ProductShell>
      <section className="space-y-8">
        <div className="max-w-3xl space-y-3">
          <p className="product-kicker">Development check</p>
          <h1 className="product-page-title">Lit signer</h1>
          <p className="max-w-xl text-[var(--signal-muted)]">
            Sign one test attendance authorization and verify that it came from the
            configured PKP.
          </p>
        </div>

        <button
          type="button"
          onClick={runTest}
          disabled={isLoading}
          className="rounded-full bg-[var(--signal-cobalt)] px-5 py-3 text-sm font-semibold text-white transition hover:brightness-95 disabled:opacity-60"
        >
          {isLoading ? "Running…" : "Run signer check"}
        </button>

        {result && (
        <div className="product-panel max-w-4xl space-y-4 p-5 sm:p-7">
          {!result.ok && (
            <div className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-800">
              {result.error}
            </div>
          )}

          {result.ok && (
            <>
              <SummaryRow label="Current app signer mode" value={result.currentSignerMode ?? "-"} />
              <SummaryRow label="Lit network" value={result.litNetwork ?? "-"} />
              <SummaryRow label="Expected Lit signer" value={result.expectedLitSigner ?? "-"} />
              <SummaryRow label="Action CID" value={result.actionCid ?? "-"} />
              <SummaryRow
                label="Authorization signer"
                value={result.attendanceAuthorization?.recovered ?? "-"}
                tone={result.attendanceAuthorization?.matchesExpected ? "ok" : "warn"}
              />

              <div className="space-y-3 pt-2">
                <pre className="overflow-x-auto rounded-xl bg-[var(--signal-ink)] p-4 text-xs text-white">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </div>
            </>
          )}
        </div>
        )}
      </section>
    </ProductShell>
  );
}

function SummaryRow(props: { label: string; value: string; tone?: "ok" | "warn" }) {
  const toneClass =
    props.tone === "ok"
      ? "text-emerald-700"
      : props.tone === "warn"
        ? "text-amber-700"
        : "text-[var(--signal-ink)]";

  return (
    <div className="grid gap-1 sm:grid-cols-[220px_1fr]">
      <div className="text-sm text-[var(--signal-muted)]">{props.label}</div>
      <div className={`break-all font-mono text-sm ${toneClass}`}>{props.value}</div>
    </div>
  );
}
