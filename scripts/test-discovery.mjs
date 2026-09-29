import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
const root = new URL("../", import.meta.url),
  id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
test("discovery and community privacy under actual database roles", async (t) => {
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
    carol = id(3),
    subject = id(4),
    group = id(5),
    post = id(6);
  for (const [uid, handle, privateAccount] of [
    [alice, "alice", false],
    [bob, "bob", true],
    [carol, "carol", false],
  ]) {
    await db.query("insert into auth.users(id) values($1)", [uid]);
    await db.query(
      "update profiles set handle=$1,display_name=$2,is_private=$3 where id=$4",
      [handle, `${handle} protected name`, privateAccount, uid],
    );
    await db.query(
      "update user_settings set school_name='Secret School',academic_year='Year 12',target_university='Secret University',goal_text='Secret Goal' where user_id=$1",
      [uid],
    );
  }
  await db.query(
    "insert into subjects(id,code,labels) values($1,'math','{\"en\":\"Mathematics\"}')",
    [subject],
  );
  await db.query(
    "insert into user_subjects(user_id,subject_id) values($1,$3),($2,$3)",
    [alice, bob, subject],
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
  const discover = async (section = "search", term = "") =>
    (
      await user(alice, "select discover_students($1,$2,0) as r", [
        term,
        section,
      ])
    )[0].r;
  const rpc = async (who, name, args) =>
    (
      await user(
        who,
        `select ${name}(${args.map((_, i) => "$" + (i + 1)).join(",")}) as r`,
        args,
      )
    )[0].r;
  const denied = (p) =>
    assert.rejects(p, (e) => ["42501", "23514", "23503"].includes(e.code));
  await t.test(
    "private identities are minimal and hidden academic data cannot be searched or inferred",
    async () => {
      await denied(rpc(null, "discover_students", []));
      await denied(rpc(alice, "discover_students", ["", "bad", 0]));
      const b = (await discover()).find((p) => p.id === bob);
      assert.equal(b.display_name, null);
      assert.equal((await discover("search", "protected name")).length, 1);
      for (const section of ["similar", "subjects", "goal", "school"])
        assert.equal((await discover(section)).length, 0);
      for (const term of [
        "Secret School",
        "Secret University",
        "Secret Goal",
        "Mathematics",
      ])
        assert.equal((await discover("search", term)).length, 0);
      // Existing sharing choices are saved by edit_social_profile, not direct grants.
      await db.query(
        "update user_settings set share_year=true,share_subjects=true,share_target=true,share_goal=true,share_school=true where user_id=$1",
        [bob],
      );
      assert.equal((await discover("school")).length, 0);
      assert.equal((await discover("search", "Secret School")).length, 0);
    },
  );
  await t.test(
    "approved profile access plus explicit opt-in enables matches and revocation removes them",
    async () => {
      await rpc(alice, "request_follow", [bob]);
      await rpc(bob, "accept_follow", [alice]);
      for (const section of ["similar", "subjects", "goal", "school"])
        assert.equal((await discover(section))[0].id, bob);
      for (const term of [
        "Secret School",
        "Secret University",
        "Secret Goal",
        "Mathematics",
      ])
        assert.equal((await discover("search", term))[0].id, bob);
      await user(bob, "update user_settings set share_school=false");
      assert.equal((await discover("school")).length, 0);
      assert.equal((await discover("search", "Secret School")).length, 0);
      await user(alice, "delete from follows where following_id=$1", [bob]);
      assert.equal((await discover("subjects")).length, 0);
      await user(
        alice,
        "insert into blocks(blocker_id,blocked_id) values($1,$2)",
        [alice, bob],
      );
      assert.ok(!(await discover()).some((p) => p.id === bob));
      await user(alice, "delete from blocks where blocked_id=$1", [bob]);
    },
  );
  await t.test(
    "private community links expose only a stub, requests are scoped, approval grants member access",
    async () => {
      await user(
        carol,
        "insert into communities(id,owner_id,slug,name,description,visibility,kind) values($1,$2,'private-circle','Protected school group','Protected description','private','school')",
        [group, carol],
      );
      const stub = await rpc(alice, "community_info", [group]);
      assert.equal(stub.name, "Private community");
      assert.equal(stub.description, null);
      assert.equal(stub.can_view, false);
      assert.equal(
        await rpc(alice, "community_people", [group, 0, false]),
        null,
      );
      assert.equal(await rpc(alice, "community_feed", [group, 0]), null);
      await rpc(alice, "request_membership", [group]);
      assert.equal((await rpc(alice, "community_info", [group])).pending, true);
      assert.equal(
        (await rpc(carol, "community_people", [group, 0, true]))[0].id,
        alice,
      );
      await denied(rpc(bob, "accept_membership", [group, alice]));
      await rpc(carol, "accept_membership", [group, alice]);
      assert.equal(
        (await rpc(alice, "community_info", [group])).can_view,
        true,
      );
      assert.equal((await rpc(alice, "posting_communities", []))[0].id, group);
      await rpc(bob, "request_membership", [group]);
      await rpc(carol, "accept_membership", [group, bob]);
      const member = (
        await rpc(alice, "community_people", [group, 0, false])
      ).find((m) => m.id === bob);
      assert.equal(member.display_name, null);
      assert.equal(member.handle, "bob");
    },
  );
  const payload = {
    caption: "Private author in a group",
    audience: "public",
    show_duration: true,
    manual_duration_seconds: 120,
    session_id: "",
    subject_id: "",
    community_id: group,
  };
  await t.test(
    "community posting requires current membership and never widens private author visibility",
    async () => {
      const prepared = await rpc(bob, "prepare_photo_post", [
        post,
        JSON.stringify(payload),
        "a".repeat(64),
      ]);
      await user(
        bob,
        "insert into storage.objects(bucket_id,name,owner_id) values('post-images',$1,$2)",
        [prepared.path, bob],
      );
      await rpc(bob, "publish_photo_post", [post]);
      assert.equal((await rpc(alice, "community_feed", [group, 0])).length, 0);
      await rpc(alice, "request_follow", [bob]);
      await rpc(bob, "accept_follow", [alice]);
      assert.equal(
        (await rpc(alice, "community_feed", [group, 0]))[0].id,
        post,
      );
      assert.equal(
        (await rpc(alice, "popular_community_posts", []))[0].id,
        post,
      );
      const draft = id(7);
      await rpc(alice, "prepare_photo_post", [
        draft,
        JSON.stringify(payload),
        "b".repeat(64),
      ]);
      await user(
        alice,
        "delete from community_members where community_id=$1 and user_id=$2",
        [group, alice],
      );
      await denied(rpc(alice, "publish_photo_post", [draft]));
      await denied(
        rpc(alice, "prepare_photo_post", [
          id(8),
          JSON.stringify(payload),
          "c".repeat(64),
        ]),
      );
      assert.equal(await rpc(alice, "community_feed", [group, 0]), null);
      await user(
        carol,
        "insert into blocks(blocker_id,blocked_id) values($1,$2)",
        [carol, bob],
      );
      assert.equal(await rpc(bob, "community_info", [group]), null);
      assert.equal((await rpc(bob, "posting_communities", [])).length, 0);
    },
  );
  await t.test(
    "community owners cannot widen existing authors' audiences or cascade-delete their photos",
    async () => {
      await denied(
        user(carol, "update communities set visibility='public' where id=$1", [
          group,
        ]),
      );
      await denied(user(carol, "delete from communities where id=$1", [group]));
      assert.equal(
        (
          await db.query("select visibility from communities where id=$1", [
            group,
          ])
        ).rows[0].visibility,
        "private",
      );
      assert.equal(
        (await db.query("select id from posts where id=$1", [post])).rows
          .length,
        1,
      );
    },
  );
  await t.test(
    "community creation budgets survive deleting activity and cannot be edited by clients",
    async () => {
      // Isolate this account's budget from earlier scenario setup.
      await db.query(
        "delete from private.interaction_budgets where user_id=$1",
        [alice],
      );
      for (let n = 100; n < 105; n++)
        await user(
          alice,
          "insert into communities(id,owner_id,slug,name) values($1,$2,$3,'Test')",
          [id(n), alice, `test-${n}`],
        );
      await assert.rejects(
        user(
          alice,
          "insert into communities(id,owner_id,slug,name) values($1,$2,'over-limit','Test')",
          [id(105), alice],
        ),
        (e) => e.code === "P0001",
      );
      await assert.rejects(
        user(alice, "delete from private.interaction_budgets"),
      );
    },
  );
});
