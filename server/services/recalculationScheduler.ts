import { NetworkRecalculationService } from './networkRecalculation';

const SIX_HOURS_MS = 6 * 60 * 60 * 1000;

class RecalculationScheduler {
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;
  private lastRunAt: Date | null = null;
  private nextRunAt: Date | null = null;

  start() {
    if (this.intervalId) {
      console.log('[Scheduler] Already running, skipping start');
      return;
    }

    console.log(`[Scheduler] Starting network recalculation scheduler (every 6 hours)`);
    
    this.scheduleNextRun();
    
    this.intervalId = setInterval(() => {
      this.runRecalculation();
    }, SIX_HOURS_MS);

    console.log(`[Scheduler] Next recalculation scheduled for: ${this.nextRunAt?.toISOString()}`);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('[Scheduler] Stopped network recalculation scheduler');
    }
  }

  private scheduleNextRun() {
    this.nextRunAt = new Date(Date.now() + SIX_HOURS_MS);
  }

  async runRecalculation(): Promise<void> {
    if (this.isRunning) {
      console.log('[Scheduler] Recalculation already in progress, skipping');
      return;
    }

    this.isRunning = true;
    console.log(`[Scheduler] Starting scheduled network-wide recalculation...`);

    try {
      const recalcService = new NetworkRecalculationService();
      const result = await recalcService.recalculateAllScores();
      
      this.lastRunAt = new Date();
      this.scheduleNextRun();
      
      console.log(`[Scheduler] Completed recalculation: ${result.scoresUpdated} scores updated in ${result.duration}ms`);
    } catch (error) {
      console.error('[Scheduler] Recalculation failed:', error);
    } finally {
      this.isRunning = false;
    }
  }

  async runNow(): Promise<void> {
    return this.runRecalculation();
  }

  getStatus() {
    return {
      isSchedulerRunning: this.intervalId !== null,
      isRecalculationInProgress: this.isRunning,
      lastRunAt: this.lastRunAt?.toISOString() || null,
      nextRunAt: this.nextRunAt?.toISOString() || null,
      intervalHours: 6,
    };
  }
}

export const recalculationScheduler = new RecalculationScheduler();
