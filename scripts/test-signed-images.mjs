import { test } from "node:test";
import assert from "node:assert/strict";
import { signedPostImages } from "../src/lib/posts/signed-images.ts";
function client(result) {
  const calls = [];
  return {
    calls,
    storage: {
      from(bucket) {
        assert.equal(bucket, "post-images");
        return {
          async createSignedUrls(paths, expiry) {
            calls.push({ paths, expiry });
            return result;
          },
        };
      },
    },
  };
}
test("batch signing deduplicates paths, maps by path and excludes denied or unrelated results", async () => {
  const c = client({
    error: null,
    data: [
      { path: "b", signedUrl: "url-b", error: null },
      { path: "denied", signedUrl: "bad", error: "Forbidden" },
      { path: "unrequested", signedUrl: "unexpected", error: null },
      { path: "a", signedUrl: "url-a", error: null },
    ],
  });
  const urls = await signedPostImages(c, [
    "a",
    null,
    "b",
    "a",
    "denied",
    "missing",
  ]);
  assert.deepEqual(c.calls, [
    { paths: ["a", "b", "denied", "missing"], expiry: 60 },
  ]);
  assert.deepEqual(
    [...urls],
    [
      ["b", "url-b"],
      ["a", "url-a"],
    ],
  );
});
test("no images makes no request; batch failure leaves images unavailable", async () => {
  const c = client({ error: new Error("Unavailable"), data: null });
  assert.equal((await signedPostImages(c, [null, undefined])).size, 0);
  assert.equal(c.calls.length, 0);
  assert.equal((await signedPostImages(c, ["a"])).size, 0);
});
