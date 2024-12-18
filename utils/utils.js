import GLib from 'gi://GLib';
import { debug } from './log.js';

/*
 * A Map to keep track of all open timers. We use this to remove them in one go when we get disposed.
 */
const timers = new Map();

async function timeout(delay, label) {
    return new Promise((resolve, reject) => {
        let timer = GLib.timeout_add(GLib.PRIORITY_DEFAULT, delay.toMillis(), () => {
            timer = unregisterTimer(timer, "async");
            resolve();
            return GLib.SOURCE_REMOVE;
        })
        registerTimer(timer, "async", label);
    });
}

/**
 * Calls the given callback after the given duration.
 * This timeout can be cancelled by calling the returned function.
 */
function managedTimer(delay, callback, label) {
    let timer = GLib.timeout_add(GLib.PRIORITY_DEFAULT, delay.toMillis(), () => {
        timer = unregisterTimer(timer, "managed");
        callback?.();
        return GLib.SOURCE_REMOVE;
    });
    registerTimer(timer, "managed", label);
    return () => {
        timer = removeTimer(timer, "managed");
    }
}

/**
 * Calls the given callback ofter the given initial_delay and then every time the given interval has passed.
 *
 * The method returns a function that servers as the temrination handle and stops the interval when called.
 */
function interval(initial_delay, interval, callback, label) {
    let timer = GLib.timeout_add(GLib.PRIORITY_DEFAULT, initial_delay.toMillis(), () => {
        unregisterTimer(timer, "interval");
        timer = GLib.timeout_add(GLib.PRIORITY_DEFAULT, interval.toMillis(), () => {
            callback?.()
            return GLib.SOURCE_CONTINUE;
        });
        callback?.()
        registerTimer(timer, "interval", label);
        return GLib.SOURCE_REMOVE;
    });

    registerTimer(timer, "interval", label);

    return () => {
        timer = removeTimer(timer, "interval")
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
            await timeout(delay, "async retrying");
        }
    }
}

function destroy() {
    for (const [timer, label] of timers) {
        removeTimer(timer)
    }
}

function removeTimer(timer, timer_type) {
    if (timer) {
        debug("remove", timer_type, "timer", timer)
        GLib.Source.remove(timer);
        unregisterTimer(timer, timer_type);
    }
}

function unregisterTimer(timer, timer_type) {
    if (timer) {
        debug("unregister", timer_type, "timer", timer, timers.get(timer))
        timers.delete(timer);
        debug("remaining timers ", JSON.stringify([...timers]))
    }
}

function registerTimer(timer, timer_type, label) {
    debug("register", timer_type, "timer", timer, label)
    timers.set(timer, label);
}


export { retrying, interval, timeout, managedTimer, destroy }