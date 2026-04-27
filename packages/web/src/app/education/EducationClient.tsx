"use client";

import { useMemo } from "react";
import {
  CheckCircle2,
  KeyRound,
  Loader2,
  LogOut,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import {
  PrivyProvider,
  useLoginWithPasskey,
  useLogout,
  usePrivy,
  useSignupWithPasskey,
  useWallets,
} from "@privy-io/react-auth";

const educationNotes = [
  "Passkey sign-in instead of passwords",
  "Embedded wallet creation on login",
  "Base-ready smart wallet support through Privy",
  "Institutional identity stays outside the chain",
];

const privyAppId = (process.env.NEXT_PUBLIC_PRIVY_APP_ID ?? "").trim();
const privyClientId = (process.env.NEXT_PUBLIC_PRIVY_CLIENT_ID ?? "").trim();

function formatWallet(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function InstitutionalAccessPanel() {
  const { ready, authenticated } = usePrivy();
  const { wallets, ready: walletsReady } = useWallets();
  const { logout } = useLogout();
  const { loginWithPasskey, state: loginState } = useLoginWithPasskey();
  const { signupWithPasskey, state: signupState } = useSignupWithPasskey();

  const activeWallet = wallets[0] ?? null;
  const activeState = loginState.status !== "initial" ? loginState : signupState;
  const isBusy =
    loginState.status === "generating-challenge" ||
    loginState.status === "awaiting-passkey" ||
    loginState.status === "submitting-response" ||
    signupState.status === "generating-challenge" ||
    signupState.status === "awaiting-passkey" ||
    signupState.status === "submitting-response";
  const errorMessage =
    loginState.status === "error"
      ? loginState.error?.message
      : signupState.status === "error"
        ? signupState.error?.message
        : "";
  const statusCopy = useMemo(() => {
    switch (activeState.status) {
      case "generating-challenge":
        return "Preparing passkey challenge...";
      case "awaiting-passkey":
        return "Approve the passkey prompt on this device.";
      case "submitting-response":
        return "Finishing secure sign-in...";
      case "done":
        return "Passkey verified. Finishing institutional access...";
      default:
        return "";
    }
  }, [activeState.status]);

  if (!ready) {
    return (
      <div className="rounded-[1.9rem] border border-[#cfe1ff] bg-white/88 p-6 shadow-[0_24px_70px_rgba(37,99,235,0.08)]">
        <div className="flex items-center gap-3 text-[#2563eb]">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm font-medium">Preparing institutional access...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
      <div className="rounded-[2rem] border border-[#cfe1ff] bg-white/88 p-6 shadow-[0_24px_70px_rgba(37,99,235,0.08)] md:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#5e7ca8]">
          Institutional mode
        </p>
        <h2 className="display-type mt-3 text-3xl leading-tight tracking-[-0.03em] text-[#10233f] md:text-4xl">
          Sign in with passkeys. Get an embedded wallet automatically.
        </h2>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-[#52637e] md:text-base">
          This mode is built for schools, bootcamps, and training programs that want fast
          student access without asking users to manage wallets or passwords first.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          {educationNotes.map((note) => (
            <span
              key={note}
              className="rounded-full border border-[#cfe1ff] bg-[#f7fbff] px-4 py-2 text-sm font-medium text-[#31517f]"
            >
              {note}
            </span>
          ))}
        </div>

        {!authenticated ? (
          <div className="mt-8 space-y-4">
            <button
              type="button"
              onClick={() => void signupWithPasskey()}
              disabled={isBusy}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#2563eb] px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-[#1d4ed8] disabled:cursor-not-allowed disabled:bg-[#9db8e4]"
            >
              {isBusy ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Working...
                </>
              ) : (
                <>
                  <KeyRound className="h-4 w-4" />
                  Create passkey and continue
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => void loginWithPasskey()}
              disabled={isBusy}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-[#c9daf5] bg-white px-5 py-3.5 text-sm font-semibold text-[#10233f] transition hover:bg-[#eef4ff] disabled:cursor-not-allowed disabled:border-[#d7e4f6] disabled:bg-[#f5f8fc] disabled:text-[#8da2c1]"
            >
              {isBusy ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Waiting for passkey...
                </>
              ) : (
                "Use existing passkey"
              )}
            </button>

            {statusCopy ? (
              <div className="rounded-[1.3rem] border border-[#d7e4f6] bg-[#f8fbff] px-4 py-3 text-sm text-[#31517f]">
                {statusCopy}
              </div>
            ) : null}

            {errorMessage ? (
              <div className="rounded-[1.3rem] border border-[#e0b7b2] bg-[#fff3f1] px-4 py-3 text-sm text-[#a5483c]">
                {errorMessage}
              </div>
            ) : null}
          </div>
        ) : (
          <div className="mt-8 space-y-4">
            <div className="rounded-[1.4rem] border border-[#b9d8be] bg-[#edf7ef] p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1d6f42] text-white">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#155734]">
                    Passkey session active
                  </p>
                  <p className="mt-1 text-xs leading-6 text-[#35634a]">
                    The user is authenticated. Privy can create the embedded wallet now
                    and support the smart-wallet layer behind the scenes when enabled.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-[1.4rem] border border-[#d7e4f6] bg-[#f8fbff] p-4">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-[#5e7ca8]">
                Embedded wallet
              </span>
              {!walletsReady ? (
                <p className="inline-flex items-center gap-2 text-sm text-[#31517f]">
                  <Loader2 className="h-4 w-4 animate-spin text-[#2563eb]" />
                  Preparing embedded wallet...
                </p>
              ) : activeWallet ? (
                <>
                  <p className="text-sm font-semibold text-[#10233f]">
                    {formatWallet(activeWallet.address)}
                  </p>
                  <p className="mt-1 text-xs leading-6 text-[#6a7891]">
                    Created automatically on login for institutional mode.
                  </p>
                </>
              ) : (
                <p className="text-sm text-[#6a7891]">
                  No wallet has appeared yet. Check Privy dashboard settings for embedded
                  wallet creation on login.
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={() => void logout()}
              className="inline-flex items-center gap-2 rounded-full border border-[#d7e4f6] bg-white px-4 py-3 text-sm font-semibold text-[#10233f] transition hover:bg-[#eef4ff]"
            >
              <LogOut className="h-4 w-4" />
              Log out
            </button>
          </div>
        )}
      </div>

      <div className="ink-panel rounded-[2rem] p-6 md:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#d6e7ff]">
          Why this mode exists
        </p>
        <div className="mt-6 space-y-4">
          <div className="rounded-[1.5rem] border border-white/10 bg-white/5 px-4 py-4">
            <p className="text-sm font-semibold text-white">
              Student identity stays where it already lives
            </p>
            <p className="mt-2 text-sm leading-7 text-[#d6e7ff]">
              WiFiProof handles presence verification. Your institution remains the system of
              record for enrollment and identity.
            </p>
          </div>
          <div className="rounded-[1.5rem] border border-white/10 bg-white/5 px-4 py-4">
            <p className="text-sm font-semibold text-white">Passkeys remove password friction</p>
            <p className="mt-2 text-sm leading-7 text-[#d6e7ff]">
              Students sign in with a device-native credential instead of remembering one
              more login.
            </p>
          </div>
          <div className="rounded-[1.5rem] border border-white/10 bg-white/5 px-4 py-4">
            <p className="text-sm font-semibold text-white">Wallets become infrastructure</p>
            <p className="mt-2 text-sm leading-7 text-[#d6e7ff]">
              Embedded wallets can exist underneath the experience, ready for future
              attendance records, rewards, or campus credentials.
            </p>
          </div>
        </div>

        <div className="mt-6 rounded-[1.5rem] border border-white/10 bg-white/5 p-4">
          <div className="flex items-start gap-3 text-[#d6e7ff]">
            <ShieldCheck className="mt-1 h-5 w-5" />
            <div>
              <p className="text-sm font-semibold text-white">Current implementation</p>
              <p className="mt-2 text-sm leading-7">
                Privy is handling passkey authentication and embedded wallet creation in the
                education flow. Presence verification still runs through the WiFiProof app
                once access is established.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function EducationClient() {
  if (!privyAppId) {
    return (
      <div className="rounded-[2rem] border border-[#e6d5a7] bg-[#fff8e6] p-6 text-[#7a5d12] shadow-[0_18px_50px_rgba(122,93,18,0.08)] md:p-8">
        <div className="flex items-start gap-3">
          <Wallet className="mt-1 h-5 w-5" />
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.14em]">
              Privy configuration needed
            </p>
            <p className="mt-2 text-sm leading-7">
              Add `NEXT_PUBLIC_PRIVY_APP_ID` to enable passkey sign-in and embedded wallets
              for institutional mode.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <PrivyProvider
      appId={privyAppId}
      clientId={privyClientId || undefined}
      config={{
        loginMethods: ["passkey"],
        embeddedWallets: {
          ethereum: {
            createOnLogin: "all-users",
          },
          showWalletUIs: false,
        },
      }}
    >
      <InstitutionalAccessPanel />
    </PrivyProvider>
  );
}
