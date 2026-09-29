"use client";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { readTimer, updateTimer } from "@/app/study/actions";
import {
  elapsedSeconds,
  clockLabel,
  type TimerSnapshot,
} from "@/lib/timer/types";
import type { CatalogOption } from "@/lib/onboarding/types";
export function StudyTimer({
  initial,
  subjects,
  requestId,
}: {
  initial: TimerSnapshot;
  subjects: CatalogOption[];
  requestId: string;
}) {
  const router = useRouter();
  const [snapshot, setSnapshot] = useState(initial),
    [tick, setTick] = useState(0),
    [pending, startTransition] = useTransition(),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [note, setNote] = useState(initial.session?.notes ?? ""),
    [subject, setSubject] = useState(subjects[0]?.id ?? "");
  const baseline = useRef<number | null>(null),
    request = useRef(0),
    dirty = useRef(false),
    busy = useRef(false),
    currentId = useRef(initial.session?.id ?? null),
    startId = useRef(requestId);
  const apply = useCallback((next: TimerSnapshot) => {
    if (currentId.current !== (next.session?.id ?? null)) {
      dirty.current = false;
      if (currentId.current && !next.session)
        startId.current = crypto.randomUUID();
      currentId.current = next.session?.id ?? null;
    }
    baseline.current = performance.now();
    setSnapshot(next);
    setTick(0);
    if (!dirty.current) setNote(next.session?.notes ?? "");
  }, []);
  useEffect(() => {
    baseline.current = performance.now();
    const timer = setInterval(
      () =>
        setTick(performance.now() - (baseline.current ?? performance.now())),
      1000,
    );
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    let mounted = true;
    async function sync() {
      if (busy.current) return;
      const seq = ++request.current;
      try {
        const next = await readTimer();
        if (mounted && seq === request.current) {
          apply(next);
          setError("");
        }
      } catch {
        if (mounted)
          setError(
            "Timer could not sync. Saved study time continues; reconnect and sync before making a change.",
          );
      }
    }
    const focus = () => {
      if (document.visibilityState === "visible") void sync();
    };
    const timer = setInterval(() => void sync(), 15000);
    window.addEventListener("online", focus);
    window.addEventListener("focus", focus);
    document.addEventListener("visibilitychange", focus);
    return () => {
      mounted = false;
      clearInterval(timer);
      window.removeEventListener("online", focus);
      window.removeEventListener("focus", focus);
      document.removeEventListener("visibilitychange", focus);
    };
  }, [apply]);
  const session = snapshot.session,
    seconds = session
      ? elapsedSeconds(session, Date.parse(snapshot.server_now) + tick)
      : 0;
  const sync = () =>
    startTransition(async () => {
      busy.current = true;
      ++request.current;
      try {
        apply(await readTimer());
        setError("");
        setMessage("Timer synced.");
      } catch {
        setError("Couldn’t sync. Check your connection and retry.");
      } finally {
        busy.current = false;
      }
    });
  const act = (operation: string) =>
    startTransition(async () => {
      busy.current = true;
      ++request.current;
      setError("");
      setMessage("");
      try {
        const result = await updateTimer({
          id: session?.id ?? startId.current,
          operation,
          subject,
          version: session?.version,
          note:
            operation === "note" || operation === "finish" ? note : undefined,
        });
        if (result.error) {
          setError(result.error);
          return;
        }
        if (result.snapshot) {
          if (operation === "note" || operation === "finish")
            dirty.current = false;
          apply(result.snapshot);
          const s = result.snapshot.session;
          if (s?.status === "completed") {
            router.push(`/sessions/${s.id}`);
            router.refresh();
          } else if (s?.status === "discarded") {
            router.refresh();
            apply({ ...result.snapshot, session: null });
          } else
            setMessage(
              operation === "note" ? "Private note saved." : "Timer saved.",
            );
        }
      } catch {
        setError("Connection interrupted. Sync before retrying.");
      } finally {
        busy.current = false;
      }
    });
  return (
    <section className="onboarding-card timer-card">
      <p className="eyebrow">ONE THING AT A TIME</p>
      <h1>{session ? "Make room for focus." : "Your next study moment."}</h1>
      <p className="account-description">
        Your sessions and notes are private. Nothing is posted automatically.
      </p>
      {!session ? (
        <form
          className="account-form"
          onSubmit={(e) => {
            e.preventDefault();
            act("start");
          }}
        >
          <label>
            What are you studying?
            <select
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              required
              disabled={pending}
            >
              <option value="">Choose a subject</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.labels.en ?? s.labels.el ?? "Subject"}
                </option>
              ))}
            </select>
          </label>
          {!subjects.length && (
            <p className="form-notice">
              Subjects aren’t available yet. Please try again later.
            </p>
          )}
          <button className="button" disabled={pending || !subject}>
            {pending ? "Starting…" : "Start studying"}
          </button>
        </form>
      ) : (
        <>
          <p className="timer-subject">
            {subjects.find((s) => s.id === session.subject_id)?.labels.en ??
              "Study session"}{" "}
            ·{" "}
            {session.status === "active"
              ? "Studying"
              : session.status === "paused"
                ? "Paused"
                : "Ended"}
          </p>
          <div
            className="timer-clock"
            role="timer"
            aria-live="off"
            aria-label={`Elapsed study time ${clockLabel(seconds)}`}
          >
            {clockLabel(seconds)}
          </div>
          <p className="field-hint">
            Pauses don’t count. Time is saved from server timestamps, up to 24
            hours per session.
          </p>
          <div className="timer-controls">
            <button
              className="button"
              disabled={pending}
              onClick={() =>
                act(session.status === "active" ? "pause" : "resume")
              }
            >
              {session.status === "active" ? "Pause" : "Resume"}
            </button>
            <button
              className="outline-button"
              disabled={pending}
              onClick={() => act("finish")}
            >
              Finish and save
            </button>
          </div>
          <div className="account-form">
            <label>
              Private note <span className="optional">(optional)</span>
              <textarea
                maxLength={2000}
                rows={3}
                value={note}
                disabled={pending}
                onChange={(e) => {
                  dirty.current = true;
                  setNote(e.target.value);
                }}
              />
            </label>
            <button
              className="text-button"
              disabled={pending}
              onClick={() => act("note")}
            >
              Save note
            </button>
            <p className="field-hint">
              Save your note before leaving this page. Finishing also saves it.
            </p>
          </div>
          <details className="post-delete">
            <summary>Discard session</summary>
            <p className="field-hint">
              Discarding ends this timer without adding study time to your
              history.
            </p>
            <button
              className="text-button"
              disabled={pending}
              onClick={() => act("discard")}
            >
              Discard this session
            </button>
          </details>
        </>
      )}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <p className="field-hint" role="status">
        {pending ? "Saving…" : message}
      </p>
      <div className="form-links">
        <button
          type="button"
          className="text-button"
          disabled={pending}
          onClick={sync}
        >
          Sync timer
        </button>
        <Link href="/sessions" className="text-button">
          Recent sessions →
        </Link>
      </div>
    </section>
  );
}
