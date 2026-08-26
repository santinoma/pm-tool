export type PreferenceLevel = "all" | "mentions" | "off";

export function shouldNotify(
  level: PreferenceLevel,
  isActor: boolean,
  isIndividuallyMentioned: boolean,
  isBroadcastMentioned: boolean,
): boolean {
  if (isActor) return false;
  if (level === "off") return false;
  if (level === "all") return true;
  return isIndividuallyMentioned || isBroadcastMentioned;
}
