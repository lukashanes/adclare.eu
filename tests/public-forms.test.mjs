import assert from "node:assert/strict";
import { test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { loadSource } from "./load-source.mjs";

const element = (type, props) => ({ type, props });
const jsx = { jsx: element, jsxs: element, Fragment: Symbol.for("react.fragment") };

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
          TurnstileField: () => null, formGuardFromForm: () => "", turnstileTokenFromForm: () => "TEST-token", resetTurnstileForm: (target) => resets.push(target),
        },
      };
      t.mock.method(globalThis, "fetch", async () => {
        if (status === "network") throw new Error("TEST-network-failure");
        return Response.json({}, { status });
      });
      const component = await loadSource(path, mocks);
      const tree = component[name](props);
      await tree.props.onSubmit({ preventDefault() {}, currentTarget: form });
      if (status === 200) {
        assert.equal(resets.length, 0);
        assert.ok(updates.some((state) => ["sent", "done", "accepted"].includes(state)));
      } else {
        assert.deepEqual(resets, [form]);
        assert.ok(updates.includes("error"));
        cursor = 0;
        const rendered = component[name](props);
        const errorBox = rendered.props.children.find((child) => child?.props?.className?.includes("border-red-200"));
        assert.ok(typeof errorBox?.props.children === "string" && errorBox.props.children.trim().length > 0);
        if (status === 429) assert.match(errorBox.props.children, /Příliš mnoho požadavků/);
      }
    });
  }
}

for (const status of ["ACCEPTED", "REVOKED", "EXPIRED"]) {
  test(`inactive ${status} invitation displays its existing message without an acceptance form`, async () => {
    const { InviteAcceptClient } = await loadSource("src/app/invite/[token]/InviteAcceptClient.tsx", {
      "@/app/TurnstileField": { TurnstileField: () => null, formGuardFromForm: () => "", resetTurnstileForm: () => {}, turnstileTokenFromForm: () => "" },
    });
    const html = renderToStaticMarkup(createElement(InviteAcceptClient, { invitation: { status, token: "TEST-token" } }));
    assert.match(html, /Tato pozvánka už není aktivní/);
    assert.doesNotMatch(html, /<form|border-red-200/);
  });
}

test("empty login email returns early without setting an empty error state", async (t) => {
  const updates = [];
  t.mock.method(globalThis, "fetch", async () => { throw new Error("No request expected"); });
  const { LoginClient } = await loadSource("src/app/login/LoginClient.tsx", {
    react: { useState: (initial) => [initial, (value) => updates.push(value)] },
    "react/jsx-runtime": jsx,
    "lucide-react": { ArrowRight: () => null, Mail: () => null },
    "@/app/TurnstileField": { TurnstileField: () => null, formGuardFromForm: () => "", resetTurnstileForm: () => {}, turnstileTokenFromForm: () => "" },
  });
  await LoginClient({}).props.onSubmit({ preventDefault() {}, currentTarget: {} });
  assert.deepEqual(updates, []);
});

for (const [path, name, props] of [
  ["src/app/login/LoginClient.tsx", "LoginClient", {}],
  ["src/app/signup/SignupClient.tsx", "SignupClient", { canCreateWorkspace: true }],
  ["src/app/invite/[token]/InviteAcceptClient.tsx", "InviteAcceptClient", { invitation: { status: "PENDING", token: "TEST" } }],
]) {
  test(name + " renders a held submission without claiming completed access", async () => {
    const component = await loadSource(path, {
      react: { useState: initial => [initial === "idle" ? "held" : initial, () => {}] },
      "next/link": { default: ({ children, ...props }) => createElement("a", props, children) },
      "@/app/TurnstileField": { TurnstileField: () => null, formGuardFromForm: () => "", resetTurnstileForm: () => {}, turnstileTokenFromForm: () => "" },
    });
    const html = renderToStaticMarkup(createElement(component[name], props));
    assert.match(html, /Podání jsme uložili ke kontrole/);
    assert.doesNotMatch(html, /Účet je připravený|Pozvánka je přijatá|dorazí přihlašovací odkaz/);
  });
}

test("the trap renders without Turnstile configuration and never uses an autofill field name", async () => {
  const { TurnstileField } = await loadSource("src/app/TurnstileField.tsx", { "next/script": { default: () => null } });
  const html = renderToStaticMarkup(createElement(TurnstileField, {}));
  assert.match(html, /name="adclare_guard"/);
  assert.match(html, /autoComplete="off"/i);
  assert.doesNotMatch(html, /name="website"/);
});
