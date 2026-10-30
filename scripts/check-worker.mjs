import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
try {
  const job = await db.collectionJob.findFirst({
    orderBy: { startedAt: "desc" },
  });
  const stale =
    !job ||
    Date.now() - job.heartbeatAt.getTime() >
      Number(process.env.WORKER_STALE_MINUTES || 30) * 60000;
  if (stale) {
    console.error("Worker heartbeat is stale");
    process.exitCode = 1;
  } else console.log("Worker heartbeat is current");
} catch {
  console.error("Worker health could not be checked");
  process.exitCode = 1;
} finally {
  await db.$disconnect();
}
