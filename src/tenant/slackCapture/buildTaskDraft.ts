export interface SlackCapturePayload {
  text: string;
  userName: string;
  channelName: string;
  permalink: string;
}

export interface TaskDraft {
  title: string;
  description: string;
  externalSourceUrl: string;
}

const MAX_TITLE_LENGTH = 120;

export function buildTaskDraft(payload: SlackCapturePayload): TaskDraft {
  const firstLine = payload.text.split("\n")[0]?.trim() || "Slack-Ask";
  const title = firstLine.length > MAX_TITLE_LENGTH ? `${firstLine.slice(0, MAX_TITLE_LENGTH - 1)}…` : firstLine;

  const description = [
    payload.text.trim(),
    "",
    `Quelle: Slack (#${payload.channelName}), von @${payload.userName}`,
    payload.permalink,
  ].join("\n");

  return { title, description, externalSourceUrl: payload.permalink };
}
