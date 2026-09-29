import { test } from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { readFile, readdir } from "node:fs/promises";
import { commentBody, pageNumber } from "../src/lib/feed/validation.ts";
import { relativeTime } from "../src/lib/feed/types.ts";
const root = new URL("../", import.meta.url),
  id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const [viewer, friend, stranger, hidden, blocked, commenter] = [
  1, 2, 3, 4, 5, 6,
].map(id);
const [
  followPost,
  publicPost,
  hiddenPost,
  blockedPost,
  privatePost,
  draftPost,
  deletingPost,
  ownPost,
  subjectPost,
  groupPost,
  hiddenGroupPost,
] = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20].map(id);
const [subject, group] = [30, 31].map(id);
test("comments, pagination and relative times validate boundary values", () => {
  assert.equal(commentBody("  Good effort! \n"), "Good effort!");
  for (const v of ["", null, "\t\n", "x".repeat(1001)])
    assert.equal(commentBody(v), null);
  assert.equal(commentBody("x".repeat(1000)).length, 1000);
  assert.equal(pageNumber("-1"), 0);
  assert.equal(pageNumber("broken"), 0);
  assert.equal(pageNumber("999", 24), 24);
  assert.equal(pageNumber("1"), 1);
  assert.equal(
    relativeTime("2026-01-01T00:00:00Z", Date.parse("2026-01-01T00:02:00Z")),
    "2m ago",
  );
  assert.equal(
    relativeTime("2026-01-02T00:00:00Z", Date.parse("2026-01-01T00:00:00Z")),
    "Just now",
  );
});
test("feeds, exact visible interactions and flat comments preserve database authorization", async (t) => {
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
  async function user(who, sql, params = []) {
    await db.exec("begin");
    try {
      await db.exec(`set local role ${who ? "authenticated" : "anon"}`);
      await db.query("select set_config('request.jwt.claim.sub',$1,true)", [
        who ?? "",
      ]);
      const { rows } = await db.query(sql, params);
      await db.exec("commit");
      return rows;
    } catch (e) {
      await db.exec("rollback");
      throw e;
    }
  }
  const denied = (who, sql, params = []) =>
    assert.rejects(user(who, sql, params), (e) =>
      ["42501", "23514", "23503", "23505"].includes(e.code),
    );
  const feed = async (mode = "for-you", page = 0) =>
    (await user(viewer, "select study_feed($1,$2) as result", [mode, page]))[0]
      .result;
  const activity = async (who, target) =>
    (await user(who, "select post_activity($1) as result", [target]))[0].result;
  const comments = async (who, target, page = 0) =>
    (
      await user(who, "select post_comments($1,$2) as result", [target, page])
    )[0].result;
  for (const uid of [viewer, friend, stranger, hidden, blocked, commenter]) {
    await db.query("insert into auth.users(id) values($1)", [uid]);
    await db.query(
      "update profiles set handle=$1,display_name=$2,is_private=$3 where id=$4",
      [
        `student_${uid.slice(-2)}`,
        `Private name ${uid.slice(-2)}`,
        [friend, hidden, commenter].includes(uid),
        uid,
      ],
    );
  }
  await db.query(
    "insert into subjects(id,code,labels) values($1,'math','{\"en\":\"Math\"}')",
    [subject],
  );
  await user(
    viewer,
    "insert into user_subjects(user_id,subject_id) values($1,$2)",
    [viewer, subject],
  );
  await user(viewer, "select request_follow($1)", [friend]);
  await user(friend, "select accept_follow($1)", [viewer]);
  await user(
    viewer,
    "insert into blocks(blocker_id,blocked_id) values($1,$2)",
    [viewer, blocked],
  );
  await db.query(
    "insert into communities(id,owner_id,slug,name,visibility) values($1,$2,'study-group','Study group','private')",
    [group, stranger],
  );
  await user(viewer, "select request_membership($1)", [group]);
  await user(stranger, "select accept_membership($1,$2)", [group, viewer]);
  async function fixture(
    pid,
    author,
    audience = "public",
    state = "published",
    sub = null,
    community = null,
    age = 0,
  ) {
    await db.query(
      "insert into posts(id,author_id,audience,publication_state,subject_id,community_id,caption,created_at) values($1,$2,$3,$4,$5,$6,'Study progress',now()-($7::int*interval '1 day'))",
      [pid, author, audience, state, sub, community, age],
    );
  }
  await fixture(followPost, friend, "followers", "published", null, null, 2);
  await fixture(publicPost, stranger);
  await fixture(hiddenPost, hidden);
  await fixture(blockedPost, blocked);
  await fixture(privatePost, viewer, "private");
  await fixture(draftPost, viewer, "public", "draft");
  await fixture(deletingPost, viewer, "public", "deleting");
  await fixture(ownPost, viewer);
  await fixture(subjectPost, stranger, "public", "published", subject);
  await fixture(groupPost, stranger, "public", "published", null, group);
  await fixture(hiddenGroupPost, hidden, "public", "published", null, group);
  await t.test(
    "RPCs reject anonymous callers and invalid modes/pages",
    async () => {
      for (const [sql, args] of [
        ["select study_feed()", []],
        ["select post_activity($1)", [publicPost]],
        ["select set_post_kudos($1,true)", [publicPost]],
        ["select post_comments($1)", [publicPost]],
        ["select add_post_comment($1,$2,$3)", [publicPost, id(90), "hello"]],
      ])
        await denied(null, sql, args);
      await denied(viewer, "select study_feed($1,0)", ["bad"]);
      await denied(viewer, "select study_feed('for-you',-1)");
      await denied(viewer, "select study_feed('for-you',25)");
      await denied(viewer, "select post_comments($1,-1)", [publicPost]);
    },
  );
  await t.test(
    "For You ranks permitted follow/subject/community signals and excludes every private draft/deleting/blocked row",
    async () => {
      const rows = await feed(),
        ids = rows.map((r) => r.id);
      assert.deepEqual(ids.slice(0, 3), [followPost, subjectPost, groupPost]);
      for (const pid of [
        hiddenPost,
        blockedPost,
        privatePost,
        draftPost,
        deletingPost,
        hiddenGroupPost,
      ])
        assert.ok(!ids.includes(pid));
      assert.deepEqual(
        (await feed()).map((r) => r.id),
        ids,
      );
      assert.equal(rows[0].reason, "Someone you follow");
      assert.ok(!JSON.stringify(rows).includes("session_id"));
      assert.ok(!JSON.stringify(rows).includes("school"));
      await db.query(
        "update user_settings set school_name='SECRET SCHOOL',goal_text='SECRET GOAL' where user_id in ($1,$2)",
        [viewer, stranger],
      );
      assert.deepEqual(
        (await feed()).map((r) => r.id),
        ids,
      );
      assert.ok(!JSON.stringify(await feed()).includes("SECRET"));
    },
  );
  await t.test(
    "Community includes only own, followed and permitted joined-community posts",
    async () => {
      const ids = (await feed("community")).map((r) => r.id);
      assert.deepEqual(new Set(ids), new Set([followPost, ownPost, groupPost]));
      await user(
        viewer,
        "delete from community_members where community_id=$1 and user_id=$2",
        [group, viewer],
      );
      assert.ok(!(await feed("community")).some((p) => p.id === groupPost));
      assert.ok(!(await feed()).some((p) => p.id === groupPost));
    },
  );
  await t.test(
    "kudos retries are idempotent, removal is exact and inaccessible posts reject all mutations",
    async () => {
      await user(viewer, "select set_post_kudos($1,true)", [publicPost]);
      await user(viewer, "select set_post_kudos($1,true)", [publicPost]);
      assert.deepEqual(await activity(viewer, publicPost), {
        kudos_count: 1,
        comment_count: 0,
        has_kudos: true,
      });
      await user(viewer, "select set_post_kudos($1,false)", [publicPost]);
      await user(viewer, "select set_post_kudos($1,false)", [publicPost]);
      assert.equal((await activity(viewer, publicPost)).kudos_count, 0);
      for (const pid of [hiddenPost, blockedPost, draftPost, deletingPost]) {
        await denied(viewer, "select set_post_kudos($1,true)", [pid]);
        await denied(viewer, "select add_post_comment($1,$2,$3)", [
          pid,
          id(91),
          "hi",
        ]);
      }
      await denied(
        viewer,
        "insert into post_kudos(post_id,user_id) values($1,$2)",
        [publicPost, friend],
      );
      await denied(
        viewer,
        "insert into comments(post_id,author_id,body) values($1,$2,$3)",
        [draftPost, viewer, "Draft bypass"],
      );
      assert.equal(await activity(viewer, hiddenPost), null);
      assert.equal(await comments(viewer, hiddenPost), null);
    },
  );
  await t.test(
    "comments validate text, bind ownership, retry without duplication and keep private commenter details private",
    async () => {
      await user(commenter, "select add_post_comment($1,$2,$3)", [
        publicPost,
        id(100),
        "  Well done!  ",
      ]);
      await user(commenter, "select add_post_comment($1,$2,$3)", [
        publicPost,
        id(100),
        "Well done!",
      ]);
      assert.equal((await comments(viewer, publicPost)).length, 1);
      let c = (await comments(viewer, publicPost))[0];
      assert.equal(c.body, "Well done!");
      assert.equal(c.display_name, null);
      assert.equal(c.handle, "student_06");
      assert.equal(c.own, false);
      await denied(commenter, "select add_post_comment($1,$2,$3)", [
        publicPost,
        id(100),
        "Changed retry",
      ]);
      await denied(viewer, "select add_post_comment($1,$2,$3)", [
        publicPost,
        id(100),
        "Well done!",
      ]);
      for (const body of ["\n\t", "x".repeat(1001)])
        await denied(viewer, "select add_post_comment($1,$2,$3)", [
          publicPost,
          id(101),
          body,
        ]);
      assert.equal(
        (
          await user(viewer, "delete from comments where id=$1 returning id", [
            id(100),
          ])
        ).length,
        0,
      );
      await denied(
        viewer,
        "insert into comments(post_id,author_id,body,parent_comment_id) values($1,$2,$3,$4)",
        [publicPost, viewer, "nested", id(100)],
      );
      assert.equal((await activity(viewer, publicPost)).comment_count, 1);
    },
  );
  await t.test(
    "block rules filter counts, lists and ranking engagement and own deletion works",
    async () => {
      await user(commenter, "select set_post_kudos($1,true)", [publicPost]);
      assert.equal((await activity(viewer, publicPost)).kudos_count, 1);
      await user(
        viewer,
        "insert into blocks(blocker_id,blocked_id) values($1,$2)",
        [viewer, commenter],
      );
      assert.equal((await activity(viewer, publicPost)).kudos_count, 0);
      assert.equal((await activity(viewer, publicPost)).comment_count, 0);
      assert.equal((await comments(viewer, publicPost)).length, 0);
      const row = (await feed()).find((p) => p.id === publicPost);
      assert.equal(row.activity.kudos_count, 0);
      assert.equal(row.activity.comment_count, 0);
      await user(commenter, "delete from comments where id=$1", [id(100)]);
      assert.equal((await comments(stranger, publicPost)).length, 0);
    },
  );
  await t.test(
    "privacy changes, unfollow and deletion revoke feed, counts and comment access",
    async () => {
      await user(viewer, "delete from follows where following_id=$1", [friend]);
      assert.ok(!(await feed()).some((p) => p.id === followPost));
      assert.equal(await activity(viewer, followPost), null);
      await user(stranger, "update profiles set is_private=true");
      assert.ok(!(await feed()).some((p) => p.id === publicPost));
      assert.equal(await comments(viewer, publicPost), null);
      await user(stranger, "update profiles set is_private=false");
      await user(stranger, "select begin_post_deletion($1)", [publicPost]);
      assert.ok(!(await feed()).some((p) => p.id === publicPost));
      await denied(viewer, "select set_post_kudos($1,true)", [publicPost]);
      assert.equal(await activity(viewer, publicPost), null);
    },
  );
  await t.test(
    "feed and comment pages have deterministic tie ordering and inaccessible candidates do not crowd them out",
    async () => {
      for (let n = 200; n < 225; n++) await fixture(id(n), stranger);
      await db.query(
        "update posts set created_at=now()-interval '1 day' where author_id=$1",
        [stranger],
      );
      await db.query(
        "insert into posts(author_id,audience,publication_state,caption) select $1,'public','published','Hidden' from generate_series(1,510)",
        [hidden],
      );
      const first = (await feed()).slice(0, 20),
        second = await feed("for-you", 1);
      assert.equal(first.length, 20);
      assert.ok(second.length > 0);
      assert.ok(second.every((p) => !first.some((q) => q.id === p.id)));
      assert.ok(first.every((p) => p.author_id !== hidden));
      for (let n = 300; n < 324; n++)
        await user(viewer, "select add_post_comment($1,$2,$3)", [
          subjectPost,
          id(n),
          `Comment ${n}`,
        ]);
      await db.query("update comments set created_at=now() where post_id=$1", [
        subjectPost,
      ]);
      const a = (await comments(viewer, subjectPost)).slice(0, 20),
        b = await comments(viewer, subjectPost, 1);
      assert.equal(a.length, 20);
      assert.equal(b.length, 4);
      assert.equal(a[0].id, id(323));
      assert.ok(b.every((c) => !a.some((x) => x.id === c.id)));
      assert.equal((await activity(viewer, subjectPost)).comment_count, 24);
    },
  );
  await t.test(
    "database burst limits survive deleting comments and budget rows are inaccessible",
    async () => {
      // A fresh transaction window avoids depending on the previous pagination writes.
      await db.query(
        "delete from private.interaction_budgets where user_id=$1",
        [viewer],
      );
      for (let n = 400; n < 430; n++) {
        await user(viewer, "select add_post_comment($1,$2,$3)", [
          subjectPost,
          id(n),
          "A comment",
        ]);
        await user(viewer, "delete from comments where id=$1", [id(n)]);
      }
      await assert.rejects(
        user(viewer, "select add_post_comment($1,$2,$3)", [
          subjectPost,
          id(430),
          "One too many",
        ]),
        (e) => e.code === "P0001",
      );
      await denied(viewer, "select * from private.interaction_budgets");
    },
  );
});
