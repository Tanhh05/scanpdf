export function startOfDay(date = new Date()) {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

export function endOfDay(date = new Date()) {
  const value = new Date(date);
  value.setHours(23, 59, 59, 999);
  return value;
}

export function addDays(days: number, date = new Date()) {
  const value = new Date(date);
  value.setDate(value.getDate() + days);
  return value;
}
