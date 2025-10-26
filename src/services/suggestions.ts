import { db } from "../db/client";
export async function getSuggestions(coupleId: string) {
  const couple = await db.couple.findUnique({
    where: { id: coupleId },
    include: { members: { include: { User: { include: { profile: true } } } } },
  });
  const favValues =
    couple?.members.flatMap((member) => {
      const favorites = member.User.profile?.favorites as
        | Record<string, unknown>
        | undefined
        | null;
      if (!favorites) return [];
      return Object.values(favorites).flatMap((value) =>
        Array.isArray(value) ? value : [value],
      );
    }) ?? [];
  const favs = favValues.map((value) => String(value ?? ""));
  const ideas = [] as {
    title: string;
    xpReward: number;
    heartReward: number;
  }[];
  if (favs.some((s) => /pizza|italian/i.test(s)))
    ideas.push({ title: "Homemade pizza night", xpReward: 20, heartReward: 2 });
  if (favs.some((s) => /walk|park|beach/i.test(s)))
    ideas.push({ title: "Sunset walk together", xpReward: 10, heartReward: 1 });
  return ideas;
}
