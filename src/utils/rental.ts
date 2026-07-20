export function rentalDays(start: Date, end: Date) {
  if (end <= start) throw new Error('La data fine contratto deve essere successiva alla data inizio contratto');
  const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  const diffDays = Math.floor((endDay.getTime() - startDay.getTime()) / 86400000);
  const startMinutes = start.getHours() * 60 + start.getMinutes();
  const endMinutes = end.getHours() * 60 + end.getMinutes();
  return Math.max(1, diffDays + (startMinutes < endMinutes ? 1 : 0));
}

export function computedBookingStatus(storedStatus: string, start: Date, end: Date, now = new Date()) {
  if (storedStatus === 'BOZZA' || storedStatus === 'ANNULLATA') return storedStatus;
  if (now > end) return 'CONCLUSA';
  if (now >= start && now <= end) return 'IN_CORSO';
  return 'CONFERMATA';
}
