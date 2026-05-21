import { useEffect, useState } from 'react';

export type CountdownParts = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalMs: number;
  done: boolean;
};

const calc = (target: number): CountdownParts => {
  const now = Date.now();
  const diff = Math.max(0, target - now);
  const days = Math.floor(diff / 86_400_000);
  const hours = Math.floor((diff % 86_400_000) / 3_600_000);
  const minutes = Math.floor((diff % 3_600_000) / 60_000);
  const seconds = Math.floor((diff % 60_000) / 1000);
  return { days, hours, minutes, seconds, totalMs: diff, done: diff === 0 };
};

export function useCountdown(targetIso: string | number | Date | null | undefined): CountdownParts {
  const target = targetIso ? new Date(targetIso).getTime() : 0;
  const [parts, setParts] = useState<CountdownParts>(() => calc(target));
  useEffect(() => {
    if (!target) return;
    setParts(calc(target));
    const id = window.setInterval(() => setParts(calc(target)), 1000);
    return () => window.clearInterval(id);
  }, [target]);
  return parts;
}

export const formatCountdown = (p: CountdownParts): string => {
  if (p.done) return 'Starting now';
  if (p.days > 0) return `${p.days}d ${p.hours}h ${p.minutes}m`;
  if (p.hours > 0) return `${p.hours}h ${p.minutes}m`;
  return `${p.minutes}m ${String(p.seconds).padStart(2, '0')}s`;
};
