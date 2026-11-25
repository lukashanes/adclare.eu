import { setTimeout } from "node:timers/promises";
import { cleanupPersonalData } from "../src/lib/data-retention";
import { prisma } from "../src/lib/prisma";
import { runRetentionWorker } from "../src/lib/retention-worker";

try {
  await runRetentionWorker(
    cleanupPersonalData,
    setTimeout,
    (ok) => console[ok ? "info" : "error"](`[retention] ${ok ? "Cleanup completed." : "Cleanup failed; check database availability and migrations."}`),
    process.argv.includes("--watch"),
  );
} catch {
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
