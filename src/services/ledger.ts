import { db } from "../db/client";
export async function addLedger(
  coupleId: string,
  type: "XP" | "HEART" | "AFFINITY",
  amount: number,
  reason: string,
  createdBy: string,
) {
  const entry = await db.pointsLedger.create({
    data: { coupleId, type, amount, reason, createdBy },
  });
  const stats = await db.coupleStats.upsert({
    where: { coupleId },
    update: {
      xp: { increment: type === "XP" ? amount : 0 },
      hearts: { increment: type === "HEART" ? amount : 0 },
      affinity: { increment: type === "AFFINITY" ? amount : 0 },
    },
    create: {
      coupleId,
      xp: type === "XP" ? amount : 0,
      hearts: type === "HEART" ? amount : 0,
      affinity: type === "AFFINITY" ? amount : 0,
    },
  });
  return { entry, stats };
}
