import GLib from 'gi://GLib';

async function timeout(delay) {
    return new Promise((resolve, reject) => {
        GLib.timeout_add(GLib.PRIORITY_DEFAULT, delay.toMillis(), () => {
            resolve();
            return GLib.SOURCE_REMOVE;
        })
    });
}

async function retrying(promise, count, delay) {
    let attempts = 0;
    while (true) {
        try {
            return await promise;
        } catch (error) {
            console.debug(`error while waiting for promise ${error}`);
            if (++attempts >= count) {
                throw new Error("Max retries reached");
            }
            await timeout(delay);
        }
    }
}

export { retrying }