function startOfDay(date) {
    const result = new Date(date);
    result.setHours(0, 0, 0, 0);
    return result;
}

function dayAfter(date) {
    const result = startOfDay(date);
    result.setDate(result.getDate() + 1);
    return result;
}

function dayBefore(date) {
    const result = startOfDay(date);
    result.setDate(result.getDate() - 1);
    return result;
}

function addDuration(date, duration) {
    return new Date(date.getTime() + duration.toMillis());
}

function hhmmTimeString(date) {
    return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit"
    })
}

export {startOfDay, dayAfter, dayBefore, addDuration, hhmmTimeString}
