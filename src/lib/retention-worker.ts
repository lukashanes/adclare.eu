import { RETENTION_INTERVAL_MS } from "@/lib/retention-policy";

export async function runRetentionWorker(
  cleanup: () => Promise<unknown>,
  wait: (milliseconds: number) => Promise<void>,
  report: (ok: boolean) => void,
  repeat: boolean,
) {
  do {
    try {
      await cleanup();
      report(true);
    } catch {
      // Database errors may contain personal data or connection credentials.
      report(false);
      if (!repeat) throw new Error("Personal data cleanup failed.");
    }
    if (repeat) await wait(RETENTION_INTERVAL_MS);
  } while (repeat);
}
