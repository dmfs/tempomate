import GLib from 'gi://GLib';
import { debug } from './log.js';

async function timeout(delay) {
    return new Promise((resolve, reject) => {
        GLib.timeout_add(GLib.PRIORITY_DEFAULT, delay.toMillis(), () => {
            resolve();
            return GLib.SOURCE_REMOVE;
        })
    });
}

function interval(initial_delay, interval, callback) {
    let timeout = GLib.timeout_add(GLib.PRIORITY_DEFAULT, initial_delay.toMillis(), () => {
        timeout = GLib.timeout_add(GLib.PRIORITY_DEFAULT, interval.toMillis(), () => {
            callback?.()
            return GLib.SOURCE_CONTINUE;
        });
        callback?.()
        return GLib.SOURCE_REMOVE;
    });

    return () => {
        if (timeout) {
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

export { retrying, interval, timeout }