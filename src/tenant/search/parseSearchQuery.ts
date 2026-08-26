export type StatusCategoryFilter = "not_started" | "started" | "done";

export interface ParsedSearchQuery {
  statusCategory?: StatusCategoryFilter;
  assignee?: string;
  project?: string;
  freeText: string;
  hasModifiers: boolean;
}

const MODIFIER_PATTERN = /(status|assignee|project):(?:"([^"]+)"|(\S+))/gi;

const STATUS_SYNONYMS: Record<string, StatusCategoryFilter> = {
  not_started: "not_started",
  todo: "not_started",
  open: "not_started",
  new: "not_started",
  backlog: "not_started",
  started: "started",
  in_progress: "started",
  doing: "started",
  active: "started",
  done: "done",
  closed: "done",
  complete: "done",
  completed: "done",
};

function normalizeStatus(value: string): StatusCategoryFilter | undefined {
  return STATUS_SYNONYMS[value.toLowerCase()];
}

export function parseSearchQuery(raw: string): ParsedSearchQuery {
  const result: ParsedSearchQuery = { freeText: "", hasModifiers: false };

  const remaining = raw.replace(MODIFIER_PATTERN, (_match, key: string, quoted?: string, unquoted?: string) => {
    const value = quoted ?? unquoted ?? "";
    const normalizedKey = key.toLowerCase();
    if (normalizedKey === "status") {
      const status = normalizeStatus(value);
      if (status) {
        result.statusCategory = status;
        result.hasModifiers = true;
      }
    } else if (normalizedKey === "assignee" && value) {
      result.assignee = value;
      result.hasModifiers = true;
    } else if (normalizedKey === "project" && value) {
      result.project = value;
      result.hasModifiers = true;
    }
    return "";
  });

  result.freeText = remaining.replace(/\s+/g, " ").trim();
  return result;
}
