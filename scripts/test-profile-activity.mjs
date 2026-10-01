import { test } from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { readFile, readdir } from "node:fs/promises";
const root = new URL("../", import.meta.url);
const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
test("profile study activity honors sharing, access and consecutive local days", async (t) => {
  const db = new PGlite();
  t.after(() => db.close());
  await db.exec(
    await readFile(new URL("supabase/tests/bootstrap.sql", root), "utf8"),
  );
  for (const file of (
    await readdir(new URL("supabase/migrations/", root))
  ).sort())
    await db.exec(
      await readFile(new URL(`supabase/migrations/${file}`, root), "utf8"),
    );
  const alice = id(1),
    bob = id(2);
  await db.query("insert into auth.users(id) values($1),($2)", [alice, bob]);
  await db.query("update profiles set is_private=false where id=$1", [alice]);
  async function user(who, sql, args = []) {
    await db.exec("begin");
    try {
      await db.exec(`set local role ${who ? "authenticated" : "anon"}`);
      await db.query("select set_config('request.jwt.claim.sub',$1,true)", [
        who ?? "",
      ]);
      const result = await db.query(sql, args);
      await db.exec("commit");
      return result.rows;
    } catch (e) {
      await db.exec("rollback");
      throw e;
    }
  }
  const activity = async (who) =>
    (await user(who, "select profile_study_activity($1) as value", [alice]))[0]
      .value;
  const share = (totals, live) =>
    user(alice, "select save_study_visibility($1,$2)", [totals, live]);
  async function completed(days, seconds = 120) {
    await db.query(
      "insert into study_sessions(user_id,status,started_at,ended_at,duration_seconds) values($1,'completed',now()-make_interval(days=>$2)-make_interval(secs=>$3),now()-make_interval(days=>$2),$3)",
      [alice, days, seconds],
    );
  }
  await completed(0);
  await completed(1);
  await completed(2);
  await completed(4);
  await completed(0, 0);
  assert.equal((await activity(alice)).streak_days, 3);
  assert.equal((await activity(alice)).today_seconds, 120);
  assert.equal((await activity(bob)).today_seconds, null);
  await assert.rejects(activity(null));
  await share(true, true);
  assert.equal((await activity(bob)).streak_days, 3);
  assert.equal((await activity(bob)).is_studying, false);
  assert.equal(
    (await user(bob, "select * from study_sessions where user_id=$1", [alice]))
      .length,
    0,
  );
  await db.query(
    "insert into study_sessions(user_id,status,started_at,running_since) values($1,'active',now(),now())",
    [alice],
  );
  assert.equal((await activity(bob)).is_studying, true);
  assert.equal((await activity(bob)).today_seconds, 120);
  await db.query(
    "update study_sessions set status='paused',paused_at=now(),running_since=null where user_id=$1 and status='active'",
    [alice],
  );
  assert.equal((await activity(bob)).is_studying, false);
  await db.query("update profiles set is_private=true where id=$1", [alice]);
  assert.equal(await activity(bob), null);
  await db.query(
    "insert into follows(follower_id,following_id) values($1,$2)",
    [bob, alice],
  );
  assert.equal((await activity(bob)).streak_days, 3);
  await db.query("insert into blocks(blocker_id,blocked_id) values($1,$2)", [
    alice,
    bob,
  ]);
  assert.equal(await activity(bob), null);
  await db.query("delete from blocks");
  assert.equal(await activity(bob), null); // Unblocking does not restore follows.
  await db.query(
    "insert into follows(follower_id,following_id) values($1,$2)",
    [bob, alice],
  );
  await share(false, true);
  assert.equal((await activity(bob)).streak_days, null);
  assert.equal((await activity(bob)).is_studying, false);
  await share(true, false);
  assert.equal((await activity(bob)).is_studying, null);
  await db.query(
    "delete from study_sessions where user_id=$1 and status='completed' and ended_at::date=current_date",
    [alice],
  );
  assert.equal((await activity(alice)).streak_days, 2); // Yesterday remains valid until today ends.
  await db.query(
    "delete from study_sessions where user_id=$1 and status='completed' and ended_at::date=current_date-1",
    [alice],
  );
  assert.equal((await activity(alice)).streak_days, 0);
  await user(bob, "select save_study_visibility(true,true)");
  assert.equal((await activity(alice)).shared_live, false); // Bob cannot change Alice's settings.
  await db.query("delete from study_sessions where user_id=$1", [alice]);
  await user(alice, "select save_study_preferences('Pacific/Auckland',null)");
  await completed(0, 60);
  await db.query(
    "insert into study_sessions(user_id,status,started_at,ended_at,duration_seconds) select $1,'completed',stamp-interval '120 seconds',stamp,120 from (select ((now() at time zone 'Pacific/Auckland')::date::timestamp at time zone 'Pacific/Auckland')-interval '1 hour' as stamp) t",
    [alice],
  );
  assert.equal((await activity(alice)).today_seconds, 60);
  assert.equal((await activity(alice)).streak_days, 2);
  await db.query(
    "insert into study_sessions(user_id,status,started_at,running_since) values($1,'active',now()-interval '25 hours',now()-interval '25 hours')",
    [alice],
  );
  assert.equal((await activity(alice)).is_studying, false);
  await db.query(
    "update study_sessions set running_since=now(),active_seconds=60 where user_id=$1 and status='active'",
    [alice],
  );
  assert.equal((await activity(alice)).is_studying, true); // A long pause does not expire a resumed timer.
});
