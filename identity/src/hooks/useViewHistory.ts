import { useEffect, useRef, useCallback } from 'react';

// ── Constants ─────────────────────────────────────────────────────────────────
const STORAGE_KEY = 'nft_view_history';
const DWELL_MS    = 2000;   // card must stay visible for 2 s before recording
const MAX_ITEMS   = 100;    // cap history length
const THRESHOLD   = 0.6;    // 60 % of the card must be visible

// ── Storage helpers (exported so HistoryView can use them directly) ────────────

export function addToHistory(postId: string): void {
    try {
        const raw   = localStorage.getItem(STORAGE_KEY);
        const hist: string[] = raw ? JSON.parse(raw) : [];
        // Skip if already the most-recent entry to avoid thrashing
        if (hist[0] === postId) return;
        const next = [postId, ...hist.filter(id => id !== postId)].slice(0, MAX_ITEMS);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
        // localStorage unavailable or full — fail silently
    }
}

export function getHistory(): string[] {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

export function clearHistory(): void {
    try {
        localStorage.removeItem(STORAGE_KEY);
    } catch { /* no-op */ }
}

// ── Hook ──────────────────────────────────────────────────────────────────────

/**
 * Returns `attachObserver(el, postId)`.
 *
 * Call it inside a ref callback on every feed card:
 *   <div ref={el => { if (el) attachObserver(el, post.id); }}>
 *
 * Internally tracks:
 *   - A per-element IntersectionObserver (stored by DOM reference so the same
 *     element is never observed twice, even across re-renders).
 *   - A per-postId dwell timer (cleared if the card scrolls out before 2 s).
 *
 * All observers and timers are torn down when the parent component unmounts.
 */
export function useViewHistory() {
    // Map<DOM element → observer> prevents duplicate observers on re-renders
    const observers = useRef(new Map<Element, IntersectionObserver>());
    // Map<postId → timer handle> so we can cancel a pending dwell
    const timers    = useRef(new Map<string, ReturnType<typeof setTimeout>>());

    // Teardown on unmount
    useEffect(() => {
        const obs = observers.current;
        const tms = timers.current;
        return () => {
            obs.forEach(o  => o.disconnect());
            tms.forEach(t  => clearTimeout(t));
        };
    }, []);

    const attachObserver = useCallback((el: HTMLElement, postId: string) => {
        // Already watching this exact DOM node — nothing to do
        if (observers.current.has(el)) return;

        const observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) {
                // Start the 2-second dwell clock
                const timer = setTimeout(() => {
                    addToHistory(postId);
                    timers.current.delete(postId);
                }, DWELL_MS);
                timers.current.set(postId, timer);
            } else {
                // Card scrolled out — cancel any pending dwell
                const timer = timers.current.get(postId);
                if (timer !== undefined) {
                    clearTimeout(timer);
                    timers.current.delete(postId);
                }
            }
        }, { threshold: THRESHOLD });

        observer.observe(el);
        observers.current.set(el, observer);
    }, []);

    return { attachObserver };
}
