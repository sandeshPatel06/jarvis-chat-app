export interface User {
    id: number;
    username: string;
    email: string;
    phone_number?: string;
    profile_picture?: string;
    bio?: string;
    privacy_last_seen?: 'everyone' | 'contacts' | 'nobody';
    privacy_profile_photo?: 'everyone' | 'contacts' | 'nobody';
    privacy_read_receipts?: boolean;
    privacy_disappearing_messages_timer?: number;
    notifications_enabled?: boolean;
    notifications_sound?: boolean;
    notifications_groups_enabled?: boolean;
    security_notifications_enabled?: boolean;
    two_step_verification_enabled?: boolean;
    storage_auto_download_media?: boolean;
    chat_wallpaper?: string;
    app_language?: string;
    last_seen?: string | Date; // Backend should send this
    is_online?: boolean;
}

export interface Message {
    id: string;
    text: string;
    sender: 'me' | 'them';
    timestamp: Date;
    file?: string | null;
    file_type?: string | null;
    file_name?: string | null;
    isRead?: boolean;
    isDelivered?: boolean;
    reactions?: string[];
    reply_to?: {
        id: string;
        text: string;
        sender: string;
    };
    isUnsent?: boolean;
    deleted_at?: string;
    is_pinned?: boolean;
}

export interface Chat {
    id: string;
    name: string;
    avatar: string | null;
    lastMessage: string;
    lastMessageTime: Date;
    unreadCount: number;
    messages: Message[];
    status?: string;
    hasMore?: boolean;
    last_seen?: string | Date;
    is_online?: boolean;
    user_id?: number; // ID of the other user in 1-on-1 chats
    is_deleted?: boolean;
}

export interface Call {
    id: number;
    caller: User;
    receiver: User;
    started_at: string;
    ended_at: string | null;
    status: 'ongoing' | 'completed' | 'missed' | 'rejected';
    is_video: boolean;
}
