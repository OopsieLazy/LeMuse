//! Request pacing and retry backoff. The timing maths is kept in pure
//! functions so it can be tested without sleeping.

use std::time::{Duration, Instant};

use crate::connectors::SourcePolicy;

/// Spaces calls to one source evenly: `max(min_interval, 60s / rpm)`.
#[derive(Debug)]
pub struct Throttle {
    interval: Duration,
    last: Option<Instant>,
}

impl Throttle {
    pub fn for_policy(p: &SourcePolicy) -> Self {
        let per_req = if p.requests_per_minute == 0 {
            Duration::from_secs(60)
        } else {
            Duration::from_millis(60_000 / p.requests_per_minute as u64)
        };
        Self {
            interval: per_req.max(Duration::from_millis(p.min_interval_ms)),
            last: None,
        }
    }

    pub fn interval(&self) -> Duration {
        self.interval
    }

    /// How long to wait before the next call, given the current time.
    pub fn delay_needed(&self, now: Instant) -> Duration {
        match self.last {
            Some(last) => self
                .interval
                .saturating_sub(now.saturating_duration_since(last)),
            None => Duration::ZERO,
        }
    }

    /// Block until the next call is allowed, then mark it as made.
    pub fn wait(&mut self) {
        let d = self.delay_needed(Instant::now());
        if !d.is_zero() {
            std::thread::sleep(d);
        }
        self.last = Some(Instant::now());
    }
}

/// Exponential backoff ceiling for retry `attempt` (0-based), capped.
/// Callers add jitter; a server-provided `retry_after` always wins.
pub fn backoff_ceiling(attempt: u32, base: Duration, cap: Duration) -> Duration {
    let factor = 1u32.checked_shl(attempt.min(16)).unwrap_or(u32::MAX);
    base.saturating_mul(factor).min(cap)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn policy(rpm: u32, min_ms: u64) -> SourcePolicy {
        SourcePolicy {
            requests_per_minute: rpm,
            min_interval_ms: min_ms,
            background_sync_allowed: true,
            attribution_required: false,
            max_pages: None,
            min_refresh_hours: 0,
        }
    }

    #[test]
    fn interval_respects_budget_and_floor() {
        // Are.na free tier budget (96/min) → 625 ms, above the 500 ms floor.
        assert_eq!(
            Throttle::for_policy(&policy(96, 500)).interval(),
            Duration::from_millis(625)
        );
        // High budget → floor wins.
        assert_eq!(
            Throttle::for_policy(&policy(6000, 500)).interval(),
            Duration::from_millis(500)
        );
    }

    #[test]
    fn first_call_is_immediate() {
        let t = Throttle::for_policy(&policy(60, 0));
        assert_eq!(t.delay_needed(Instant::now()), Duration::ZERO);
    }

    #[test]
    fn backoff_doubles_then_caps() {
        let base = Duration::from_secs(1);
        let cap = Duration::from_secs(30);
        assert_eq!(backoff_ceiling(0, base, cap), Duration::from_secs(1));
        assert_eq!(backoff_ceiling(3, base, cap), Duration::from_secs(8));
        assert_eq!(backoff_ceiling(10, base, cap), cap);
        assert_eq!(backoff_ceiling(99, base, cap), cap);
    }
}
