import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import sharp from "sharp";
import {
  validatePost,
  MAX_POST_IMAGE_BYTES,
} from "../src/lib/posts/validation.ts";
import { preparePostImage } from "../src/lib/posts/image.ts";
const root = new URL("../", import.meta.url);
const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const [alice, bob, carol, post, session, otherSession, active] = [
  1, 2, 3, 10, 11, 12, 13,
].map(id);
const hash = "a".repeat(64);
const payload = {
  caption: "A little progress",
  alt_text: "A notebook",
  subject_id: "",
  session_id: "",
  audience: "public",
  show_duration: false,
  manual_duration_seconds: null,
};
const form = (values) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(values)) f.set(k, String(v));
  return f;
};
test("post validation requires explicit audience and bounded opt-in duration", () => {
  const input = { post_id: post, audience: "private" };
  assert.equal(validatePost(form(input)).payload.show_duration, false);
  assert.equal(
    validatePost(form({ ...input, duration_minutes: 50 })).payload
      .manual_duration_seconds,
    null,
  );
  assert.equal(
    validatePost(form({ ...input, show_duration: "on", duration_minutes: 50 }))
      .payload.manual_duration_seconds,
    3000,
  );
  assert.equal(
    validatePost(form({ ...input, show_duration: "on", session_id: session }))
      .payload.manual_duration_seconds,
    null,
  );
  for (const extra of [
    { post_id: "bad" },
    { audience: "all" },
    { subject_id: "bad" },
    { session_id: "bad" },
    { caption: "x".repeat(2201) },
    { alt_text: "x".repeat(301) },
    { show_duration: "on", duration_minutes: 0 },
    { show_duration: "on", duration_minutes: 1441 },
    { show_duration: "on", duration_minutes: 1.5 },
  ])
    assert.ok(validatePost(form({ ...input, ...extra })).error);
});
test("post photos decode real content, strip metadata, resize and have stable retry hashes", async () => {
  const input = await sharp({
    create: { width: 2400, height: 1200, channels: 3, background: "#aabb66" },
  })
    .jpeg()
    .withMetadata({ orientation: 6 })
    .toBuffer();
  const first = await preparePostImage(input),
    second = await preparePostImage(input);
  assert.equal(first.hash, second.hash);
  assert.equal(first.hash.length, 64);
  const metadata = await sharp(first.bytes).metadata();
  assert.equal(metadata.format, "webp");
  assert.ok(metadata.width <= 2000 && metadata.height <= 2000);
  assert.equal(metadata.exif, undefined);
  assert.equal(metadata.orientation, undefined);
  for (const invalid of [
    Buffer.from("not a jpeg"),
    new Uint8Array(MAX_POST_IMAGE_BYTES + 1),
    Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"></svg>',
    ),
  ])
    await assert.rejects(preparePostImage(invalid));
  const huge = await sharp({
    create: { width: 6500, height: 6500, channels: 3, background: "white" },
  })
    .png()
    .toBuffer();
  await assert.rejects(preparePostImage(huge));
  const gif = await sharp({
    create: { width: 2, height: 4, channels: 3, background: "white" },
  })
    .gif()
    .toBuffer();
  await assert.rejects(preparePostImage(gif));
  const animated = await sharp(
    Buffer.concat([Buffer.alloc(12, 0), Buffer.alloc(12, 255)]),
    {
      raw: { width: 2, height: 4, pageHeight: 2, channels: 3 },
    },
  )
    .webp({ lossless: true })
    .toBuffer();
  assert.equal((await sharp(animated).metadata()).pages, 2);
  await assert.rejects(preparePostImage(animated));
});
test("photo lifecycle and current RLS in PostgreSQL", async (t) => {
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
      ["42501", "23514", "23505", "23503"].includes(e.code),
    );
  const prepare = (who, target, extra = {}, digest = hash) =>
    user(who, "select public.prepare_photo_post($1,$2::jsonb,$3) as result", [
      target,
      JSON.stringify({ ...payload, ...extra }),
      digest,
    ]);
  const visible = (who, table) => user(who, `select * from ${table}`);
  await db.query("insert into auth.users(id) values($1),($2),($3)", [
    alice,
    bob,
    carol,
  ]);
  await db.query(
    "insert into study_sessions(id,user_id,status,started_at,ended_at,duration_seconds,notes) values($1,$2,'completed',now()-interval '1 hour',now(),3600,'SECRET SESSION NOTES')",
    [session, alice],
  );
  await db.query(
    "insert into study_sessions(id,user_id,status,started_at,ended_at,duration_seconds) values($1,$2,'completed',now()-interval '1 hour',now(),3600)",
    [otherSession, bob],
  );
  await db.query(
    "insert into study_sessions(id,user_id,running_since) values($1,$2,now())",
    [active, alice],
  );
  let path;
  await t.test(
    "draft uses caller identity, permits exactly one image, blocks direct writes and anonymous RPCs",
    async () => {
      await denied(null, "select public.prepare_photo_post($1,$2::jsonb,$3)", [
        post,
        JSON.stringify(payload),
        hash,
      ]);
      const [{ result }] = await prepare(alice, post, { author_id: bob });
      path = result.path;
      assert.equal(result.state, "draft");
      assert.equal(path, `${alice}/${post}/${hash}.webp`);
      const rows = await visible(alice, "posts");
      assert.equal(rows[0].author_id, alice);
      assert.equal(rows[0].publication_state, "draft");
      assert.equal((await visible(bob, "posts")).length, 0);
      await denied(alice, "insert into posts(author_id) values($1)", [alice]);
      await denied(alice, "update posts set caption='bypass' where id=$1", [
        post,
      ]);
      await denied(alice, "delete from posts where id=$1", [post]);
      await denied(
        alice,
        "insert into post_media(post_id,owner_id,object_path) values($1,$2,$3)",
        [post, alice, path],
      );
      await denied(alice, "update post_media set alt_text='bypass'");
      await denied(alice, "delete from post_media");
      await assert.rejects(prepare(bob, post));
      await assert.rejects(prepare(alice, post, {}, "b".repeat(64)));
      await prepare(alice, post, { caption: "Retry saved caption" });
      assert.equal((await visible(alice, "posts")).length, 1);
      assert.equal((await visible(alice, "post_media")).length, 1);
      await assert.rejects(
        db.query(
          "insert into post_media(post_id,owner_id,object_path) values($1,$2,$3)",
          [post, alice, `${alice}/${post}/other.webp`],
        ),
        (e) => e.code === "23505",
      );
    },
  );
  await t.test(
    "duration sharing rejects foreign/incomplete sessions and stays opt-in",
    async () => {
      await assert.rejects(
        prepare(alice, post, { session_id: otherSession, show_duration: true }),
      );
      await assert.rejects(prepare(alice, post, { session_id: active }));
      await prepare(alice, post, { session_id: session, show_duration: false });
      assert.equal(
        (await visible(alice, "posts"))[0].shared_duration_seconds,
        null,
      );
      await prepare(alice, post, {
        session_id: session,
        show_duration: true,
        manual_duration_seconds: 120,
      });
      assert.equal(
        (await visible(alice, "posts"))[0].shared_duration_seconds,
        3600,
      );
      await assert.rejects(prepare(alice, id(20), { session_id: session }));
      await assert.rejects(
        prepare(alice, id(21), {
          manual_duration_seconds: -60,
          show_duration: true,
        }),
      );
    },
  );
  await t.test(
    "publish requires owned upload; draft media stays hidden even from approved followers",
    async () => {
      await denied(alice, "select publish_photo_post($1)", [post]);
      await user(bob, "select request_follow($1)", [alice]);
      await user(alice, "select accept_follow($1)", [bob]);
      await denied(
        bob,
        "insert into storage.objects(bucket_id,name,owner_id) values('post-images',$1,$2)",
        [path, bob],
      );
      await denied(
        alice,
        "insert into storage.objects(bucket_id,name,owner_id) values('post-images',$1,$2)",
        [`${alice}/${post}/unregistered.webp`, alice],
      );
      await user(
        alice,
        "insert into storage.objects(bucket_id,name,owner_id) values('post-images',$1,$2)",
        [path, alice],
      );
      assert.equal((await visible(bob, "post_media")).length, 0);
      assert.equal((await visible(bob, "storage.objects")).length, 0);
      await denied(bob, "select publish_photo_post($1)", [post]);
      await user(alice, "select publish_photo_post($1)", [post]);
      assert.equal((await visible(bob, "posts")).length, 1);
      assert.equal((await visible(bob, "storage.objects")).length, 1);
      assert.equal((await visible(carol, "posts")).length, 0);
      assert.equal((await visible(bob, "study_sessions")).length, 1); // only Bob's own session
      const rows = await visible(bob, "posts");
      assert.equal(rows[0].shared_duration_seconds, 3600);
      assert.ok(!JSON.stringify(rows).includes("SECRET SESSION NOTES"));
      await prepare(alice, post, { caption: "attempt overwrite" });
      assert.equal((await visible(alice, "posts"))[0].caption, payload.caption);
      await user(alice, "select publish_photo_post($1)", [post]);
      assert.equal((await visible(alice, "posts")).length, 1);
    },
  );
  await t.test(
    "profile privacy, removal and blocking revoke post and media access",
    async () => {
      await user(alice, "update profiles set is_private=false");
      assert.equal((await visible(carol, "posts")).length, 1);
      await user(
        alice,
        "insert into blocks(blocker_id,blocked_id) values($1,$2)",
        [alice, bob],
      );
      assert.equal((await visible(bob, "posts")).length, 0);
      assert.equal((await visible(bob, "storage.objects")).length, 0);
      await user(alice, "update profiles set is_private=true");
      assert.equal((await visible(carol, "posts")).length, 0);
      await user(carol, "select request_follow($1)", [alice]);
      await user(alice, "select accept_follow($1)", [carol]);
      assert.equal((await visible(carol, "posts")).length, 1);
      await user(carol, "delete from follows where following_id=$1", [alice]);
      assert.equal((await visible(carol, "posts")).length, 0);
    },
  );
  await t.test(
    "deletion is author-only, hides immediately and preserves cleanup state until bytes are removed",
    async () => {
      await denied(bob, "select begin_post_deletion($1)", [post]);
      await denied(bob, "select finish_post_deletion($1)", [post]);
      await user(alice, "update profiles set is_private=false");
      assert.equal((await visible(carol, "posts")).length, 1);
      assert.equal(
        (await user(alice, "select begin_post_deletion($1) as path", [post]))[0]
          .path,
        path,
      );
      assert.equal((await visible(carol, "posts")).length, 0);
      assert.equal((await visible(carol, "storage.objects")).length, 0);
      await denied(alice, "select finish_post_deletion($1)", [post]);
      assert.equal(
        (await visible(alice, "posts"))[0].publication_state,
        "deleting",
      );
      assert.equal((await visible(alice, "post_media")).length, 1);
      await assert.rejects(prepare(alice, post));
      await denied(alice, "select publish_photo_post($1)", [post]);
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
      await user(alice, "select begin_post_deletion($1)", [post]);
      await user(alice, "delete from storage.objects where name=$1", [path]);
      await denied(
        alice,
        "insert into storage.objects(bucket_id,name,owner_id) values('post-images',$1,$2)",
        [path, alice],
      );
      await user(alice, "select finish_post_deletion($1)", [post]);
      assert.equal((await visible(alice, "posts")).length, 0);
      assert.equal((await visible(alice, "post_media")).length, 0);
      await prepare(alice, id(22), { session_id: session }); // removing a post frees the session link
      await user(alice, "select begin_post_deletion($1)", [id(22)]);
      await user(alice, "select finish_post_deletion($1)", [id(22)]);
    },
  );
  await t.test(
    "explicit private and follower audiences constrain a public profile; manual duration is optional",
    async () => {
      const [{ result }] = await prepare(alice, id(23), {
        audience: "private",
        show_duration: true,
        manual_duration_seconds: 1800,
      });
      await user(
        alice,
        "insert into storage.objects(bucket_id,name,owner_id) values('post-images',$1,$2)",
        [result.path, alice],
      );
      await user(alice, "select publish_photo_post($1)", [id(23)]);
      assert.equal((await visible(carol, "posts")).length, 0);
      assert.equal(
        (await visible(alice, "posts"))[0].shared_duration_seconds,
        1800,
      );
      const [{ result: next }] = await prepare(alice, id(24), {
        audience: "followers",
      });
      await user(
        alice,
        "insert into storage.objects(bucket_id,name,owner_id) values('post-images',$1,$2)",
        [next.path, alice],
      );
      await user(alice, "select publish_photo_post($1)", [id(24)]);
      assert.equal((await visible(carol, "posts")).length, 0);
      await user(carol, "select request_follow($1)", [alice]);
      assert.equal((await visible(carol, "posts")).length, 1);
      assert.equal(
        (await visible(carol, "posts"))[0].shared_duration_seconds,
        null,
      );
    },
  );
  await t.test(
    "session handoff takes verified subject and duration, preserves manual posts and hides the internal uploader",
    async () => {
      await db.query(
        "insert into subjects(id,code,labels) values($1,'verified-subject','{}')",
        [id(80)],
      );
      await db.query("update study_sessions set subject_id=$1 where id=$2", [
        id(80),
        session,
      ]);
      await prepare(alice, id(25), {
        session_id: session,
        subject_id: id(999),
        show_duration: true,
        manual_duration_seconds: 60,
        notes: "Do not copy this",
      });
      const [linked] = await user(alice, "select * from posts where id=$1", [
        id(25),
      ]);
      assert.equal(linked.subject_id, id(80));
      assert.equal(linked.shared_duration_seconds, 3600);
      assert.ok(!JSON.stringify(linked).includes("Do not copy this"));
      await denied(
        alice,
        "select private.prepare_photo_post($1,$2::jsonb,$3)",
        [id(27), JSON.stringify(payload), hash],
      );
      await prepare(alice, id(26), {
        subject_id: id(80),
        show_duration: true,
        manual_duration_seconds: 120,
      });
      const [manual] = await user(alice, "select * from posts where id=$1", [
        id(26),
      ]);
      assert.equal(manual.shared_duration_seconds, 120);
      assert.equal(manual.session_id, null);
    },
  );
});
