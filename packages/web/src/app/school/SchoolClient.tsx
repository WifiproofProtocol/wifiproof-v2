"use client";

import {
  BadgeCheck,
  BookOpen,
  Check,
  CheckCircle2,
  Clock3,
  GraduationCap,
  Loader2,
  LogOut,
  Radio,
  School,
  ShieldCheck,
  UserRoundCheck,
  UsersRound,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";

import SignalMark from "@/components/landing/SignalMark";
import { EMPTY_SCHOOL_STATE, type SchoolState } from "@/lib/school-types";

type AttendanceGate = { key: string; label: string; passed: boolean; detail: string };
type AttendanceResult = { ok: boolean; duplicate: boolean; gates: AttendanceGate[] };

const control = "mt-2 h-12 w-full rounded-xl border border-[oklch(0.84_0.018_85)] bg-[oklch(0.985_0.008_88)] px-4 text-sm text-[oklch(0.205_0.025_265)] outline-none transition focus:border-[oklch(0.55_0.24_263)] focus:ring-3 focus:ring-[oklch(0.55_0.24_263_/_0.16)]";
const primary = "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[oklch(0.43_0.22_263)] px-5 py-2.5 text-sm font-semibold text-[oklch(0.975_0.008_88)] transition hover:bg-[oklch(0.38_0.2_263)] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[oklch(0.55_0.24_263_/_0.28)] disabled:cursor-not-allowed disabled:opacity-55";
const panel = "rounded-2xl border border-[oklch(0.86_0.018_85)] bg-[oklch(0.985_0.008_88)]";

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function isSessionOpen(session: SchoolState["sessions"][number]) {
  const now = Date.now();
  return session.status === "open" && now >= Date.parse(session.startsAt) && now <= Date.parse(session.endsAt);
}

async function readJson<T>(response: Response): Promise<T> {
  const payload = (await response.json()) as T & { error?: string };
  if (!response.ok) throw new Error(payload.error || "The request could not be completed.");
  return payload;
}

function AppHeader({ state, onLogout, busy }: { state: SchoolState; onLogout: () => void; busy: boolean }) {
  return (
    <header className="border-b border-[oklch(0.86_0.018_85)] bg-[oklch(0.985_0.008_88)]">
      <div className="mx-auto flex min-h-18 max-w-7xl items-center justify-between gap-4 px-5 sm:px-8">
        <Link href="/" className="inline-flex items-center gap-2.5 font-semibold tracking-[-0.025em]">
          <SignalMark className="h-8 w-8 text-[oklch(0.55_0.24_263)]" />
          WiFiProof School
        </Link>
        <div className="flex items-center gap-3">
          <div className="hidden text-right sm:block">
            <p className="text-sm font-semibold">{state.viewer?.name}</p>
            <p className="text-xs capitalize text-[oklch(0.5_0.025_260)]">{state.viewer?.role} · {state.viewer?.institutionalId}</p>
          </div>
          <button type="button" onClick={onLogout} disabled={busy} className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[oklch(0.84_0.018_85)] hover:bg-[oklch(0.95_0.012_88)]" aria-label="Sign out">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
}

function SignIn({ onSuccess }: { onSuccess: (state: SchoolState) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/school/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      onSuccess(await readJson<SchoolState>(response));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Sign-in failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-[100dvh] bg-[oklch(0.955_0.012_88)] px-5 py-10 text-[oklch(0.205_0.025_265)] sm:px-8 lg:py-16">
      <div className="mx-auto grid min-h-[calc(100dvh-8rem)] max-w-6xl overflow-hidden rounded-[1.75rem] border border-[oklch(0.84_0.018_85)] bg-[oklch(0.985_0.008_88)] shadow-[0_28px_80px_oklch(0.25_0.025_265_/_0.1)] lg:grid-cols-[0.9fr_1.1fr]">
        <section className="relative overflow-hidden bg-[oklch(0.225_0.03_265)] p-8 text-[oklch(0.97_0.01_88)] sm:p-12">
          <div className="absolute -bottom-40 -left-28 h-96 w-96 rounded-full border-[70px] border-[oklch(0.55_0.24_263_/_0.25)]" />
          <div className="relative flex h-full flex-col justify-between gap-20">
            <Link href="/" className="inline-flex items-center gap-2.5 font-semibold tracking-[-0.02em]">
              <SignalMark className="h-9 w-9 text-[oklch(0.69_0.19_35)]" /> WiFiProof School
            </Link>
            <div>
              <p className="text-sm font-semibold text-[oklch(0.78_0.03_88)]">Institution-owned attendance</p>
              <h1 className="mt-4 max-w-[12ch] text-4xl font-semibold leading-[0.96] tracking-[-0.045em] sm:text-5xl">The register starts after sign-in.</h1>
              <p className="mt-5 max-w-md text-base leading-7 text-[oklch(0.78_0.025_88)]">Student and lecturer records stay behind school authentication and database policies.</p>
            </div>
          </div>
        </section>

        <section className="flex items-center p-7 sm:p-12 lg:p-16">
          <form onSubmit={submit} className="w-full max-w-md">
            <p className="text-sm font-semibold text-[oklch(0.55_0.24_263)]">Invite-only access</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em]">Sign in to your school</h2>
            <p className="mt-3 text-sm leading-6 text-[oklch(0.5_0.025_260)]">Use the private credentials provided by your administrator. There is no public account directory.</p>
            <label className="mt-8 block text-sm font-semibold">School email
              <input className={control} type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} required />
            </label>
            <label className="mt-5 block text-sm font-semibold">Password
              <input className={control} type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={8} required />
            </label>
            {error && <p role="alert" className="mt-5 rounded-xl bg-[oklch(0.94_0.035_25)] px-4 py-3 text-sm text-[oklch(0.45_0.16_27)]">{error}</p>}
            <button className={`${primary} mt-7 w-full`} disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
              {busy ? "Signing in…" : "Sign in"}
            </button>
            <p className="mt-5 text-center text-xs leading-5 text-[oklch(0.55_0.02_260)]">Need access? Contact your school administrator.</p>
          </form>
        </section>
      </div>
    </main>
  );
}

function PasswordChange({ onSuccess }: { onSuccess: (state: SchoolState) => void }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (password !== confirm) return setError("The passwords do not match.");
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/school/password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) });
      onSuccess(await readJson<SchoolState>(response));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Password update failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-[oklch(0.955_0.012_88)] px-5 py-10 text-[oklch(0.205_0.025_265)]">
      <form onSubmit={submit} className={`${panel} w-full max-w-lg p-7 shadow-[0_24px_70px_oklch(0.25_0.025_265_/_0.1)] sm:p-10`}>
        <BadgeCheck className="h-9 w-9 text-[oklch(0.55_0.24_263)]" />
        <h1 className="mt-6 text-3xl font-semibold tracking-[-0.04em]">Protect your account</h1>
        <p className="mt-3 text-sm leading-6 text-[oklch(0.5_0.025_260)]">Replace the temporary invitation password before opening school records.</p>
        <label className="mt-7 block text-sm font-semibold">New password<input className={control} type="password" autoComplete="new-password" minLength={12} value={password} onChange={(event) => setPassword(event.target.value)} required /></label>
        <label className="mt-5 block text-sm font-semibold">Confirm password<input className={control} type="password" autoComplete="new-password" minLength={12} value={confirm} onChange={(event) => setConfirm(event.target.value)} required /></label>
        {error && <p role="alert" className="mt-5 text-sm text-[oklch(0.5_0.18_27)]">{error}</p>}
        <button className={`${primary} mt-7 w-full`} disabled={busy}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}{busy ? "Saving…" : "Save new password"}</button>
      </form>
    </main>
  );
}

function StudentDashboard({ state, setState }: { state: SchoolState; setState: (state: SchoolState) => void }) {
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [result, setResult] = useState<AttendanceResult | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const enrolledUnitIds = useMemo(() => new Set(state.enrollments.filter((item) => item.studentUserId === state.viewer?.userId).map((item) => item.unitId)), [state]);
  const eligibleSessions = state.sessions.filter((session) => enrolledUnitIds.has(session.unitId));
  const activeSessions = eligibleSessions.filter(isSessionOpen);
  const currentSessionId = selectedSessionId || activeSessions[0]?.id || "";

  async function markAttendance() {
    if (!currentSessionId) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/school/attendance", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId: currentSessionId }) });
      const payload = await readJson<AttendanceResult & { state: SchoolState }>(response);
      setResult(payload);
      setState(payload.state);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Attendance failed.");
    } finally {
      setBusy(false);
    }
  }

  const history = state.attendance.filter((item) => item.studentUserId === state.viewer?.userId);
  return (
    <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
      <section className={`${panel} p-6 sm:p-8`}>
        <p className="text-sm font-semibold text-[oklch(0.55_0.24_263)]">Mark attendance</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-[-0.035em]">Join the active class</h2>
        {activeSessions.length ? (
          <>
            <label className="mt-7 block text-sm font-semibold">Class session
              <select className={control} value={currentSessionId} onChange={(event) => setSelectedSessionId(event.target.value)}>
                {activeSessions.map((session) => { const unit = state.units.find((item) => item.id === session.unitId); return <option key={session.id} value={session.id}>{unit?.code} · {unit?.room}</option>; })}
              </select>
            </label>
            <button type="button" onClick={markAttendance} disabled={busy} className={`${primary} mt-6 w-full`}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Radio className="h-4 w-4" />}{busy ? "Checking…" : "Check venue signal"}</button>
          </>
        ) : (
          <div className="mt-7 rounded-xl bg-[oklch(0.95_0.012_88)] p-5 text-sm leading-6 text-[oklch(0.5_0.025_260)]"><Clock3 className="mb-3 h-5 w-5" />No enrolled class has an open attendance window.</div>
        )}
        {error && <p role="alert" className="mt-4 text-sm text-[oklch(0.5_0.18_27)]">{error}</p>}
      </section>

      <section className={`${panel} p-6 sm:p-8`}>
        <div className="flex items-start justify-between gap-4"><div><p className="text-sm font-semibold text-[oklch(0.55_0.24_263)]">Verification</p><h2 className="mt-2 text-2xl font-semibold tracking-[-0.035em]">{result ? result.ok ? result.duplicate ? "Already recorded" : "Attendance recorded" : "Attendance blocked" : "Ready when class opens"}</h2></div>{result?.ok ? <CheckCircle2 className="h-7 w-7 text-[oklch(0.58_0.15_155)]" /> : <ShieldCheck className="h-7 w-7 text-[oklch(0.55_0.24_263)]" />}</div>
        <div aria-live="polite" className="mt-6 space-y-3">
          {(result?.gates ?? []).map((gate) => <div key={gate.key} className="flex gap-3 border-t border-[oklch(0.89_0.012_85)] pt-3"><span className={`mt-0.5 ${gate.passed ? "text-[oklch(0.58_0.15_155)]" : "text-[oklch(0.58_0.19_27)]"}`}>{gate.passed ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}</span><div><p className="text-sm font-semibold">{gate.label}</p><p className="mt-1 text-sm leading-6 text-[oklch(0.5_0.025_260)]">{gate.detail}</p></div></div>)}
          {!result && <p className="text-sm leading-6 text-[oklch(0.5_0.025_260)]">Your authenticated identity, enrolment, class window, and venue network signal will be checked together.</p>}
        </div>
      </section>

      <section className={`${panel} overflow-hidden lg:col-span-2`}>
        <div className="border-b border-[oklch(0.86_0.018_85)] px-6 py-5"><h2 className="text-lg font-semibold">Your attendance</h2></div>
        {history.length ? <div className="overflow-x-auto"><table className="w-full min-w-[620px] text-left text-sm"><thead className="bg-[oklch(0.96_0.01_88)] text-[oklch(0.5_0.025_260)]"><tr><th className="px-6 py-4 font-semibold">Unit</th><th className="px-4 py-4 font-semibold">Session</th><th className="px-4 py-4 font-semibold">Status</th><th className="px-6 py-4 text-right font-semibold">Recorded</th></tr></thead><tbody className="divide-y divide-[oklch(0.9_0.01_85)]">{history.map((item) => { const session = state.sessions.find((row) => row.id === item.sessionId); const unit = state.units.find((row) => row.id === session?.unitId); return <tr key={item.id}><td className="px-6 py-4 font-semibold">{unit?.code}</td><td className="px-4 py-4 text-[oklch(0.5_0.025_260)]">{session ? formatDateTime(session.startsAt) : "Session"}</td><td className="px-4 py-4 capitalize">{item.status}</td><td className="px-6 py-4 text-right text-[oklch(0.5_0.025_260)]">{formatDateTime(item.recordedAt)}</td></tr>; })}</tbody></table></div> : <p className="px-6 py-8 text-sm text-[oklch(0.5_0.025_260)]">No attendance has been recorded yet.</p>}
      </section>
    </div>
  );
}

function LecturerDashboard({ state, setState }: { state: SchoolState; setState: (state: SchoolState) => void }) {
  const assignedIds = new Set(state.teachingAssignments.filter((item) => item.lecturerUserId === state.viewer?.userId).map((item) => item.unitId));
  const units = state.units.filter((unit) => assignedIds.has(unit.id));
  const [unitId, setUnitId] = useState(units[0]?.id ?? "");
  const [duration, setDuration] = useState(20);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function openSession(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const response = await fetch("/api/school/sessions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ unitId, durationMinutes: duration }) });
      setState(await readJson<SchoolState>(response));
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Session creation failed."); }
    finally { setBusy(false); }
  }

  const sessions = state.sessions.filter((item) => item.lecturerUserId === state.viewer?.userId);
  return (
    <div className="grid gap-6 lg:grid-cols-[0.82fr_1.18fr]">
      <form onSubmit={openSession} className={`${panel} p-6 sm:p-8`}>
        <p className="text-sm font-semibold text-[oklch(0.55_0.24_263)]">Lecturer control</p><h2 className="mt-2 text-2xl font-semibold tracking-[-0.035em]">Open attendance</h2>
        <label className="mt-7 block text-sm font-semibold">Assigned unit<select className={control} value={unitId} onChange={(event) => setUnitId(event.target.value)} required>{units.map((unit) => <option key={unit.id} value={unit.id}>{unit.code} · {unit.room}</option>)}</select></label>
        <label className="mt-5 block text-sm font-semibold">Window<select className={control} value={duration} onChange={(event) => setDuration(Number(event.target.value))}>{[10, 15, 20, 30, 45, 60].map((value) => <option key={value} value={value}>{value} minutes</option>)}</select></label>
        {error && <p role="alert" className="mt-4 text-sm text-[oklch(0.5_0.18_27)]">{error}</p>}
        <button className={`${primary} mt-6 w-full`} disabled={busy || !unitId}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Clock3 className="h-4 w-4" />}{busy ? "Opening…" : "Open session"}</button>
        <p className="mt-4 text-xs leading-5 text-[oklch(0.52_0.02_260)]">The venue network signal is captured server-side. No raw IP address is stored.</p>
      </form>
      <section className={`${panel} overflow-hidden`}><div className="border-b border-[oklch(0.86_0.018_85)] px-6 py-5"><h2 className="text-lg font-semibold">Recent sessions</h2></div><div className="divide-y divide-[oklch(0.9_0.01_85)]">{sessions.length ? sessions.map((session) => { const unit = state.units.find((row) => row.id === session.unitId); const count = state.attendance.filter((row) => row.sessionId === session.id && row.status === "present").length; return <div key={session.id} className="grid gap-4 px-6 py-5 sm:grid-cols-[1fr_auto] sm:items-center"><div><div className="flex items-center gap-2"><p className="font-semibold">{unit?.code} · {unit?.room}</p>{isSessionOpen(session) && <span className="rounded-full bg-[oklch(0.91_0.07_155)] px-2 py-0.5 text-xs font-semibold text-[oklch(0.4_0.12_155)]">Open</span>}</div><p className="mt-1 text-sm text-[oklch(0.5_0.025_260)]">{formatDateTime(session.startsAt)}</p></div><div className="inline-flex items-center gap-2 text-sm font-semibold"><UsersRound className="h-4 w-4 text-[oklch(0.55_0.24_263)]" />{count} present</div></div>; }) : <p className="px-6 py-8 text-sm text-[oklch(0.5_0.025_260)]">Open your first session from an assigned classroom network.</p>}</div></section>
    </div>
  );
}

function AdminDashboard({ state }: { state: SchoolState }) {
  const stats = [
    [state.members.filter((item) => item.role === "student").length, "Students", GraduationCap],
    [state.members.filter((item) => item.role === "lecturer").length, "Lecturers", UserRoundCheck],
    [state.units.length, "Active units", BookOpen],
    [state.attendance.filter((item) => item.status === "present").length, "Attendance records", CheckCircle2],
  ] as const;
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{stats.map(([value, label, Icon]) => <div key={label} className={`${panel} flex items-center gap-4 p-5`}><span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[oklch(0.93_0.035_263)] text-[oklch(0.48_0.22_263)]"><Icon className="h-5 w-5" /></span><div><p className="text-2xl font-semibold">{value}</p><p className="text-xs text-[oklch(0.5_0.025_260)]">{label}</p></div></div>)}</div>
      <section className={`${panel} overflow-hidden`}><div className="border-b border-[oklch(0.86_0.018_85)] px-6 py-5"><h2 className="text-lg font-semibold">Authorized members</h2><p className="mt-1 text-sm text-[oklch(0.5_0.025_260)]">Visible only after administrator authentication.</p></div><div className="overflow-x-auto"><table className="w-full min-w-[680px] text-left text-sm"><thead className="bg-[oklch(0.96_0.01_88)] text-[oklch(0.5_0.025_260)]"><tr><th className="px-6 py-4 font-semibold">Member</th><th className="px-4 py-4 font-semibold">Institution ID</th><th className="px-4 py-4 font-semibold">Role</th><th className="px-6 py-4 text-right font-semibold">Status</th></tr></thead><tbody className="divide-y divide-[oklch(0.9_0.01_85)]">{state.members.map((member) => <tr key={member.userId}><td className="px-6 py-4 font-semibold">{member.name}</td><td className="px-4 py-4 font-mono text-xs text-[oklch(0.5_0.025_260)]">{member.institutionalId}</td><td className="px-4 py-4 capitalize">{member.role}</td><td className="px-6 py-4 text-right"><span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[oklch(0.42_0.12_155)]"><BadgeCheck className="h-3.5 w-3.5" />{member.active ? "Active" : "Inactive"}</span></td></tr>)}</tbody></table></div></section>
    </div>
  );
}

export default function SchoolClient({ initialState }: { initialState: SchoolState }) {
  const [state, setState] = useState(initialState);
  const [busy, setBusy] = useState(false);

  async function logout() {
    setBusy(true);
    await fetch("/api/school/auth", { method: "DELETE" }).catch(() => null);
    setState(EMPTY_SCHOOL_STATE);
    setBusy(false);
  }

  if (!state.viewer) return <SignIn onSuccess={setState} />;
  if (state.viewer.mustChangePassword) return <PasswordChange onSuccess={setState} />;

  return (
    <main className="min-h-[100dvh] bg-[oklch(0.955_0.012_88)] text-[oklch(0.205_0.025_265)]">
      <AppHeader state={state} onLogout={logout} busy={busy} />
      <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:py-10">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div><p className="text-sm font-semibold text-[oklch(0.55_0.24_263)]">{state.organization?.name ?? "School"}</p><h1 className="mt-2 text-3xl font-semibold tracking-[-0.045em] sm:text-4xl">{state.viewer.role === "student" ? "Your classes" : state.viewer.role === "lecturer" ? "Class sessions" : "School attendance"}</h1></div>
          <div className="inline-flex items-center gap-2 text-sm text-[oklch(0.5_0.025_260)]"><School className="h-4 w-4" />Institution-owned records</div>
        </div>
        {state.viewer.role === "student" && <StudentDashboard state={state} setState={setState} />}
        {state.viewer.role === "lecturer" && <LecturerDashboard state={state} setState={setState} />}
        {state.viewer.role === "admin" && <AdminDashboard state={state} />}
      </div>
    </main>
  );
}
