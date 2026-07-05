export const CHAT_PREF_KEYS = {
    enterIsSend: 'chat_enter_is_send',
    mediaVisibility: 'chat_media_visibility',
    fontSize: 'chat_message_font_size',
} as const;

export const CHAT_FONT_SIZE_MIN = 14;
export const CHAT_FONT_SIZE_MAX = 22;
export const CHAT_FONT_SIZE_STEP = 1;
export const DEFAULT_CHAT_FONT_SIZE = 16;

export const normalizeChatFontSize = (value: unknown): number => {
    if (typeof value === 'number' && Number.isFinite(value)) {
        return Math.min(CHAT_FONT_SIZE_MAX, Math.max(CHAT_FONT_SIZE_MIN, Math.round(value)));
    }

    if (typeof value === 'string') {
        const normalized = value.trim().toLowerCase();

        if (normalized === 'small') return 14;
        if (normalized === 'medium') return 16;
        if (normalized === 'large') return 18;

        const parsed = Number(value);
        if (Number.isFinite(parsed)) {
            return Math.min(CHAT_FONT_SIZE_MAX, Math.max(CHAT_FONT_SIZE_MIN, Math.round(parsed)));
        }
    }

    return DEFAULT_CHAT_FONT_SIZE;
};

export const getChatFontSizeLabel = (value: number): 'Small' | 'Medium' | 'Large' => {
    if (value <= 15) return 'Small';
    if (value <= 18) return 'Medium';
    return 'Large';
};

