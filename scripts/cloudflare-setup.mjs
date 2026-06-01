#!/usr/bin/env node

const token = process.env.CLOUDFLARE_API_TOKEN;
const zoneName = process.env.CF_ZONE_NAME;
const originIpv4 = process.env.ORIGIN_IPV4;
const sslMode = process.env.CF_SSL_MODE || "strict";
const setupEmailRouting = process.env.SETUP_EMAIL_ROUTING === "1";
const destinationEmail = process.env.EMAIL_DESTINATION;
const emailAliases = (process.env.EMAIL_ALIASES || "hello,support,security")
  .split(",")
  .map((alias) => alias.trim())
  .filter(Boolean);
const createTurnstile = process.env.CREATE_TURNSTILE === "1";
const turnstileWidgetName = process.env.TURNSTILE_WIDGET_NAME || "Adclare self-hosted";

if (!token) {
  fail("CLOUDFLARE_API_TOKEN is not set.");
}
if (!zoneName) {
  fail("CF_ZONE_NAME is not set.");
}
if (!originIpv4) {
  fail("ORIGIN_IPV4 is not set.");
}

async function main() {
  log("Verifying token");
  await api("/user/tokens/verify");

  log(`Finding zone ${zoneName}`);
  const zones = await api(`/zones?name=${encodeURIComponent(zoneName)}`);
  const zone = zones.result?.[0];
  if (!zone) {
    fail(`Zone ${zoneName} was not found for this token.`);
  }

  log(`Zone id: ${zone.id}`);
  log(`Account id: ${zone.account?.id || "(not returned)"}`);

  await upsertARecord(zone.id, zoneName, originIpv4);
  await upsertARecord(zone.id, `www.${zoneName}`, originIpv4);

  await setZoneSetting(zone.id, "ssl", sslMode);
  await setZoneSetting(zone.id, "always_use_https", "on");
  await setZoneSetting(zone.id, "automatic_https_rewrites", "on");

  if (setupEmailRouting) {
    if (!destinationEmail) {
      fail("SETUP_EMAIL_ROUTING=1 requires EMAIL_DESTINATION.");
    }
    if (!zone.account?.id) {
      fail("Email Routing setup requires account id, but Cloudflare did not return one for the zone.");
    }
    await setupRouting(zone.id, zone.account.id);
  } else {
    log("Skipping Email Routing. Set SETUP_EMAIL_ROUTING=1 and EMAIL_DESTINATION to enable it.");
  }

  if (createTurnstile) {
    if (!zone.account?.id) {
      fail("Turnstile setup requires account id, but Cloudflare did not return one for the zone.");
    }
    await ensureTurnstileWidget(zone.account.id);
  } else {
    log("Skipping Turnstile. Set CREATE_TURNSTILE=1 to create/update a widget.");
  }

  log("Cloudflare setup finished");
}

async function upsertARecord(zoneId, name, content) {
  const existing = await api(
    `/zones/${zoneId}/dns_records?type=A&name=${encodeURIComponent(name)}`,
  );
  const body = {
    type: "A",
    name,
    content,
    ttl: 1,
    proxied: true,
  };

  if (existing.result?.[0]) {
    const record = existing.result[0];
    log(`Updating DNS A ${name} -> ${content} proxied`);
    await api(`/zones/${zoneId}/dns_records/${record.id}`, {
      method: "PUT",
      body,
    });
  } else {
    log(`Creating DNS A ${name} -> ${content} proxied`);
    await api(`/zones/${zoneId}/dns_records`, {
      method: "POST",
      body,
    });
  }
}

async function setZoneSetting(zoneId, setting, value) {
  log(`Setting ${setting}=${value}`);
  await api(`/zones/${zoneId}/settings/${setting}`, {
    method: "PATCH",
    body: { value },
    tolerate: true,
  });
}

async function setupRouting(zoneId, accountId) {
  log("Enabling Email Routing DNS");
  await api(`/zones/${zoneId}/email/routing/dns`, {
    method: "POST",
    tolerate: true,
  });

  log(`Ensuring destination address ${destinationEmail}`);
  const addresses = await api(`/accounts/${accountId}/email/routing/addresses`);
  const existingAddress = addresses.result?.find((address) => address.email === destinationEmail);
  if (!existingAddress) {
    await api(`/accounts/${accountId}/email/routing/addresses`, {
      method: "POST",
      body: { email: destinationEmail },
      tolerate: true,
    });
    log("Cloudflare will send a verification email to the destination address.");
  } else if (!existingAddress.verified) {
    log("Destination address exists but is not verified yet.");
  } else {
    log("Destination address is already verified.");
  }

  const rules = await api(`/zones/${zoneId}/email/routing/rules`);

  for (const alias of emailAliases) {
    const customAddress = `${alias}@${zoneName}`;
    const existingRule = rules.result?.find((rule) =>
      rule.matchers?.some((matcher) => matcher.field === "to" && matcher.value === customAddress),
    );
    const body = {
      name: customAddress,
      enabled: true,
      matchers: [{ type: "literal", field: "to", value: customAddress }],
      actions: [{ type: "forward", value: [destinationEmail] }],
    };

    if (existingRule) {
      log(`Updating Email Routing rule ${customAddress}`);
      await api(`/zones/${zoneId}/email/routing/rules/${existingRule.id}`, {
        method: "PUT",
        body,
        tolerate: true,
      });
    } else {
      log(`Creating Email Routing rule ${customAddress}`);
      await api(`/zones/${zoneId}/email/routing/rules`, {
        method: "POST",
        body,
        tolerate: true,
      });
    }
  }
}

async function ensureTurnstileWidget(accountId) {
  log("Checking Turnstile widgets");
  const widgets = await api(`/accounts/${accountId}/challenges/widgets`);
  const domains = [zoneName, `www.${zoneName}`];
  const existing = widgets.result?.find((widget) => widget.name === turnstileWidgetName);

  if (existing) {
    log(`Updating Turnstile widget ${turnstileWidgetName}`);
    await api(`/accounts/${accountId}/challenges/widgets/${existing.sitekey}`, {
      method: "PUT",
      body: {
        name: turnstileWidgetName,
        domains,
        mode: "managed",
      },
    });
    log(`Turnstile sitekey: ${existing.sitekey}`);
  } else {
    log(`Creating Turnstile widget ${turnstileWidgetName}`);
    const created = await api(`/accounts/${accountId}/challenges/widgets`, {
      method: "POST",
      body: {
        name: turnstileWidgetName,
        domains,
        mode: "managed",
      },
    });
    log(`Turnstile sitekey: ${created.result?.sitekey || "(not returned)"}`);
  }
}

async function api(path, options = {}) {
  const response = await fetch(`https://api.cloudflare.com/client/v4${path}`, {
    method: options.method || "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const json = await response.json().catch(() => ({}));

  if (!response.ok || json.success === false) {
    const message = json.errors?.map((error) => error.message).join("; ") || response.statusText;
    if (options.tolerate) {
      warn(`${options.method || "GET"} ${path}: ${message}`);
      return json;
    }
    fail(`${options.method || "GET"} ${path}: ${message}`);
  }

  return json;
}

function log(message) {
  console.log(`✓ ${message}`);
}

function warn(message) {
  console.warn(`! ${message}`);
}

function fail(message) {
  console.error(`✗ ${message}`);
  process.exit(1);
}

main().catch((error) => fail(error.message));
