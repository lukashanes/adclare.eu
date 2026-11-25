import assert from "node:assert/strict";
import { test } from "node:test";
import { loadSource } from "./load-source.mjs";

const element = (type, props) => ({ type, props });
const jsx = { jsx: element, jsxs: element };

test("Turnstile reset targets only the submitted form and tolerates an unready widget", async (t) => {
  const previous = globalThis.window;
  t.after(() => { if (previous === undefined) delete globalThis.window; else globalThis.window = previous; });
  const widget = {};
  const resets = [];
  globalThis.window = { turnstile: { reset: (target) => resets.push(target) } };
  const field = await loadSource("src/app/TurnstileField.tsx", {
    "next/script": { default: () => null }, "react/jsx-runtime": jsx,
  });
  field.resetTurnstileForm({ querySelector: () => widget });
  assert.deepEqual(resets, [widget]);
  globalThis.window.turnstile = undefined;
  assert.doesNotThrow(() => field.resetTurnstileForm({ querySelector: () => null }));
});

for (const [path, name, props] of [
  ["src/app/login/LoginClient.tsx", "LoginClient", { defaultEmail: "TEST@example.invalid" }],
  ["src/app/signup/SignupClient.tsx", "SignupClient", { canCreateWorkspace: true }],
  ["src/app/invite/[token]/InviteAcceptClient.tsx", "InviteAcceptClient", { invitation: { status: "PENDING", token: "TEST-token" } }],
]) {
  for (const status of [200, 403, 429, "network"]) {
    test(`${name} handles ${status} and refreshes a consumed challenge after failure`, async (t) => {
      const updates = [];
      const resets = [];
      const form = {};
      const states = [];
      let cursor = 0;
      const mocks = {
        react: { useState: (initial) => {
          const index = cursor++;
          if (!(index in states)) states[index] = initial;
          return [states[index], (value) => { states[index] = value; updates.push(value); }];
        } },
        "react/jsx-runtime": jsx, "next/link": { default: () => null },
        "lucide-react": Object.fromEntries(["ArrowRight", "Mail", "CheckCircle2", "Loader2", "CircleAlert", "UserPlus"].map((name) => [name, () => null])),
        "@/app/TurnstileField": {
          TurnstileField: () => null, turnstileTokenFromForm: () => "TEST-token", resetTurnstileForm: (target) => resets.push(target),
        },
      };
      t.mock.method(globalThis, "fetch", async () => {
        if (status === "network") throw new Error("TEST-network-failure");
        return Response.json({}, { status });
      });
      const module = await loadSource(path, mocks);
      const tree = module[name](props);
      await tree.props.onSubmit({ preventDefault() {}, currentTarget: form });
      if (status === 200) {
        assert.equal(resets.length, 0);
        assert.ok(updates.some((state) => ["sent", "done", "accepted"].includes(state)));
      } else {
        assert.deepEqual(resets, [form]);
        assert.ok(updates.includes("error"));
        if (status === 429) {
          cursor = 0;
          assert.match(JSON.stringify(module[name](props)), /Příliš mnoho požadavků/);
        }
      }
    });
  }
}
