import { test } from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { readFile, readdir } from "node:fs/promises";
const root = new URL("../", import.meta.url),
  id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
test("notifications, blocks and reports enforce recipient and content safety", async (t) => {
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
    post = id(10);
  for (const [uid, handle] of [
    [alice, "alice"],
    [bob, "bob"],
    [carol, "carol"],
  ]) {
    await db.query("insert into auth.users(id) values($1)", [uid]);
    await db.query(
      "update profiles set handle=$1,display_name=$2 where id=$3",
      [handle, "Private display " + handle, uid],
    );
  }
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
  const denied = (p) =>
    assert.rejects(p, (e) => ["42501", "23514", "23503"].includes(e.code));
  await t.test(
    "request/accept/follow notifications go to the correct parties with private actor identity and deduplication",
    async () => {
      await denied(rpc(null, "notification_inbox"));
      await rpc(bob, "request_follow", [alice]);
      await rpc(bob, "request_follow", [alice]);
      let inbox = await rpc(alice, "notification_inbox");
      assert.equal(inbox.length, 1);
      assert.equal(inbox[0].kind, "follow_request");
      assert.equal(inbox[0].display_name, null);
      assert.equal(inbox[0].handle, "bob");
      assert.equal((await rpc(carol, "notification_inbox")).length, 0);
      await rpc(alice, "accept_follow", [bob]);
      inbox = await rpc(alice, "notification_inbox");
      assert.equal(inbox.length, 1);
      assert.equal(inbox[0].kind, "follow");
      assert.equal(
        (await rpc(bob, "notification_inbox"))[0].kind,
        "follow_accepted",
      );
      await rpc(bob, "request_follow", [alice]);
      assert.equal((await rpc(alice, "notification_inbox")).length, 1);
      const nid = inbox[0].id;
      assert.equal(
        (
          await user(
            bob,
            "update notifications set read_at=now() where id=$1 returning id",
            [nid],
          )
        ).length,
        0,
      );
      await user(alice, "update notifications set read_at=now() where id=$1", [
        nid,
      ]);
      assert.ok((await rpc(alice, "notification_inbox"))[0].read_at);
      await denied(
        user(
          bob,
          "insert into notifications(recipient_id,actor_id,kind,event_key) values($1,$2,'follow','forged')",
          [alice, bob],
        ),
      );
    },
  );
  await t.test(
    "kudos/comments notify once, self events are omitted and removed content cannot linger",
    async () => {
      await db.query(
        "insert into posts(id,author_id,audience,publication_state) values($1,$2,'public','published')",
        [post, alice],
      );
      await rpc(bob, "set_post_kudos", [post, true]);
      await rpc(bob, "set_post_kudos", [post, true]);
      assert.equal(
        (await rpc(alice, "notification_inbox")).filter(
          (n) => n.kind === "kudos",
        ).length,
        1,
      );
      await rpc(alice, "set_post_kudos", [post, true]);
      assert.equal(
        (await rpc(alice, "notification_inbox")).filter(
          (n) => n.kind === "kudos",
        ).length,
        1,
      );
      await rpc(bob, "add_post_comment", [post, id(11), "Hello"]);
      await rpc(bob, "add_post_comment", [post, id(11), "Hello"]);
      assert.equal(
        (await rpc(alice, "notification_inbox")).filter(
          (n) => n.kind === "comment",
        ).length,
        1,
      );
      await user(bob, "delete from comments where id=$1", [id(11)]);
      assert.equal(
        (await rpc(alice, "notification_inbox")).filter(
          (n) => n.kind === "comment",
        ).length,
        0,
      );
      await rpc(bob, "set_post_kudos", [post, false]);
      assert.equal(
        (await rpc(alice, "notification_inbox")).filter(
          (n) => n.kind === "kudos",
        ).length,
        0,
      );
    },
  );
  await t.test(
    "reports cover private identity stubs, validate ownership and remain unreadable even to reporters",
    async () => {
      await rpc(carol, "submit_safety_report", [
        id(20),
        bob,
        null,
        "impersonation",
        "Concern",
      ]);
      await rpc(carol, "submit_safety_report", [
        id(20),
        bob,
        null,
        "impersonation",
        "Concern",
      ]);
      assert.equal((await db.query("select id from reports")).rows.length, 1);
      assert.equal((await user(carol, "select * from reports")).length, 0);
      assert.equal((await user(bob, "select * from reports")).length, 0);
      await denied(
        rpc(alice, "submit_safety_report", [
          id(20),
          bob,
          null,
          "impersonation",
          "Concern",
        ]),
      );
      await denied(
        rpc(carol, "submit_safety_report", [id(21), null, post, "spam", ""]),
      );
      await denied(
        rpc(carol, "submit_safety_report", [id(22), bob, null, "invalid", ""]),
      );
      await denied(
        rpc(carol, "submit_safety_report", [id(22), bob, post, "spam", ""]),
      );
      await denied(
        rpc(null, "submit_safety_report", [id(22), bob, null, "spam", ""]),
      );
      await rpc(bob, "submit_safety_report", [
        id(23),
        null,
        post,
        "harassment",
        "Post concern",
      ]);
      await denied(user(bob, "update reports set status='resolved'"));
    },
  );
  await t.test(
    "blocking removes connections and notifications, suppresses visibility both ways and supports safe unblocking",
    async () => {
      await rpc(bob, "set_post_kudos", [post, true]);
      await rpc(alice, "set_account_block", [bob, true]);
      await rpc(alice, "set_account_block", [bob, true]);
      assert.equal((await rpc(alice, "notification_inbox")).length, 0);
      assert.equal((await rpc(bob, "notification_inbox")).length, 0);
      assert.equal((await user(bob, "select * from follows")).length, 0);
      await denied(rpc(bob, "request_follow", [alice]));
      await denied(rpc(bob, "set_post_kudos", [post, true]));
      await denied(
        rpc(bob, "submit_safety_report", [id(24), alice, null, "spam", ""]),
      );
      assert.equal(await rpc(bob, "social_profile", ["alice"]), null);
      assert.equal(await rpc(alice, "social_profile", ["bob"]), null);
      const blocked = await rpc(alice, "blocked_accounts");
      assert.deepEqual(blocked, [{ id: bob, handle: "bob" }]);
      assert.equal((await rpc(bob, "blocked_accounts")).length, 0);
      await rpc(alice, "set_account_block", [bob, false]);
      assert.equal((await rpc(alice, "blocked_accounts")).length, 0);
      assert.equal((await user(bob, "select * from follows")).length, 0);
      assert.equal((await rpc(alice, "notification_inbox")).length, 0);
    },
  );
});
