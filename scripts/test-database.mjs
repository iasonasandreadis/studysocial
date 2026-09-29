import { PGlite } from "@electric-sql/pglite";
import { readFile, readdir } from "node:fs/promises";
import assert from "node:assert/strict";
import { test } from "node:test";

const root = new URL("../", import.meta.url);
const sql = async (path) => readFile(new URL(path, root), "utf8");
const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const [alice, bob, carol, dave] = [1, 2, 3, 4].map(id);
const post = id(10),
  session = id(11),
  group = id(12),
  groupPost = id(13),
  comment = id(14);

test("StudySocial migrations and authorization against isolated PostgreSQL", async (t) => {
  const db = new PGlite();
  t.after(() => db.close());
  await db.exec(await sql("supabase/tests/bootstrap.sql"));
  for (const file of (
    await readdir(new URL("supabase/migrations/", root))
  ).sort()) {
    await db.exec(await sql(`supabase/migrations/${file}`));
  }
  async function user(who, query, params = []) {
    await db.exec("begin");
    try {
      await db.exec(`set local role ${who ? "authenticated" : "anon"}`);
      await db.query("select set_config('request.jwt.claim.sub',$1,true)", [
        who ?? "",
      ]);
      const result = await db.query(query, params);
      await db.exec("commit");
      return result.rows;
    } catch (error) {
      await db.exec("rollback");
      throw error;
    }
  }
  const count = async (who, table) =>
    Number((await user(who, `select count(*) as n from public.${table}`))[0].n);
  const denied = async (who, query, params = []) =>
    assert.rejects(user(who, query, params), (e) =>
      ["42501", "23514", "23503", "23505"].includes(e.code),
    );
  await db.query("insert into auth.users(id) values ($1),($2),($3),($4)", [
    alice,
    bob,
    carol,
    dave,
  ]);
  await t.test(
    "all application tables enable RLS and deny anonymous reads",
    async () => {
      const tables = (
        await db.query(
          "select tablename,rowsecurity from pg_tables where schemaname='public'",
        )
      ).rows;
      assert.equal(tables.length, 19);
      for (const table of tables) {
        assert.equal(table.rowsecurity, true);
        await denied(null, `select * from public.${table.tablename}`);
      }
      assert.equal(await count(alice, "profiles"), 1);
      assert.equal(await count(bob, "user_settings"), 1);
    },
  );
  await t.test(
    "cannot impersonate, reassign ownership, or update another profile",
    async () => {
      await denied(bob, "update public.profiles set id=$1 where id=$2", [
        carol,
        bob,
      ]);
      assert.equal(
        (
          await user(
            bob,
            "update public.profiles set bio='attack' where id=$1 returning id",
            [alice],
          )
        ).length,
        0,
      );
      await denied(
        bob,
        "insert into public.study_sessions(user_id) values ($1)",
        [alice],
      );
      await denied(bob, "update public.user_settings set user_id=$1", [alice]);
    },
  );
  // Historical published fixtures exercise current read policies; new lifecycle writes
  // are covered separately in test-posts.mjs. Direct client mutations are now denied.
  await db.query(
    "insert into public.posts(id,author_id,audience,publication_state) values($1,$2,'public','published')",
    [post, alice],
  );
  await t.test(
    "private profiles gate public-audience posts and deny strangers interactions",
    async () => {
      assert.equal(await count(bob, "posts"), 0);
      await denied(
        bob,
        "insert into public.post_kudos(post_id,user_id) values($1,$2)",
        [post, bob],
      );
      await denied(
        bob,
        "insert into public.comments(post_id,author_id,body) values($1,$2,'hidden')",
        [post, bob],
      );
    },
  );
  await t.test(
    "private follows require acceptance by target, cannot be forged or duplicated",
    async () => {
      await denied(
        bob,
        "insert into public.follows(follower_id,following_id) values($1,$2)",
        [bob, alice],
      );
      await user(bob, "select public.request_follow($1)", [alice]);
      await user(bob, "select public.request_follow($1)", [alice]);
      assert.equal(await count(alice, "follow_requests"), 1);
      assert.equal(await count(carol, "follow_requests"), 0);
      await denied(carol, "select public.accept_follow($1)", [bob]);
      await user(alice, "select public.accept_follow($1)", [bob]);
      assert.equal(await count(bob, "posts"), 1);
      assert.equal(await count(bob, "profiles"), 2);
      await user(bob, "select public.request_follow($1)", [alice]);
      assert.equal(await count(bob, "follows"), 1);
    },
  );
  await t.test(
    "sessions stay private; sharing copies only selected completed metadata",
    async () => {
      await db.query(
        "insert into public.study_sessions(id,user_id,status,started_at,ended_at,duration_seconds,notes) values($1,$2,'completed',now()-interval '1 hour',now(),3600,'private notes')",
        [session, alice],
      );
      await db.query("update public.posts set session_id=$1 where id=$2", [
        session,
        post,
      ]);
      assert.equal(await count(bob, "study_sessions"), 0);
      assert.equal(
        (await user(bob, "select shared_duration_seconds from public.posts"))[0]
          .shared_duration_seconds,
        3600,
      );
      await denied(
        bob,
        "insert into public.posts(author_id,session_id) values($1,$2)",
        [bob, session],
      );
      await denied(
        alice,
        "update public.posts set shared_duration_seconds=999",
      );
      await db.query(
        "insert into public.study_sessions(user_id,running_since) values($1,now())",
        [alice],
      );
      await denied(
        alice,
        "insert into public.study_sessions(user_id,running_since) values($1,now())",
        [alice],
      );
      await denied(
        alice,
        "insert into public.study_sessions(user_id,status,duration_seconds) values($1,'completed',-1)",
        [alice],
      );
    },
  );
  await t.test(
    "interaction ownership, uniqueness and author blocking",
    async () => {
      await user(
        bob,
        "insert into public.post_kudos(post_id,user_id) values($1,$2)",
        [post, bob],
      );
      await denied(
        bob,
        "insert into public.post_kudos(post_id,user_id) values($1,$2)",
        [post, bob],
      );
      await user(
        bob,
        "insert into public.comments(id,post_id,author_id,body) values($1,$2,$3,'Good work')",
        [comment, post, bob],
      );
      await denied(bob, "update public.comments set author_id=$1", [alice]);
      assert.equal(
        (
          await user(
            alice,
            "update public.comments set body='changed' returning id",
          )
        ).length,
        0,
      );
    },
  );
  await t.test(
    "private groups require acceptance and never widen author visibility",
    async () => {
      await user(
        alice,
        "insert into public.communities(id,owner_id,slug,name) values($1,$2,'test-group','Test')",
        [group, alice],
      );
      await user(bob, "select public.request_membership($1)", [group]);
      assert.equal(await count(bob, "communities"), 0);
      await denied(
        bob,
        "update public.community_members set status='accepted'",
      );
      await denied(
        bob,
        "insert into public.community_members(community_id,user_id,status) values($1,$2,'accepted')",
        [group, bob],
      );
      await user(alice, "select public.accept_membership($1,$2)", [group, bob]);
      assert.equal(await count(bob, "communities"), 1);
      await db.query(
        "insert into public.posts(id,author_id,community_id,audience,publication_state) values($1,$2,$3,'public','published')",
        [groupPost, alice, group],
      );
      assert.equal(await count(bob, "posts"), 2);
      await user(carol, "select public.request_follow($1)", [alice]);
      await user(alice, "select public.accept_follow($1)", [carol]);
      assert.equal(await count(carol, "posts"), 1);
      await user(dave, "select public.request_membership($1)", [group]);
      await user(alice, "select public.accept_membership($1,$2)", [
        group,
        dave,
      ]);
      assert.equal(await count(dave, "posts"), 0);
      await denied(
        carol,
        "insert into public.posts(author_id,community_id) values($1,$2)",
        [carol, group],
      );
    },
  );
  await t.test(
    "notifications scoped to recipient and current resource visibility; clients cannot mint events",
    async () => {
      await db.query(
        "insert into public.notifications(recipient_id,actor_id,kind,post_id,event_key) values($1,$2,'comment',$3,'comment-1')",
        [alice, bob, post],
      );
      assert.equal(
        (
          await user(
            alice,
            "select id from notifications where event_key='comment-1'",
          )
        ).length,
        1,
      );
      assert.equal(
        (
          await user(
            bob,
            "select id from notifications where event_key='comment-1'",
          )
        ).length,
        0,
      );
      await denied(
        bob,
        "insert into public.notifications(recipient_id,actor_id,kind,event_key) values($1,$2,'follow','fake')",
        [alice, bob],
      );
      await denied(alice, "update public.notifications set actor_id=$1", [
        carol,
      ]);
      await user(alice, "update public.notifications set read_at=now()");
    },
  );
  await t.test(
    "reports are insert-only, validated and never readable by users",
    async () => {
      await user(
        bob,
        "insert into public.reports(reporter_id,target_post_id,reason) values($1,$2,'spam')",
        [bob, post],
      );
      assert.equal(await count(bob, "reports"), 0);
      assert.equal(await count(alice, "reports"), 0);
      await denied(
        bob,
        "insert into public.reports(reporter_id,target_post_id,reason,status) values($1,$2,'spam','resolved')",
        [bob, post],
      );
      await denied(
        bob,
        "insert into public.reports(reporter_id,reason) values($1,'spam')",
        [bob],
      );
    },
  );
  const avatar = `${alice}/avatar.webp`,
    photo = `${alice}/${post}/photo.webp`;
  await t.test(
    "private media follows visibility, rejects cross-user paths and overwrites",
    async () => {
      await user(alice, "update public.profiles set avatar_path=$1", [avatar]);
      await db.query(
        "insert into public.post_media(post_id,owner_id,object_path) values($1,$2,$3)",
        [post, alice, photo],
      );
      for (const [bucket, path] of [
        ["avatars", avatar],
        ["post-images", photo],
      ]) {
        // Published post fixtures predate lifecycle enforcement; owner upload policy
        // for drafts is exercised by the Phase 04 suite.
        await (
          bucket === "avatars"
            ? (q, p) => user(alice, q, p)
            : (q, p) => db.query(q, p)
        )(
          "insert into storage.objects(bucket_id,name,owner_id) values($1,$2,$3)",
          [bucket, path, alice],
        );
        assert.equal(
          (
            await user(bob, "select * from storage.objects where name=$1", [
              path,
            ])
          ).length,
          1,
        );
        assert.equal(
          (
            await user(dave, "select * from storage.objects where name=$1", [
              path,
            ])
          ).length,
          0,
        );
        await denied(
          bob,
          "insert into storage.objects(bucket_id,name,owner_id) values($1,$2,$3)",
          [bucket, path, bob],
        );
        assert.equal(
          (
            await user(
              bob,
              "update storage.objects set name='attack' where name=$1 returning id",
              [path],
            )
          ).length,
          0,
        );
        assert.equal(
          (
            await user(
              bob,
              "delete from storage.objects where name=$1 returning id",
              [path],
            )
          ).length,
          0,
        );
      }
      await denied(
        bob,
        "update public.profiles set avatar_path=$1 where id=$2",
        [avatar, bob],
      );
      await denied(
        alice,
        "insert into storage.objects(bucket_id,name,owner_id) values('avatars',$1,$2)",
        [`${alice}/evil.svg`, alice],
      );
      assert.equal(
        (await db.query("select * from storage.buckets where public")).rows
          .length,
        0,
      );
    },
  );
  await t.test(
    "blocking hides both directions, interactions, media and notifications; removes relationships",
    async () => {
      await user(
        alice,
        "insert into public.blocks(blocker_id,blocked_id) values($1,$2)",
        [alice, bob],
      );
      assert.equal(await count(bob, "posts"), 0);
      assert.equal(await count(bob, "follows"), 0);
      assert.equal(await count(bob, "communities"), 0);
      assert.equal(await count(alice, "comments"), 0);
      assert.equal(
        (
          await user(alice, "select id from notifications where actor_id=$1", [
            bob,
          ])
        ).length,
        0,
      );
      assert.equal(await count(bob, "blocks"), 0);
      assert.equal(
        (await user(bob, "select * from storage.objects")).length,
        0,
      );
      await denied(bob, "select public.request_follow($1)", [alice]);
      await denied(bob, "select public.request_membership($1)", [group]);
      await user(alice, "delete from public.blocks where blocked_id=$1", [bob]);
      assert.equal(await count(bob, "posts"), 0);
      assert.equal(await count(bob, "community_members"), 0);
    },
  );
  await t.test(
    "public follows work, revoke immediately, and private audiences stay private",
    async () => {
      await user(alice, "update public.profiles set is_private=false");
      assert.equal(await count(bob, "posts"), 1);
      await user(bob, "select public.request_follow($1)", [alice]);
      assert.equal(await count(bob, "follows"), 1);
      await db.query(
        "update public.posts set audience='followers' where id=$1",
        [post],
      );
      assert.equal(await count(bob, "posts"), 1);
      await user(bob, "delete from public.follows where following_id=$1", [
        alice,
      ]);
      assert.equal(await count(bob, "posts"), 0);
      await db.query("update public.posts set audience='private' where id=$1", [
        post,
      ]);
      assert.equal(await count(carol, "posts"), 0);
    },
  );
  await t.test(
    "reference seed is repeatable and contains no user activity",
    async () => {
      await db.exec(await sql("supabase/seed.sql"));
      await db.exec(await sql("supabase/seed.sql"));
      assert.equal(await count(alice, "subjects"), 4);
      assert.equal(await count(alice, "academic_programs"), 1);
      assert.equal(await count(alice, "program_subjects"), 4);
      await denied(
        alice,
        "insert into public.subjects(code,labels) values('fake','{}')",
      );
    },
  );
  await t.test(
    "public membership cannot self-promote; private author posts remain protected",
    async () => {
      // A separate public group: existing private-group posts cannot be widened.
      const publicGroup = "00000000-0000-4000-8000-000000000999";
      await user(
        alice,
        "insert into public.communities(id,owner_id,slug,name,visibility) values($1,$2,'public-test','Public test','public')",
        [publicGroup, alice],
      );
      await user(bob, "select public.request_membership($1)", [publicGroup]);
      assert.equal(
        (
          await user(
            bob,
            "select status from public.community_members where user_id=$1 and community_id=$2",
            [bob, publicGroup],
          )
        )[0].status,
        "accepted",
      );
      await denied(
        bob,
        "update public.community_members set role='moderator' where user_id=$1",
        [bob],
      );
      await user(alice, "update public.profiles set is_private=true");
      assert.equal(await count(bob, "posts"), 0);
      await denied(bob, "select public.accept_membership($1,$2)", [
        group,
        carol,
      ]);
    },
  );
  await t.test(
    "storage refuses owner overwrite too; unreferenced uploads stay owner-only",
    async () => {
      assert.equal(
        (await user(alice, "update storage.objects set name=name returning id"))
          .length,
        0,
      );
      await user(
        alice,
        "insert into storage.objects(bucket_id,name,owner_id) values('avatars',$1,$2)",
        [`${alice}/unlinked.png`, alice],
      );
      assert.equal(
        (
          await user(carol, "select * from storage.objects where name=$1", [
            `${alice}/unlinked.png`,
          ])
        ).length,
        0,
      );
      await denied(
        alice,
        "insert into storage.objects(bucket_id,name,owner_id) values('post-images',$1,$2)",
        [`${alice}/${post}/unregistered.png`, alice],
      );
    },
  );
  await t.test(
    "public RPCs reject anonymous callers and internal mutation helpers are not executable",
    async () => {
      await denied(null, "select public.request_follow($1)", [alice]);
      await denied(null, "select public.request_membership($1)", [group]);
      await denied(bob, "select private.lock_pair($1,$2)", [alice, bob]);
      await denied(bob, "update public.posts set author_id=$1", [bob]);
      await denied(bob, "delete from public.posts where id=$1", [post]);
    },
  );
  await t.test(
    "onboarding cannot skip steps or set completion directly",
    async () => {
      await denied(null, "select public.save_onboarding(1, '{}'::jsonb)");
      await denied(
        alice,
        "select public.save_onboarding(3, '{\"is_private\":true}'::jsonb)",
      );
      await denied(
        alice,
        "update public.user_settings set onboarding_completed_at=now()",
      );
      await denied(alice, "update public.user_settings set onboarding_step=3");
    },
  );
  await t.test(
    "onboarding saves and resumes identity with atomic username conflicts",
    async () => {
      await user(alice, "select public.save_onboarding(1,$1::jsonb)", [
        JSON.stringify({
          display_name: "Alice",
          handle: "ALICE_STUDENT",
          bio: "Hello",
        }),
      ]);
      assert.equal(
        (
          await user(alice, "select handle from public.profiles where id=$1", [
            alice,
          ])
        )[0].handle,
        "alice_student",
      );
      assert.equal(
        (
          await user(alice, "select onboarding_step from public.user_settings")
        )[0].onboarding_step,
        2,
      );
      await denied(bob, "select public.save_onboarding(1,$1::jsonb)", [
        JSON.stringify({ display_name: "Overwrite", handle: "alice_student" }),
      ]);
      assert.equal(
        (await user(bob, "select onboarding_step from public.user_settings"))[0]
          .onboarding_step,
        1,
      );
      await user(bob, "select public.save_onboarding(1,$1::jsonb)", [
        JSON.stringify({
          user_id: alice,
          display_name: "Bob",
          handle: "bob_student",
        }),
      ]);
      assert.equal(
        (
          await user(
            alice,
            "select display_name from public.profiles where id=$1",
            [alice],
          )
        )[0].display_name,
        "Alice",
      );
    },
  );
  await t.test(
    "academic saves roll back on invalid references and keep school/targets private",
    async () => {
      const payload = {
        academic_year: "Year 12",
        academic_direction: "Sciences",
        target_university: "Example university",
        target_program: "Engineering",
        school_name: "Private school name",
        subjects: ["10000000-0000-4000-8000-000000000011"],
      };
      await user(alice, "select public.save_onboarding(2,$1::jsonb)", [
        JSON.stringify(payload),
      ]);
      assert.equal(
        (
          await user(alice, "select onboarding_step from public.user_settings")
        )[0].onboarding_step,
        3,
      );
      await denied(alice, "select public.save_onboarding(2,$1::jsonb)", [
        JSON.stringify({
          ...payload,
          academic_year: "Changed",
          subjects: [id(999)],
        }),
      ]);
      assert.equal(
        (await user(alice, "select academic_year from public.user_settings"))[0]
          .academic_year,
        "Year 12",
      );
      assert.equal(await count(alice, "user_subjects"), 1);
      assert.equal(
        (
          await user(
            bob,
            "select * from public.user_settings where user_id=$1",
            [alice],
          )
        ).length,
        0,
      );
      await denied(alice, "select public.save_onboarding(2,$1::jsonb)", [
        JSON.stringify({ ...payload, goal_text: "x".repeat(301) }),
      ]);
    },
  );
  await t.test(
    "completion requires explicit privacy and is idempotent",
    async () => {
      await denied(alice, "select public.save_onboarding(3,'{}'::jsonb)");
      await user(
        alice,
        "select public.save_onboarding(3,'{\"is_private\":true}'::jsonb)",
      );
      const first = (
        await user(
          alice,
          "select onboarding_completed_at from public.user_settings",
        )
      )[0].onboarding_completed_at;
      assert.ok(first);
      await user(
        alice,
        "select public.save_onboarding(3,'{\"is_private\":true}'::jsonb)",
      );
      assert.deepEqual(
        (
          await user(
            alice,
            "select onboarding_completed_at from public.user_settings",
          )
        )[0].onboarding_completed_at,
        first,
      );
      assert.equal(
        (
          await user(
            alice,
            "select is_private from public.profiles where id=$1",
            [alice],
          )
        )[0].is_private,
        true,
      );
    },
  );
});
