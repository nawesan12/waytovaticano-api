import { db } from "../db/client";
export async function getSuggestions(coupleId: string) {
  const couple = await db.couple.findUnique({
    where: { id: coupleId }, //@ts-expect-error bla
    include: { members: { include: { user: { include: { profile: true } } } } },
  });
  const favs = //@ts-expect-error bla
    couple?.members.flatMap((member) => {
      const favorites = member.user.profile?.favorites;
      if (
        !favorites ||
        typeof favorites !== "object" ||
        Array.isArray(favorites)
      )
        return [];
      return Object.values(favorites as Record<string, unknown>);
    }) ?? [];
  const ideas = [] as {
    title: string;
    xpReward: number;
    heartReward: number;
  }[]; //@ts-expect-error bla
  if (favs.some((s) => /pizza|italian/i.test(String(s))))
    ideas.push({ title: "Homemade pizza night", xpReward: 20, heartReward: 2 }); //@ts-expect-error bla
  if (favs.some((s) => /walk|park|beach/i.test(String(s))))
    ideas.push({ title: "Sunset walk together", xpReward: 10, heartReward: 1 });
  return ideas;
}
