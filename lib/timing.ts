/**
 * Lightweight timing log utility for development and query performance monitoring.
 * Logs execution duration in dev mode and returns the measured duration in milliseconds.
 */

export interface TimingResult<T> {
  data: T;
  durationMs: number;
}

export async function measureTiming<T>(
  label: string,
  fn: () => Promise<T>
): Promise<TimingResult<T>> {
  const start = performance.now();
  const data = await fn();
  const durationMs = Math.round((performance.now() - start) * 100) / 100;

  if (process.env.NODE_ENV !== "production") {
    console.log(`[Timing] ${label}: ${durationMs}ms`);
  }

  return { data, durationMs };
}
