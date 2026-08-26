export interface RetainerTimeEntry {
  budgetSectionId: string;
  durationMinutes: number;
}

export interface RetainerSection {
  id: string;
  name: string;
  quantity: number;
}

export interface SectionBurn {
  sectionId: string;
  sectionName: string;
  periodQuantityHours: number;
  usedHours: number;
  remainingHours: number;
  usagePercent: number;
}

export function computeSectionBurn(
  sections: RetainerSection[],
  entriesInPeriod: RetainerTimeEntry[],
): SectionBurn[] {
  const usedBySection = new Map<string, number>();
  for (const entry of entriesInPeriod) {
    usedBySection.set(
      entry.budgetSectionId,
      (usedBySection.get(entry.budgetSectionId) ?? 0) + entry.durationMinutes / 60,
    );
  }

  return sections.map((section) => {
    const usedHours = usedBySection.get(section.id) ?? 0;
    const remainingHours = section.quantity - usedHours;
    const usagePercent = section.quantity > 0 ? (usedHours / section.quantity) * 100 : 0;
    return {
      sectionId: section.id,
      sectionName: section.name,
      periodQuantityHours: section.quantity,
      usedHours,
      remainingHours,
      usagePercent,
    };
  });
}
