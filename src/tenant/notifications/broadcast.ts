const BROADCAST_PATTERN = /(?<![\w@.-])@channel(?![\w.-])/;

export function hasBroadcastMention(text: string): boolean {
  return BROADCAST_PATTERN.test(text);
}
