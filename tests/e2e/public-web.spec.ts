import { expect, test } from "@playwright/test";
import { expectNoHorizontalOverflow } from "./helpers";

test.describe("public web release smoke", () => {
  for (const path of ["/cs", "/en", "/cs/privacy", "/cs/terms", "/cs/cookies", "/cs/dpa", "/cs/security", "/cs/subprocessors", "/cs/help"]) {
    test(`renders ${path}`, async ({ page }) => {
      const response = await page.goto(path);
      expect(response?.ok()).toBeTruthy();
      await expect(page.locator("body")).not.toBeEmpty();
      await expect(page.locator("body")).toContainText(/Adclare|TTPA|politick/i);
      await expect(page.locator("body")).not.toContainText(/Hetzner VPS|Next\.js|admin demo|demo admin/i);
      await expectNoHorizontalOverflow(page);
    });
  }

  test("exposes production metadata and security headers", async ({ page }) => {
    const response = await page.goto("/cs");
    expect(response?.headers()["x-frame-options"]).toBe("DENY");
    expect(response?.headers()["content-security-policy"]).toContain("frame-ancestors 'none'");
    await expect(page.locator("body")).toContainText("Nástroj pro TTPA, nařízení (EU) 2024/900");
    await expect(page.locator("body")).toContainText("support@adclare.eu");
  });

  test("robots and sitemap are reachable", async ({ request }) => {
    const robots = await request.get("/robots.txt");
    expect(robots.ok()).toBeTruthy();
    await expect.poll(() => robots.text()).toContain("Sitemap");

    const sitemap = await request.get("/sitemap.xml");
    expect(sitemap.ok()).toBeTruthy();
    await expect.poll(() => sitemap.text()).toContain("/cs");
  });
});
