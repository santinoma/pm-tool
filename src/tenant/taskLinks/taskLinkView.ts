export interface RawTaskLink {
  id: string;
  sourceTaskId: string;
  targetTaskId: string;
}

export interface LinkedTaskView {
  linkId: string;
  taskId: string;
}

/**
 * Bildet aus rohen TaskLink-Zeilen (die den gegebenen Task in einer der beiden
 * Spalten enthalten können) eine einheitliche Liste "der jeweils andere Task"
 * — unabhängig davon, ob dieser Task als source oder target gespeichert wurde.
 */
export function resolveLinkedTasks(links: RawTaskLink[], forTaskId: string): LinkedTaskView[] {
  return links.map((link) => ({
    linkId: link.id,
    taskId: link.sourceTaskId === forTaskId ? link.targetTaskId : link.sourceTaskId,
  }));
}
