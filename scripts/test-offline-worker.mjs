import { test } from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFile } from "node:fs/promises";
const source = await readFile(
  new URL("../public/sw.js", import.meta.url),
  "utf8",
);
function setup(network) {
  const listeners = {},
    added = [],
    deleted = [];
  const offline = new Response("Offline");
  const context = {
    self: {
      location: { origin: "https://study.test" },
      addEventListener: (name, fn) => (listeners[name] = fn),
      skipWaiting: async () => {},
      clients: { claim: async () => {} },
    },
    caches: {
      open: async () => ({ add: async (path) => added.push(path) }),
      keys: async () => ["studysocial-offline-v0", "unrelated-cache"],
      delete: async (key) => deleted.push(key),
      match: async () => offline,
    },
    fetch: network,
    URL,
    Response,
  };
  vm.runInNewContext(source, context);
  return { listeners, added, deleted, offline };
}
test("worker only caches the generic offline page and removes its own old caches", async () => {
  const w = setup();
  let task;
  w.listeners.install({ waitUntil: (p) => (task = p) });
  await task;
  assert.deepEqual(w.added, ["/offline.html"]);
  w.listeners.activate({ waitUntil: (p) => (task = p) });
  await task;
  assert.deepEqual(w.deleted, ["studysocial-offline-v0"]);
});
test("navigation uses live network; offline fallback never stores private responses", async () => {
  const response = new Response("Private feed");
  const w = setup(async () => response);
  let task;
  w.listeners.fetch({
    request: {
      url: "https://study.test/feed",
      mode: "navigate",
      method: "GET",
    },
    respondWith: (p) => (task = p),
  });
  assert.equal(await task, response);
  assert.deepEqual(w.added, []);
  const fail = setup(async () => {
    throw new Error("offline");
  });
  fail.listeners.fetch({
    request: {
      url: "https://study.test/feed",
      mode: "navigate",
      method: "GET",
    },
    respondWith: (p) => (task = p),
  });
  assert.equal(await task, fail.offline);
});
test("worker does not intercept uploads, auth API, photos or external navigation", () => {
  const w = setup(() => {
    throw new Error("must not fetch");
  });
  for (const request of [
    { url: "https://study.test/posts", mode: "navigate", method: "POST" },
    { url: "https://study.test/api", mode: "cors", method: "GET" },
    { url: "https://storage.test/photo", mode: "cors", method: "GET" },
    { url: "https://other.test/", mode: "navigate", method: "GET" },
  ])
    w.listeners.fetch({
      request,
      respondWith: () => assert.fail("intercepted non-navigation"),
    });
});
