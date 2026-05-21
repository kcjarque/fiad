export const uid = (prefix = 'id'): string =>
  `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`;

export const ticketNumber = (): string => {
  const n = Math.floor(Math.random() * 9_000_000) + 1_000_000;
  return `FIAD-${n}`;
};

export const peso = (amount: number) =>
  `₱${amount.toLocaleString('en-PH', { maximumFractionDigits: 0 })}`;

export const formatDate = (iso: string) => {
  try {
    return new Date(iso).toLocaleString('en-PH', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
};

export const todayKey = () => new Date().toISOString().slice(0, 10);
