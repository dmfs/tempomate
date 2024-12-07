import GLib from 'gi://GLib';
import { debug } from './log.js';

/*
 * A Set to keep track of all open timers. We use this to remove them in one go when we get disposed.
 */
const timers = new Set();

async function timeout(delay) {
    return new Promise((resolve, reject) => {
        const timer = GLib.timeout_add(GLib.PRIORITY_DEFAULT, delay.toMillis(), () => {
            timers.delete(timer)
            resolve();
            return GLib.SOURCE_REMOVE;
        })
        timers.add(timer);
    });
}

/**
 * Calls the given callback ofter the given initial_delay and then every time the given interval has passed.
 *
 * The method returns a function that servers as the temrination handle and stops the interval when called.
 */
function interval(initial_delay, interval, callback) {
    let timeout = GLib.timeout_add(GLib.PRIORITY_DEFAULT, initial_delay.toMillis(), () => {
        timers.delete(timeout);
        timeout = GLib.timeout_add(GLib.PRIORITY_DEFAULT, interval.toMillis(), () => {
            callback?.()
            return GLib.SOURCE_CONTINUE;
        });
        callback?.()
        timers.add(timeout);
        return GLib.SOURCE_REMOVE;
    });

    timers.add(timeout);

    return () => {
        if (timeout) {
            timers.delete(timeout);
            GLib.Source.remove(timeout);
            timeout = undefined;
        }
    };
}

async function retrying(promise, count, delay) {
    let attempts = 0;
    while (true) {
        try {
            return await promise;
        } catch (error) {
            debug(`error while waiting for promise ${error}`);
            if (++attempts >= count) {
                throw new Error("Max retries reached");
            }
            await timeout(delay);
        }
    }
}

function destroy() {
    for (const timer of timers) {
        GLib.Source.remove(timer);
        timers.delete(timer);
    }
}

export { retrying, interval, timeout, destroy }