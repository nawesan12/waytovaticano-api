import { db } from "../db/client";
import { addLedger } from "./ledger";

export async function confirmQuestEntry(entryId: string, confirmerId: string) {
  return await db.$transaction(async (tx) => {
    const entry = await tx.questEntry.findUnique({
      where: { id: entryId },
      include: { quest: true },
    });
    if (!entry) throw new Error("Entry not found");
    if (entry.status !== "pending") return entry; // idempotent
    const quest = entry.quest;
    const couple = await tx.couple.findUnique({
      where: { id: quest.coupleId },
      include: { members: true },
    });
    if (!couple) throw new Error("Couple not found");
    const memberIds = couple.members.map((m) => m.userId);
    if (!memberIds.includes(confirmerId) || entry.doneBy === confirmerId)
      throw new Error("Not allowed");

    const updated = await tx.questEntry.update({
      where: { id: entryId },
      data: {
        status: "confirmed",
        confirmedBy: confirmerId,
        confirmedAt: new Date(),
      },
    });
    await addLedger(
      quest.coupleId,
      "XP",
      quest.xpReward,
      `quest:${quest.id}`,
      confirmerId,
    );
    await addLedger(
      quest.coupleId,
      "HEART",
      quest.heartReward,
      `quest:${quest.id}`,
      confirmerId,
    );
    return updated;
  });
}
