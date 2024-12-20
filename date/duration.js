class Duration {
    constructor(millis) {
        this.millis = millis;
    }

    toMillis() {
        return this.millis;
    }

    toSeconds() {
        return Math.round(this.millis / 1000);
    }

    toMinutes() {
        return Math.round(this.millis / 60000);
    }

    add(other_duration) {
        return new Duration(this.millis + other_duration.toMillis());
    }

    static ofSeconds(seconds) {
        return new Duration(seconds * 1000);
    }

    static ofMillis(millis) {
        return new Duration(millis);
    }
}

function between(from, to) {
    return new Duration(to.getTime() - from.getTime());
}

export { Duration, between }
