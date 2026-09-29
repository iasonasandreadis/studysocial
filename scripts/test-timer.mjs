import { test } from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { readFile, readdir } from "node:fs/promises";
import { elapsedSeconds, clockLabel } from "../src/lib/timer/types.ts";
const root = new URL("../", import.meta.url),
  id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
test("timer display derives elapsed time without counting interval ticks or paused time", () => {
  const s = {
    status: "active",
    active_seconds: 20.7,
    running_since: "2026-01-01T00:00:00Z",
  };
  assert.equal(elapsedSeconds(s, Date.parse("2026-01-01T00:01:00Z")), 80);
  assert.equal(
    elapsedSeconds({ ...s, status: "paused" }, Date.parse("2026-01-02")),
    20,
  );
  assert.equal(elapsedSeconds(s, Date.parse("2026-01-03")), 86400);
  assert.equal(clockLabel(3661), "01:01:01");
});
test("server-authoritative timer lifecycle", async (t) => {
  const db = new PGlite();
  t.after(() => db.close());
  await db.exec(
    await readFile(new URL("supabase/tests/bootstrap.sql", root), "utf8"),
  );
  for (const f of (await readdir(new URL("supabase/migrations/", root))).sort())
    await db.exec(
      await readFile(new URL(`supabase/migrations/${f}`, root), "utf8"),
    );
  const alice = id(1),
    bob = id(2),
    subject = id(3),
    session = id(4);
  await db.query("insert into auth.users(id) values($1),($2)", [alice, bob]);
  await db.query(
    "insert into subjects(id,code,labels) values($1,'math','{\"en\":\"Math\"}')",
    [subject],
  );
  async function user(who, sql, args = []) {
    await db.exec("begin");
    try {
      await db.exec(`set local role ${who ? "authenticated" : "anon"}`);
      await db.query("select set_config('request.jwt.claim.sub',$1,true)", [
        who ?? "",
      ]);
      const { rows } = await db.query(sql, args);
      await db.exec("commit");
      return rows;
    } catch (e) {
      await db.exec("rollback");
      throw e;
    }
  }
  const start = async (who, target = session) =>
    (
      await user(who, "select start_study_session($1,$2) as result", [
        target,
        subject,
      ])
    )[0].result;
  const change = async (who, op, version, target = session, note = null) =>
    (
      await user(who, "select change_study_session($1,$2,$3,$4) as result", [
        target,
        op,
        version,
        note,
      ])
    )[0].result;
  const reject = (p, code) => assert.rejects(p, (e) => e.code === code);
  await t.test(
    "start retries and competing tabs return one owned active session",
    async () => {
      await reject(start(null), "42501");
      await reject(
        user(alice, "select start_study_session($1,null)", [session]),
        "23514",
      );
      const a = await start(alice);
      assert.equal(a.session.status, "active");
      assert.equal(a.session.version, 0);
      assert.equal((await start(alice)).session.id, session);
      assert.equal((await start(alice, id(5))).session.id, session);
      await reject(start(bob), "42501");
      assert.equal((await user(bob, "select * from study_sessions")).length, 0);
      for (const sql of [
        "update study_sessions set duration_seconds=999",
        "update study_sessions set started_at=now()-interval '1 day'",
        "insert into study_sessions(user_id) values($1)",
        "delete from study_sessions",
      ])
        await reject(
          user(alice, sql, sql.includes("$1") ? [alice] : []),
          "42501",
        );
    },
  );
  await t.test(
    "pause and resume accumulate timestamp segments, reject stale versions and keep notes private",
    async () => {
      await db.query(
        "update study_sessions set started_at=now()-interval '200 seconds',running_since=now()-interval '125 seconds' where id=$1",
        [session],
      );
      const paused = await change(alice, "pause", 0);
      assert.equal(paused.session.status, "paused");
      assert.ok(
        Number(paused.session.active_seconds) >= 125 &&
          Number(paused.session.active_seconds) < 127,
      );
      await reject(change(alice, "resume", 0), "40001");
      await reject(change(bob, "resume", 1), "42501");
      const note = await change(alice, "note", 1, session, "Private reminder");
      assert.equal(note.session.notes, "Private reminder");
      const resumed = await change(alice, "resume", 2);
      assert.equal(resumed.session.status, "active");
      assert.equal(resumed.session.version, 3);
      await reject(
        change(alice, "note", 3, session, "x".repeat(2001)),
        "23514",
      );
      assert.equal(
        (await user(bob, "select timer_snapshot() as x"))[0].x.session,
        null,
      );
    },
  );
  await t.test(
    "finish excludes paused time and repeated completion cannot duplicate or overwrite",
    async () => {
      await db.query(
        "update study_sessions set running_since=now()-interval '10 seconds' where id=$1",
        [session],
      );
      const done = await change(
        alice,
        "finish",
        3,
        session,
        "Final private note",
      );
      assert.equal(done.session.status, "completed");
      assert.ok(
        done.session.duration_seconds >= 135 &&
          done.session.duration_seconds < 138,
      );
      assert.equal(done.session.notes, "Final private note");
      const retry = await change(
        alice,
        "finish",
        3,
        session,
        "Attempt overwrite",
      );
      assert.equal(retry.session.ended_at, done.session.ended_at);
      assert.equal(retry.session.notes, "Final private note");
      assert.equal(
        (await user(alice, "select timer_snapshot() as x"))[0].x.session,
        null,
      );
      await reject(change(alice, "resume", done.session.version), "23514");
    },
  );
  await t.test(
    "finishing paused, fractional segments, 24-hour cap and discard behave consistently",
    async () => {
      await start(alice, id(6));
      await db.query(
        "update study_sessions set started_at=now()-interval '10 seconds',active_seconds=.7,running_since=now()-interval '.6 seconds' where id=$1",
        [id(6)],
      );
      const p = await change(alice, "pause", 0, id(6));
      const result = await change(alice, "finish", 1, id(6));
      assert.equal(
        result.session.duration_seconds,
        Math.floor(Number(p.session.active_seconds)),
      );
      await start(alice, id(7));
      await db.query(
        "update study_sessions set started_at=now()-interval '2 days',running_since=now()-interval '2 days' where id=$1",
        [id(7)],
      );
      assert.equal(
        (await change(alice, "finish", 0, id(7))).session.duration_seconds,
        86400,
      );
      await start(alice, id(8));
      assert.equal(
        (await change(alice, "discard", 0, id(8))).session.duration_seconds,
        null,
      );
      assert.equal(
        (await change(alice, "discard", 0, id(8))).session.status,
        "discarded",
      );
      assert.equal((await start(alice, id(9))).session.status, "active");
    },
  );
});
