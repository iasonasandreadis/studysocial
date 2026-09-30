import { test } from "node:test";
import assert from "node:assert/strict";
import {
  enabledProviders,
  isSocialProvider,
} from "../src/lib/auth/providers.ts";
test("social sign-in only accepts the supported provider names", () => {
  for (const value of [null, "github", "https://evil.example", "Apple", {}])
    assert.equal(isSocialProvider(value), false);
  assert.equal(isSocialProvider("apple"), true);
  assert.equal(isSocialProvider("google"), true);
});
test("only enabled providers are offered, Apple first; malformed settings fail closed", () => {
  assert.deepEqual(
    enabledProviders({ external: { apple: true, google: true, github: true } }),
    ["apple", "google"],
  );
  assert.deepEqual(
    enabledProviders({ external: { apple: false, google: true } }),
    ["google"],
  );
  for (const settings of [
    null,
    {},
    { external: null },
    { external: { apple: "true", google: 1 } },
  ])
    assert.deepEqual(enabledProviders(settings), []);
});
