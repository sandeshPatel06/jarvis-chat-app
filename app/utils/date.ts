export const formatLastSeen = (date: string | Date | undefined, privacySetting: string = 'everyone'): string => {
    if (!date || privacySetting === 'nobody') return '';

    const lastSeenDate = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - lastSeenDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'last seen just now';
    if (diffMins < 60) return `last seen ${diffMins}m ago`;

    if (diffHours < 24) {
        if (now.getDate() === lastSeenDate.getDate()) {
            return `last seen at ${lastSeenDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
        }
        return 'last seen yesterday';
    }

    if (diffDays === 1) return 'last seen yesterday';
    if (diffDays < 7) return `last seen ${diffDays} days ago`;

    return `last seen on ${lastSeenDate.toLocaleDateString()}`;
};
