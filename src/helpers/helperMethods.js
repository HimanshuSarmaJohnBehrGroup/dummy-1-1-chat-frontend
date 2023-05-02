const getFormattedDurationHandler = (callDuration) => {
    if (callDuration) {
        const callDurationTemp = callDuration;
        const totalHours = Math.floor(callDurationTemp / 3600);
        const totalMinutes = Math.floor((callDurationTemp % 3600) / 60);
        const totalSeconds = Math.floor((((callDurationTemp % 3600) % 60)));

        return `${totalHours} : ${totalMinutes} : ${totalSeconds}`;
    }
}

export { getFormattedDurationHandler };