export function countBusinessDays(startDate: Date, endDate: Date): number {
  let count = 0;
  const cursor = new Date(startDate);
  cursor.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);

  while (cursor.getTime() <= end.getTime()) {
    const day = cursor.getDay();
    if (day !== 0 && day !== 6) {
      count += 1;
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return count;
}

export function computeCreditedHours(businessDays: number, weeklyCapacityHours: number): number {
  return businessDays * (weeklyCapacityHours / 5);
}
