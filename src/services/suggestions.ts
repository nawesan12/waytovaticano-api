import { db } from "../db/client";

export async function getSuggestions(coupleId: string) {
  const couple = await db.couple.findUnique({
    where: { id: coupleId },
    include: {
      members: {
        include: {
          User: {
            include: { profile: true },
          },
        },
      },
    },
  });
  const members = couple?.members ?? [];
  const favs = members.flatMap((member) => {
    const favorites = member.User?.profile?.favorites as
      | Record<string, unknown>
      | null
      | undefined;
    if (!favorites) return [] as unknown[];
    return Object.values(favorites).flatMap((value) => {
      if (Array.isArray(value)) return value;
      return value === undefined || value === null ? [] : [value];
    });
  });
  const favStrings = favs.map((value) => String(value));
  const ideas = [] as {
    title: string;
    xpReward: number;
    heartReward: number;
  }[];
  if (favStrings.some((s) => /pizza|italian/i.test(s)))
    ideas.push({ title: "Homemade pizza night", xpReward: 20, heartReward: 2 });
  if (favStrings.some((s) => /walk|park|beach/i.test(s)))
    ideas.push({ title: "Sunset walk together", xpReward: 10, heartReward: 1 });
  return ideas;
}
