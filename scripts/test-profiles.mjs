import { PGlite } from "@electric-sql/pglite";
import { readFile, readdir } from "node:fs/promises";
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  validateProfile,
  profilePage,
  validTarget,
} from "../src/lib/profile/validation.ts";
const root = new URL("../", import.meta.url),
  id = (n) => `90000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const [alice, bob, carol, dave] = [1, 2, 3, 4].map(id);
const edit = {
  display_name: "Alice",
  handle: "alice",
  bio: "Private biography",
  academic_year: "Year 12",
  academic_direction: "Sciences",
  goal_text: "Private goal",
  target_university: "Example",
  target_program: "Science",
  is_private: true,
  share_year: false,
  share_direction: false,
  share_subjects: false,
  share_goal: false,
  share_target: false,
  subjects: [],
};
test("profile form validation keeps sharing opt-in and bounds identifiers", () => {
  const form = new FormData();
  for (const [k, v] of Object.entries({ ...edit, visibility: "private" }))
    if (typeof v === "string") form.set(k, v);
  const { payload, error } = validateProfile(form);
  assert.equal(error, undefined);
  assert.equal(payload.share_year, false);
  assert.equal(payload.is_private, true);
  form.set("handle", "../private");
  assert.ok(validateProfile(form).error);
  assert.equal(profilePage("-1"), 0);
  assert.equal(profilePage("2.5"), 0);
  assert.equal(profilePage("3"), 3);
  assert.equal(validTarget("fake"), false);
});
test("social projections, mutations, and profile editing enforce database privacy", async (t) => {
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
  for (const [uid, handle, priv] of [
    [alice, "alice", true],
    [bob, "bob", true],
    [carol, "carol", false],
    [dave, "dave", false],
  ]) {
    await db.query("insert into auth.users(id) values($1)", [uid]);
    await db.query(
      "update public.profiles set handle=$2,display_name=$2,bio='Secret biography',is_private=$3 where id=$1",
      [uid, handle, priv],
    );
    await db.query(
      "update public.user_settings set onboarding_completed_at=now(),onboarding_step=3,academic_year='Year 12',school_name='Secret school',goal_text='Secret goal' where user_id=$1",
      [uid],
    );
  }
  async function as(who, sql, args = []) {
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
  const profile = async (who, handle) =>
    (await as(who, "select public.social_profile($1) as data", [handle]))[0]
      .data;
  const mutate = (who, action, target) =>
    as(who, "select public.change_follow($1,$2)", [action, target]);
  const deny = (who, sql, args = []) =>
    assert.rejects(as(who, sql, args), (e) =>
      ["42501", "23505", "23514", "23503"].includes(e.code),
    );
  await t.test(
    "private strangers receive only minimal identity, never bio, media, counts or academics",
    async () => {
      await deny(null, "select public.social_profile('alice')");
      const p = await profile(bob, "alice");
      assert.deepEqual(
        Object.keys(p).sort(),
        [
          "id",
          "handle",
          "is_private",
          "is_self",
          "can_view",
          "relationship",
        ].sort(),
      );
      assert.equal(p.can_view, false);
      assert.equal(
        (
          await as(
            bob,
            "select * from public.social_connections('alice','followers',0)",
          )
        ).length,
        0,
      );
      await deny(
        bob,
        "select * from private.visible_connections($1,'followers')",
        [alice],
      );
    },
  );
  await t.test(
    "requests are unique, parties scoped and private requester details withheld",
    async () => {
      await mutate(bob, "follow", alice);
      await mutate(bob, "follow", alice);
      const requests = await as(
        alice,
        "select * from public.incoming_follow_requests()",
      );
      assert.equal(requests.length, 1);
      assert.equal(requests[0].handle, "bob");
      assert.equal(requests[0].display_name, null);
      assert.equal(
        (await as(carol, "select * from public.incoming_follow_requests()"))
          .length,
        0,
      );
      assert.equal((await profile(bob, "alice")).relationship, "requested");
      await deny(carol, "select public.change_follow('accept',$1)", [bob]);
      await mutate(alice, "accept", bob);
      assert.equal((await profile(bob, "alice")).can_view, true);
    },
  );
  await t.test(
    "counts match visible lists while other users private connections stay hidden",
    async () => {
      await mutate(carol, "follow", alice);
      await mutate(alice, "accept", carol);
      assert.equal((await profile(alice, "alice")).followers, 2);
      const p = await profile(carol, "alice");
      const list = await as(
        carol,
        "select * from public.social_connections('alice','followers',0)",
      );
      assert.equal(p.followers, 1);
      assert.equal(list.length, p.followers);
      assert.equal(list[0].handle, "carol");
      const ownerList = await as(
        alice,
        "select * from public.social_connections('alice','followers',0)",
      );
      assert.equal(ownerList.length, 2);
      assert.equal(
        ownerList.find((p) => p.handle === "bob").display_name,
        null,
      );
    },
  );
  await t.test(
    "academic projections require opt-in and raw settings remain private",
    async () => {
      let p = await profile(bob, "alice");
      assert.equal(p.academic_year, null);
      assert.equal(p.goal_text, null);
      assert.equal("school_name" in p, false);
      assert.equal("study_seconds" in p, false);
      await as(alice, "select public.edit_social_profile($1)", [
        { ...edit, share_year: true },
      ]);
      p = await profile(bob, "alice");
      assert.equal(p.academic_year, "Year 12");
      assert.equal(p.goal_text, null);
      assert.equal(p.academic_direction, null);
      assert.equal(
        (
          await as(bob, "select * from public.user_settings where user_id=$1", [
            alice,
          ])
        ).length,
        0,
      );
      await as(alice, "select public.edit_social_profile($1)", [edit]);
      assert.equal((await profile(bob, "alice")).academic_year, null);
    },
  );
  await t.test(
    "profile edits cannot change another owner and duplicate usernames roll back every field",
    async () => {
      await deny(alice, "select public.edit_social_profile($1)", [
        { ...edit, handle: "bob", display_name: "Changed", share_year: true },
      ]);
      assert.equal((await profile(alice, "alice")).display_name, "Alice");
      await as(alice, "select public.edit_social_profile($1)", [
        { ...edit, user_id: bob },
      ]);
      assert.equal((await profile(bob, "bob")).display_name, "bob");
      await deny(alice, "select public.edit_social_profile($1)", [
        { ...edit, subjects: [id(999)] },
      ]);
      await deny(alice, "select public.edit_social_profile($1)", [
        { ...edit, share_year: "true" },
      ]);
    },
  );
  await t.test(
    "remove, cancel, reject and unfollow only affect the current user relationships",
    async () => {
      await mutate(dave, "remove", bob);
      assert.equal((await profile(bob, "alice")).can_view, true);
      await mutate(alice, "remove", bob);
      assert.equal((await profile(bob, "alice")).can_view, false);
      await mutate(bob, "follow", alice);
      await mutate(bob, "cancel", alice);
      assert.equal((await profile(bob, "alice")).relationship, "none");
      await mutate(bob, "follow", alice);
      await mutate(alice, "reject", bob);
      assert.equal((await profile(bob, "alice")).relationship, "none");
      await mutate(carol, "unfollow", alice);
      assert.equal((await profile(carol, "alice")).can_view, false);
      assert.equal((await profile(alice, "alice")).followers, 0);
    },
  );
  await t.test(
    "public-to-private changes revoke strangers while existing accepted followers remain",
    async () => {
      await as(alice, "select public.edit_social_profile($1)", [
        { ...edit, is_private: false },
      ]);
      assert.equal((await profile(dave, "alice")).can_view, true);
      await mutate(bob, "follow", alice);
      await mutate(bob, "follow", alice);
      assert.equal((await profile(alice, "alice")).followers, 1);
      await as(alice, "select public.edit_social_profile($1)", [edit]);
      assert.equal((await profile(dave, "alice")).can_view, false);
      assert.equal((await profile(bob, "alice")).can_view, true);
    },
  );
  await t.test(
    "blocking removes both-direction visibility, counts, requests, and follow ability",
    async () => {
      await as(
        alice,
        "insert into public.blocks(blocker_id,blocked_id) values($1,$2)",
        [alice, bob],
      );
      assert.equal(await profile(bob, "alice"), null);
      assert.equal(await profile(alice, "bob"), null);
      assert.equal((await profile(alice, "alice")).followers, 0);
      await deny(bob, "select public.change_follow('follow',$1)", [alice]);
      assert.equal(
        (await as(alice, "select * from public.incoming_follow_requests()"))
          .length,
        0,
      );
    },
  );
  await t.test(
    "lists paginate deterministically and do not expose blocked or private strangers",
    async () => {
      for (let n = 10; n < 33; n++) {
        await db.query("insert into auth.users(id) values($1)", [id(n)]);
        await db.query(
          "update public.profiles set handle=$2,is_private=false where id=$1",
          [id(n), `peer_${n}`],
        );
        await db.query(
          "insert into public.follows(follower_id,following_id) values($1,$2)",
          [id(n), carol],
        );
      }
      const first = await as(
          dave,
          "select * from public.social_connections('carol','followers',0)",
        ),
        second = await as(
          dave,
          "select * from public.social_connections('carol','followers',1)",
        );
      assert.equal(first.length, 20);
      assert.equal(second.length, 3);
      assert.equal(new Set([...first, ...second].map((x) => x.id)).size, 23);
      assert.equal((await profile(dave, "carol")).followers, 23);
      assert.equal(
        (
          await as(
            dave,
            "select * from public.social_connections('carol','invalid',0)",
          )
        ).length,
        0,
      );
    },
  );
});
