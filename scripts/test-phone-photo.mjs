import { test } from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import ts from "typescript";
import { readFile } from "node:fs/promises";
import { MAX_POST_IMAGE_BYTES } from "../src/lib/posts/validation.ts";
const source = await readFile(
  new URL("../src/lib/posts/prepare-photo.ts", import.meta.url),
  "utf8",
);
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
function setup({
  width = 4000,
  height = 3000,
  blob = new Blob(["compressed"], { type: "image/jpeg" }),
  contextAvailable = true,
} = {}) {
  let closed = false,
    decoded = false;
  const canvas = {
    width: 0,
    height: 0,
    getContext: () =>
      contextAvailable ? { fillRect() {}, drawImage() {} } : null,
    toBlob: (callback) => callback(blob),
  };
  const context = {
    exports: {},
    require: () => ({ MAX_POST_IMAGE_BYTES }),
    File,
    Blob,
    createImageBitmap: async () => {
      decoded = true;
      return {
        width,
        height,
        close() {
          closed = true;
        },
      };
    },
    document: { createElement: () => canvas },
  };
  vm.runInNewContext(compiled, context);
  return {
    prepare: context.exports.preparePhoto,
    canvas,
    closed: () => closed,
    decoded: () => decoded,
  };
}
test("phone photo validation rejects unsupported and oversized files before decoding", async () => {
  const s = setup();
  await assert.rejects(
    s.prepare(new File(["x"], "x.heic", { type: "image/heic" })),
    /JPEG/,
  );
  await assert.rejects(
    s.prepare(
      new File([new Uint8Array(21 * 1024 * 1024)], "large.jpg", {
        type: "image/jpeg",
      }),
    ),
    /20 MB/,
  );
  assert.equal(s.decoded(), false);
  const small = new File(["small"], "photo.png", { type: "image/png" });
  assert.equal(await s.prepare(small), small);
});
test("large phone photos keep their aspect ratio and become a bounded JPEG", async () => {
  const s = setup();
  const output = await s.prepare(
    new File([new Uint8Array(4 * 1024 * 1024)], "photo.png", {
      type: "image/png",
    }),
  );
  assert.equal(s.canvas.width, 2048);
  assert.equal(s.canvas.height, 1536);
  assert.equal(output.type, "image/jpeg");
  assert.ok(output.size < MAX_POST_IMAGE_BYTES);
  assert.equal(s.closed(), true);
});
test("failed conversion and excessive decoded dimensions release bitmap memory", async () => {
  for (const options of [
    { width: 10000, height: 10000 },
    { contextAvailable: false },
    { blob: null },
    { blob: new Blob([new Uint8Array(4 * 1024 * 1024)]) },
  ]) {
    const s = setup(options);
    await assert.rejects(
      s.prepare(
        new File([new Uint8Array(4 * 1024 * 1024)], "photo.jpg", {
          type: "image/jpeg",
        }),
      ),
    );
    assert.equal(s.closed(), true);
  }
});

test("avatar preparation resizes even a small file and obeys its smaller output limit", async () => {
  const s = setup({ width: 4032, height: 3024 });
  const photo = new File(["small"], "avatar.jpg", { type: "image/jpeg" });
  await s.prepare(photo, {
    maxBytes: 1024 * 1024,
    longEdge: 768,
    alwaysResize: true,
  });
  assert.equal(s.canvas.width, 768);
  assert.equal(s.canvas.height, 576);
  assert.equal(s.closed(), true);
  const oversized = setup({
    blob: new Blob([new Uint8Array(2 * 1024 * 1024)]),
  });
  await assert.rejects(
    oversized.prepare(photo, {
      maxBytes: 1024 * 1024,
      longEdge: 768,
      alwaysResize: true,
    }),
  );
});
