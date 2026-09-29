import { studyDateLabel } from "../src/lib/stats/date.ts";
import { test } from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { readFile, readdir } from "node:fs/promises";
const root = new URL("../", import.meta.url),
  id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
test("private study summaries respect local completion dates", async (t) => {
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
    bob = id(2);
  await db.query("insert into auth.users(id) values($1),($2)", [alice, bob]);
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
  const rpc = async (who, name, args = []) =>
    (
      await user(
        who,
        `select ${name}(${args.map((_, i) => "$" + (i + 1)).join(",")}) as r`,
        args,
      )
    )[0].r;

  const stats = (who, time) => rpc(who, "own_study_stats", [time]);
  async function session(who, end, seconds) {
    await db.query(
      "insert into study_sessions(user_id,status,started_at,ended_at,duration_seconds,notes) values($1,'completed',$2::timestamptz-make_interval(secs=>$3),$2,$3,'PRIVATE NOTE')",
      [who, end, seconds],
    );
  }
  await t.test(
    "preferences validate zones and goals and cannot update another user",
    async () => {
      await assert.rejects(rpc(null, "own_study_stats"));
      await assert.rejects(
        rpc(alice, "save_study_preferences", ["Invalid/Zone", 60]),
      );
      await assert.rejects(rpc(alice, "save_study_preferences", ["UTC", 0]));
      await assert.rejects(
        user(alice, "update user_settings set timezone='Invalid/Zone'"),
      );
      await rpc(alice, "save_study_preferences", ["Europe/Athens", 120]);
      const a = await stats(alice, "2026-09-29T10:00:00Z"),
        b = await stats(bob, "2026-09-29T10:00:00Z");
      assert.equal(a.timezone, "Europe/Athens");
      assert.equal(a.goal_minutes, 120);
      assert.equal(b.timezone, "UTC");
      assert.equal(a.daily.length, 7);
      assert.equal(a.total_seconds, 0);
    },
  );
  await t.test(
    "totals include only owned completed sessions and credit cross-midnight study to completion day",
    async () => {
      await session(alice, "2026-09-27T20:59:00Z", 600); // Sunday local
      await session(alice, "2026-09-27T21:01:00Z", 300); // Monday local, starts Sunday
      await session(alice, "2026-09-28T21:01:00Z", 900); // Tuesday local
      await session(alice, "2026-09-30T10:00:00Z", 60); // beyond reference
      await session(bob, "2026-09-28T21:01:00Z", 5000);
      await db.query(
        "insert into study_sessions(user_id,status,running_since) values($1,'active',now())",
        [alice],
      );
      const s = await stats(alice, "2026-09-29T10:00:00Z");
      assert.equal(s.today, "2026-09-29");
      assert.equal(s.week_start, "2026-09-28");
      assert.equal(s.today_seconds, 900);
      assert.equal(s.week_seconds, 1200);
      assert.equal(s.total_seconds, 1800);
      assert.equal(s.session_count, 3);
      assert.equal(s.daily.find((d) => d.day === "2026-09-28").seconds, 300);
      assert.equal(s.subjects[0].seconds, 1200);
      assert.equal(s.recent.length, 3);
      assert.ok(!JSON.stringify(s).includes("PRIVATE NOTE"));
      assert.equal(
        (await stats(bob, "2026-09-29T10:00:00Z")).total_seconds,
        5000,
      );
    },
  );
  await t.test(
    "DST spring and autumn days group by local calendar rather than 24-hour windows",
    async () => {
      await rpc(bob, "save_study_preferences", ["America/New_York", null]);
      await session(bob, "2026-03-08T05:01:00Z", 60);
      await session(bob, "2026-03-09T03:59:00Z", 60);
      const spring = await stats(bob, "2026-03-09T03:59:30Z");
      assert.equal(spring.today, "2026-03-08");
      assert.equal(spring.today_seconds, 120);
      assert.equal(new Set(spring.daily.map((d) => d.day)).size, 7);
      await session(bob, "2026-11-01T04:01:00Z", 60);
      await session(bob, "2026-11-02T04:59:00Z", 60);
      const autumn = await stats(bob, "2026-11-02T04:59:30Z");
      assert.equal(autumn.today, "2026-11-01");
      assert.equal(autumn.today_seconds, 120);
      assert.equal(new Set(autumn.daily.map((d) => d.day)).size, 7);
    },
  );
});

test("PostgreSQL-only timezone names do not crash recent session rendering", () => {
  assert.match(studyDateLabel("2026-01-01T12:00:00Z", "Factory"), /UTC$/);
});
