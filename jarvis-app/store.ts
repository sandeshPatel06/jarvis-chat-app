import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { api } from './services/api';
import NetInfo from '@react-native-community/netinfo';
import * as database from './services/database';
import { User, Message, Chat, Call } from '@/types';
import { getMediaUrl, downloadMedia } from './utils/media';
import { webrtcService } from './services/webrtc';
import { MediaStream } from 'react-native-webrtc';
import * as SecureStore from 'expo-secure-store';
import * as KeepAwake from 'expo-keep-awake';
import * as Haptics from 'expo-haptics';
import * as Audio from 'expo-audio';
import * as ImagePicker from 'expo-image-picker';
import { scheduleLocalNotification } from './utils/notifications';

// Custom storage wrapper for Zustand to use SecureStore for sensitive data
const secureStorage = {
    getItem: async (name: string): Promise<string | null> => {
        return await SecureStore.getItemAsync(name);
    },
    setItem: async (name: string, value: string): Promise<void> => {
        await SecureStore.setItemAsync(name, value);
    },
    removeItem: async (name: string): Promise<void> => {
        await SecureStore.deleteItemAsync(name);
    },
};

interface Toast {
    type: 'success' | 'error' | 'info';
    text1: string;
    text2?: string;
    id: number;
}

export interface AlertButton {
    text: string;
    onPress?: () => void;
    style?: 'default' | 'cancel' | 'destructive';
}

export interface AlertState {
    title: string;
    message: string;
    buttons?: AlertButton[];
}


interface CallState {
    isCalling: boolean;
    incomingCall: { chatId: string, offer: any, isVideo: boolean } | null;
    remoteStream: MediaStream | null;
    localStream: MediaStream | null;
    activeChatId: string | null;
    bufferedCandidates: any[];
    isMinimized: boolean;
    isVideo?: boolean;
    isRequestingPermissions: boolean;
}


interface AppState {
    user: User | null;
    token: string | null;
    theme: 'system' | 'light' | 'dark';
    setTheme: (theme: 'system' | 'light' | 'dark') => void; // Fix missing
    chats: Chat[];
    calls: Call[];
    socket: WebSocket | null;
    setUser: (user: User | null, token: string | null) => void;
    updateUser: (user: User) => void;
    sendMessage: (chatId: string, text: string, replyToId?: string) => void;
    sendFileMessage: (chatId: string, file: any, text?: string, replyToId?: string) => Promise<void>;
    editMessage: (chatId: string, messageId: string, newText: string) => void; // New
    deleteMessage: (chatId: string, messageId: string) => void; // New
    reactToMessage: (chatId: string, messageId: string, reaction: string) => void; // New
    pinMessage: (chatId: string, messageId: string) => void;
    unpinMessage: (chatId: string, messageId: string) => void;
    markRead: (chatId: string, messageId: string) => void;
    markDelivered: (chatId: string, messageId: string) => void;
    updateMessageRead: (messageId: string, chatId?: string) => void;
    updateMessageDelivered: (messageId: string, chatId?: string) => void;
    deleteChat: (chatId: string) => Promise<void>; // New
    deleteChats: (chatIds: string[]) => Promise<void>; // New
    logout: () => void;
    setChats: (chats: Chat[]) => void;
    addMessage: (message: any) => void;
    connectWebSocket: () => void;
    fetchChats: () => Promise<void>;
    // Calls Pagination
    callsOffset: number;
    hasMoreCalls: boolean;
    fetchCalls: (loadMore?: boolean) => Promise<void>;
    fetchMessages: (chatId: string) => Promise<void>;
    loadMoreMessages: (chatId: string) => Promise<void>; // New
    typingUsers: Record<string, string | null>;
    setTyping: (chatId: string, username: string | null) => void;
    sendTyping: (chatId: string) => void;
    syncMessages: () => Promise<void>;
    hasHydrated: boolean;
    setHydrated: (state: boolean) => void;
    activeChatId: string | null;
    setActiveChat: (chatId: string | null) => void;
    animationsEnabled: boolean; // New
    setAnimationsEnabled: (enabled: boolean) => void; // New
    forwardMessage: (message: Message, chatIds: string[]) => Promise<void>; // New
    toast: Toast | null;
    showToast: (type: 'success' | 'error' | 'info', text1: string, text2?: string) => void;
    hideToast: () => void;
    updateSettings: (settings: Partial<User>) => Promise<void>;
    deleteAccount: () => Promise<void>;
    alert: AlertState | null;
    showAlert: (title: string, message: string, buttons?: AlertButton[]) => void;
    hideAlert: () => void;

    // Call Actions
    callState: CallState;
    startCall: (chatId: string, isVideo?: boolean) => Promise<void>;
    endCall: () => void;
    acceptCall: () => Promise<void>;
    handleSignalingMessage: (message: any) => Promise<void>;
    setIsMinimized: (isMinimized: boolean) => void;

    // Blocking
    blockedUsers: number[];
    fetchBlockedUsers: () => Promise<void>;
    blockUser: (userId: number) => Promise<void>;
    unblockUser: (userId: number) => Promise<void>;

    // Mute Notifications
    mutedChats: string[];
    muteChat: (chatId: string) => void;
    unmuteChat: (chatId: string) => void;
    isChatMuted: (chatId: string) => boolean;

    // Clear Chat
    clearChat: (chatId: string) => Promise<void>;

    // Restore
    restoreChats: (conversationIds: number[], restoreDate?: string) => Promise<void>;
    initApp: () => Promise<void>;
}



let callSound: any = null;
let ringtoneActive = false;

const playRingtone = async (isIncoming: boolean) => {
    try {
        if (ringtoneActive) {
            console.log('[Ringtone] Already playing, skipping');
            return;
        }
        ringtoneActive = true;
        console.log('[Ringtone] Starting ringtone, incoming:', isIncoming);

        // Configure audio session for VoIP-like behavior
        await Audio.setAudioModeAsync({
            playsInSilentMode: true,
            interruptionMode: 'doNotMix',
            allowsRecording: true, // Allow recording for VOIP
            shouldRouteThroughEarpiece: false,
            shouldPlayInBackground: true,
        });

        // Stop any existing sound
        if (callSound) {
            callSound.pause();
            callSound = null;
        }

        const source = isIncoming
            ? require('@/assets/sounds/incoming_call.mp3')
            : require('@/assets/sounds/outgoing_call.mp3');

        const player = Audio.createAudioPlayer(source);
        player.loop = true;
        player.play();
        callSound = player;
    } catch (e) {
        console.log('Error playing ringtone', e);
        ringtoneActive = false;
    }
};

const stopRingtone = async () => {
    try {
        console.log('[Ringtone] Stopping ringtone, active:', ringtoneActive);
        ringtoneActive = false;
        if (callSound) {
            callSound.pause();
            callSound = null;
            console.log('[Ringtone] Ringtone stopped successfully');
        }
    } catch (e) {
        console.log('Error stopping ringtone', e);
    }
};




const mockChats: Chat[] = [];

export const useStore = create<AppState>((set, get) => {
    return {
        user: null,
        token: null,
        theme: 'system',
        chats: [],
        calls: [],
        socket: null,
        typingUsers: {},
        setTyping: (chatId, username) => set((state) => ({
            typingUsers: { ...state.typingUsers, [chatId]: username }
        })),
        sendTyping: (chatId) => {
            const { socket } = get();
            if (socket && socket.readyState === WebSocket.OPEN) {
                socket.send(JSON.stringify({
                    type: 'typing',
                    conversation_id: chatId
                }));
            }
        },
        hasHydrated: false,
        setHydrated: (state) => set({ hasHydrated: state }),
        setUser: (user, token) => {
            set({ user, token });
            if (token) {
                SecureStore.setItemAsync('token', token).catch(console.error);
            } else {
                SecureStore.deleteItemAsync('token').catch(console.error);
            }
            if (user) {
                AsyncStorage.setItem('user', JSON.stringify(user)).catch(console.error);
            } else {
                AsyncStorage.removeItem('user').catch(console.error);
            }
        },
        updateUser: (user) => {
            set({ user });
            AsyncStorage.setItem('user', JSON.stringify(user)).catch(console.error);
        },
        setTheme: (theme: 'system' | 'light' | 'dark') => set({ theme }), // Fix missing
        logout: async () => {
            const { socket } = get();
            if (socket) socket.close();

            await SecureStore.deleteItemAsync('token');
            await AsyncStorage.removeItem('user');

            set({ user: null, token: null, chats: [], calls: [], socket: null, activeChatId: null, hasHydrated: true });
        },
        activeChatId: null,
        alert: null,
        showAlert: (title, message, buttons) => set({ alert: { title, message, buttons } }),
        hideAlert: () => set({ alert: null }),

        callState: {
            isCalling: false,
            incomingCall: null,
            remoteStream: null,
            localStream: null,
            activeChatId: null,
            bufferedCandidates: [],
            isMinimized: false,
            isRequestingPermissions: false,
        },
        callsOffset: 0,
        hasMoreCalls: true,

        startCall: async (chatId, isVideo = true) => {
            // Set calling state immediately for responsive UI
            set((state) => ({
                callState: { ...state.callState, isCalling: true, activeChatId: chatId, isMinimized: false, bufferedCandidates: [], isVideo, isRequestingPermissions: true }
            }));

            try {
                // Request permissions
                const audioStatus = await Audio.requestRecordingPermissionsAsync();
                const cameraStatus = await ImagePicker.requestCameraPermissionsAsync();

                set((state) => ({
                    callState: { ...state.callState, isRequestingPermissions: false }
                }));

                if (audioStatus.status !== 'granted' || (isVideo && cameraStatus.status !== 'granted')) {
                    get().showAlert('Permission Required', 'Camera and Microphone permissions are needed for calls.');
                    get().endCall();
                    return;
                }

                // Activate KeepAwake for the duration of the call
                KeepAwake.activateKeepAwakeAsync();
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

                // Play dialing sound
                playRingtone(false);

                // Configure audio for voice call (recording allowed)
                // Configure audio for voice call (recording allowed)
                await Audio.setAudioModeAsync({
                    playsInSilentMode: true,
                    allowsRecording: true,
                    interruptionMode: 'doNotMix',
                    shouldRouteThroughEarpiece: !isVideo, // Earpiece for voice, Speaker for video
                    shouldPlayInBackground: true,
                });

                const stream = await webrtcService.startLocalStream(isVideo);
                set((state) => ({
                    callState: { ...state.callState, localStream: stream }
                }));

                // Create peer connection AFTER we have the local stream
                webrtcService.createPeerConnection();

                webrtcService.onRemoteStream = (stream) => {

                    // Create a new stream object to force RTCView to re-render
                    const freshStream = new MediaStream(stream);
                    set((state) => ({
                        callState: { ...state.callState, remoteStream: freshStream }
                    }));
                };

                webrtcService.onIceCandidate = (candidate) => {
                    const socket = get().socket;
                    if (socket) {
                        socket.send(JSON.stringify({
                            type: 'webrtc_ice_candidate',
                            chat_id: chatId,
                            candidate: candidate
                        }));
                    }
                };

                webrtcService.onIceRestart = (offer) => {

                    const socket = get().socket;
                    if (socket) {
                        socket.send(JSON.stringify({
                            type: 'webrtc_offer',
                            chat_id: chatId,
                            offer: offer
                        }));
                    }
                };

                const offer = await webrtcService.createOffer();

                const socket = get().socket;
                if (socket) {
                    socket.send(JSON.stringify({
                        type: 'webrtc_offer',
                        chat_id: chatId,
                        offer: offer,
                        is_video: isVideo
                    }));
                }

            } catch (error) {
                console.error('Start call error:', error);
                get().endCall();
                get().showAlert('Error', 'Failed to start call');
            }
        },

        endCall: () => {
            const { callState, token, user, chats, socket } = get();
            stopRingtone(); // Stop sound
            const { activeChatId, isCalling, incomingCall } = callState;

            // Notify peer that call is ended/declined
            const targetChatId = activeChatId || incomingCall?.chatId;
            if (targetChatId && socket && socket.readyState === WebSocket.OPEN) {

                socket.send(JSON.stringify({
                    type: 'call_ended',
                    chat_id: targetChatId
                }));
            }

            if (isCalling && activeChatId && token && user) {
                const chat = chats.find(c => c.id === activeChatId);
                if (chat) {
                    // Log the call
                    // status: ongoing is default, but here we assume it was completed if ended manually
                    // ideally we track start time in state but for now current time is fine
                    api.chat.logCall(token, {
                        receiver_username: chat.name, // Assuming chat name is username for 1-1
                        status: 'completed',
                        is_video: callState.isVideo || false
                    }).then(() => get().fetchCalls());
                }
            }

            webrtcService.endCall();
            KeepAwake.deactivateKeepAwake(); // Deactivate KeepAwake when call ends
            set((state) => ({
                callState: {
                    isCalling: false,
                    incomingCall: null,
                    remoteStream: null,
                    localStream: null,
                    activeChatId: null,
                    bufferedCandidates: [],
                    isMinimized: false,
                    isRequestingPermissions: false,
                }
            }));
        },

        acceptCall: async () => {
            const { incomingCall } = get().callState;
            if (!incomingCall) return;

            try {
                // Request permissions for answering too
                set((state) => ({ callState: { ...state.callState, isRequestingPermissions: true } }));
                const audioStatus = await Audio.requestRecordingPermissionsAsync();
                const cameraStatus = await ImagePicker.requestCameraPermissionsAsync();
                set((state) => ({ callState: { ...state.callState, isRequestingPermissions: false } }));

                if (audioStatus.status !== 'granted' || cameraStatus.status !== 'granted') {
                    get().showAlert('Permission Required', 'Permissions needed to answer call.');
                    return;
                }

                set((state) => ({
                    callState: { ...state.callState, isCalling: true, activeChatId: incomingCall.chatId, incomingCall: null, isMinimized: false, bufferedCandidates: [], isVideo: incomingCall.isVideo }
                }));

                // Activate KeepAwake for calls
                KeepAwake.activateKeepAwakeAsync();
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

                stopRingtone(); // Stop incoming ringtone

                // Configure audio for voice call BEFORE getUserMedia
                await Audio.setAudioModeAsync({
                    playsInSilentMode: true,
                    allowsRecording: true, // Crucial for WebRTC to pick up mic
                    interruptionMode: 'doNotMix',
                    shouldRouteThroughEarpiece: false,
                    shouldPlayInBackground: true,
                });

                const stream = await webrtcService.startLocalStream(incomingCall.isVideo); // Respect isVideo flag
                console.log('[Store] Local stream started, tracks:', stream.getTracks().map(t => `${t.kind}:${t.enabled}`));
                set((state) => ({
                    callState: { ...state.callState, localStream: stream }
                }));

                // Create peer connection AFTER we have the local stream
                webrtcService.createPeerConnection();

                webrtcService.onRemoteStream = (stream) => {
                    console.log('[Store] Remote stream received in acceptCall, updating state. Tracks:', stream.getTracks().length);
                    stream.getTracks().forEach(track => {
                        console.log(`[Store] Remote track (acceptCall): Kind=${track.kind}, ID=${track.id}, Enabled=${track.enabled}, Muted=${track.muted}`);
                    });
                    // Create a new stream object to force RTCView to re-render
                    const freshStream = new MediaStream(stream);
                    set((state) => ({
                        callState: { ...state.callState, remoteStream: freshStream }
                    }));
                };

                webrtcService.onIceCandidate = (candidate) => {
                    const socket = get().socket;
                    if (socket) {
                        socket.send(JSON.stringify({
                            type: 'webrtc_ice_candidate',
                            chat_id: incomingCall.chatId,
                            candidate: candidate
                        }));
                    }
                };

                webrtcService.onIceRestart = (offer) => {
                    console.log('[Store] ICE restart in acceptCall, sending new offer to remote peer');
                    const socket = get().socket;
                    if (socket) {
                        socket.send(JSON.stringify({
                            type: 'webrtc_offer',
                            chat_id: incomingCall.chatId,
                            offer: offer
                        }));
                    }
                };

                await webrtcService.setRemoteDescription(incomingCall.offer);

                // Process buffered candidates
                const { bufferedCandidates } = get().callState;
                if (bufferedCandidates.length > 0) {

                    for (const candidate of bufferedCandidates) {
                        await webrtcService.addIceCandidate(candidate);
                    }
                }

                const answer = await webrtcService.createAnswer();

                const socket = get().socket;
                if (socket) {
                    socket.send(JSON.stringify({
                        type: 'webrtc_answer',
                        chat_id: incomingCall.chatId,
                        answer: answer
                    }));
                }
            } catch (error) {
                console.error('Accept call error', error);
                get().endCall();
            }
        },



        // Blocking
        blockedUsers: [],
        fetchBlockedUsers: async () => {
            const { token } = get();
            if (!token) return;
            const users = await api.auth.getBlockedUsers(token);
            set({ blockedUsers: users });
        },
        blockUser: async (userId: number) => {
            const { token } = get();
            if (!token) return;
            await api.auth.blockUser(token, userId);
            // Update state
            set((state) => ({ blockedUsers: [...state.blockedUsers, userId] }));
        },
        unblockUser: async (userId: number) => {
            const { token } = get();
            if (!token) return;
            await api.auth.unblockUser(token, userId);
            // Update state
            set((state) => ({ blockedUsers: state.blockedUsers.filter(id => id !== userId) }));
        },

        restoreChats: async (conversationIds: number[], restoreDate?: string) => {
            const { token } = get();
            if (!token) return;
            try {
                const response = await api.chat.restoreChats(token, conversationIds, restoreDate);
                // Refresh chats
                await get().fetchChats();
            } catch (e) {
                console.error('Failed to restore chats', e);
                throw e; // Let UI handle error
            }
        },

        handleSignalingMessage: async (message: any) => {
            const { type, payload } = message;
            const pc = webrtcService.peerConnection;
            const signalingState = pc?.signalingState || 'no-pc';
            const connectionState = pc?.connectionState || 'no-pc';



            if (message.type === 'webrtc_offer') {

                const state = get().callState;
                const currentUser = get().user?.username;


                const isGlaring = state.isCalling || state.incomingCall;
                const isRenegotiation = state.isCalling && state.activeChatId === message.chat_id;

                if (isGlaring && !isRenegotiation) {

                    const chat = get().chats.find(c => c.id === message.chat_id);
                    const remoteUsername = chat?.name;


                    stopRingtone();
                    webrtcService.endCall();
                }

                if (isRenegotiation) {

                    if (pc && pc.signalingState !== 'stable' && pc.signalingState !== 'have-local-offer') {
                        console.warn(`[Signaling] ⚠️ Collision! Cannot apply renegotiation offer in state: ${pc.signalingState}. Skipping.`);
                        return;
                    }


                    const answer = await webrtcService.createAnswer();
                    const socket = get().socket;
                    if (socket) {

                        socket.send(JSON.stringify({
                            type: 'webrtc_answer',
                            chat_id: message.chat_id,
                            answer: answer
                        }));
                    }


                    const { bufferedCandidates } = get().callState;
                    if (bufferedCandidates.length > 0 && webrtcService.peerConnection && webrtcService.peerConnection.remoteDescription) {
                        console.log(`[Signaling] Processing ${bufferedCandidates.length} buffered ICE candidates after renegotiation`);
                        for (const candidate of bufferedCandidates) {
                            await webrtcService.addIceCandidate(candidate);
                        }
                        set((state) => ({
                            callState: { ...state.callState, bufferedCandidates: [] }
                        }));
                    }
                    return;
                }


                playRingtone(true);
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

                set((state) => ({
                    callState: {
                        ...state.callState,
                        incomingCall: {
                            chatId: message.chat_id,
                            offer: message.offer,
                            isVideo: !!message.is_video
                        },
                        isVideo: !!message.is_video
                    }
                }));
            } else if (message.type === 'webrtc_answer') {

                if (!pc || pc.signalingState !== 'have-local-offer') {
                    console.warn(`[Signaling] ⚠️ Unexpected Answer! PC state is ${signalingState}. Expected 'have-local-offer'. Ignoring.`);
                    return;
                }

                stopRingtone();


                await webrtcService.setRemoteDescription(message.answer);


                const { bufferedCandidates } = get().callState;
                if (bufferedCandidates.length > 0) {
                    console.log(`[Signaling] Caller processing ${bufferedCandidates.length} buffered ICE candidates after Answer`);
                    for (const candidate of bufferedCandidates) {
                        await webrtcService.addIceCandidate(candidate);
                    }

                    set((state) => ({
                        callState: { ...state.callState, bufferedCandidates: [], isMinimized: false }
                    }));
                }
            } else if (message.type === 'webrtc_ice_candidate') {

                const pc = webrtcService.peerConnection;
                const signalingState = pc?.signalingState || 'no-pc';

                if (pc && pc.remoteDescription) {

                    await webrtcService.addIceCandidate(message.candidate);
                } else {

                    set((state) => ({
                        callState: {
                            ...state.callState,
                            bufferedCandidates: [...state.callState.bufferedCandidates, message.candidate]
                        }
                    }));
                }
            } else if (message.type === 'call_ended') {

                const { callState } = get();
                if (callState.activeChatId === message.chat_id || callState.incomingCall?.chatId === message.chat_id) {
                    webrtcService.endCall();
                    stopRingtone();
                    set((state) => ({
                        callState: {
                            isCalling: false,
                            incomingCall: null,
                            remoteStream: null,
                            localStream: null,
                            activeChatId: null,
                            bufferedCandidates: [],
                            isMinimized: false,
                            isRequestingPermissions: false,
                        }
                    }));
                }
            }
        },
        setIsMinimized: (isMinimized: boolean) => set((state) => ({
            callState: { ...state.callState, isMinimized }
        })),

        setActiveChat: (chatId) => {
            set((state) => ({
                activeChatId: chatId,

                chats: state.chats.map(c => c.id === chatId ? { ...c, unreadCount: 0 } : c)
            }));
        },
        animationsEnabled: true,
        setAnimationsEnabled: (enabled) => set({ animationsEnabled: enabled }),
        sendMessage: async (chatId, text, replyToId) => {
            const { socket, user } = get();
            const netState = await NetInfo.fetch();

            if (netState.isConnected && socket && socket.readyState === WebSocket.OPEN) {
                socket.send(JSON.stringify({
                    message: text,
                    conversation_id: chatId,
                    reply_to_id: replyToId
                }));
            } else {
                // Offline handling
                const tempId = `temp_${Date.now()}`;
                const newMessage: Message = {
                    id: tempId,
                    text,
                    sender: 'me',
                    timestamp: new Date(),
                    isRead: false,
                    isDelivered: false,
                    isUnsent: true,
                    reply_to: undefined
                };


                if (replyToId) {
                    const chat = get().chats.find(c => c.id === chatId);
                    const parent = chat?.messages.find(m => m.id === replyToId);
                    if (parent) {
                        newMessage.reply_to = {
                            id: parent.id,
                            text: parent.text,
                            sender: parent.sender === 'me' ? (user?.username || 'me') : 'them' // Approximate
                        };
                    }
                }

                get().addMessage({ ...newMessage, conversation_id: chatId });
                await database.saveMessage(newMessage, chatId, true);
            }

            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        },
        sendFileMessage: async (chatId, file, text = '', replyToId) => {
            const { token, user } = get();
            if (!token) {
                console.error('No token available for file upload');
                throw new Error('Authentication required. Please log in again.');
            }

            try {
                console.log('Uploading file:', {
                    chatId,
                    fileName: file.name,
                    fileType: file.mimeType,
                    fileUri: file.uri
                });

                const response = await api.chat.uploadFile(token, chatId, null, file, text, replyToId);


                let localFileUri = null;
                if (response.file) {
                    const fullMediaUrl = getMediaUrl(response.file);
                    if (fullMediaUrl) {
                        try {
                            localFileUri = await downloadMedia(fullMediaUrl, response.id.toString());
                        } catch (downloadError) {
                            console.warn('Failed to download media locally, using remote URL:', downloadError);
                            // Continue with remote URL if local download fails
                        }
                    }
                }


                const msg = {
                    id: response.id || `temp_${Date.now()}`,
                    text: text || '',
                    sender: 'me',
                    timestamp: new Date(response.timestamp || Date.now()),
                    isRead: false,
                    isDelivered: false,
                    file: localFileUri || response.file,
                    remoteFile: response.file,
                    file_type: response.file_type,
                    file_name: response.file_name,
                    conversation_id: chatId,
                };
                get().addMessage(msg);

                console.log('File message sent successfully:', response.id);
            } catch (e: any) {
                console.error('Send file failed', e);


                let errorMessage = 'Failed to send file. Please try again.';

                if (e.message) {
                    if (e.message.includes('Network')) {
                        errorMessage = 'Network error. Please check your internet connection.';
                    } else if (e.message.includes('File not found')) {
                        errorMessage = 'File not found. Please try selecting the file again.';
                    } else if (e.message.includes('too large')) {
                        errorMessage = e.message; // Use the specific size message
                    } else if (e.message.includes('Authentication')) {
                        errorMessage = 'Session expired. Please log in again.';
                    } else {
                        errorMessage = e.message;
                    }
                }


                throw new Error(errorMessage);
            }
        },
        syncMessages: async () => {
            const { socket } = get();
            const netState = await NetInfo.fetch();

            if (!netState.isConnected || !socket || socket.readyState !== WebSocket.OPEN) return;

            const unsentMessages = await database.getUnsentMessages();

            for (const msg of unsentMessages) {

                const replyToId = msg.reply_to?.id;

                socket.send(JSON.stringify({
                    message: msg.text,
                    conversation_id: msg.conversation_id,
                    reply_to_id: replyToId
                }));

                await database.deleteUnsentMessage(msg.id);


                set(state => ({
                    chats: state.chats.map(chat => {
                        if (chat.id === msg.conversation_id) {
                            return {
                                ...chat,
                                messages: chat.messages.filter(m => m.id !== msg.id)
                            };
                        }
                        return chat;
                    })
                }));
            }
        },
        editMessage: (chatId, messageId, newText) => {
            const { socket } = get();
            // Optimistic update
            set((state) => ({
                chats: state.chats.map((chat) => {
                    if (chat.id === chatId) {
                        const newMessages = chat.messages.map((msg) =>
                            msg.id === messageId ? { ...msg, text: newText } : msg
                        );
                        return { ...chat, messages: newMessages, lastMessage: newMessages[newMessages.length - 1].text };
                    }
                    return chat;
                })
            }));

            if (socket && socket.readyState === WebSocket.OPEN) {
                socket.send(JSON.stringify({
                    type: 'edit_message',
                    message_id: messageId,
                    conversation_id: chatId,
                    new_text: newText
                }));
            }
        },
        deleteMessage: (chatId, messageId) => {
            const { socket } = get();
            // Optimistic update
            set((state) => ({
                chats: state.chats.map((chat) => {
                    if (chat.id === chatId) {
                        const newMessages = chat.messages.filter((msg) => msg.id !== messageId);
                        const lastMsg = newMessages.length > 0 ? newMessages[newMessages.length - 1].text : '';
                        return { ...chat, messages: newMessages, lastMessage: lastMsg };
                    }
                    return chat;
                })
            }));

            if (socket && socket.readyState === WebSocket.OPEN) {
                socket.send(JSON.stringify({
                    type: 'delete_message',
                    message_id: messageId,
                    conversation_id: chatId
                }));
            }
        },
        reactToMessage: (chatId, messageId, reaction) => {
            const { socket } = get();

            if (socket && socket.readyState === WebSocket.OPEN) {
                socket.send(JSON.stringify({
                    type: 'react_message',
                    message_id: messageId,
                    reaction: reaction
                }));
            }
        },

        pinMessage: (chatId, messageId) => {
            const { socket, chats } = get();

            // Update local state
            const updatedChats = chats.map(chat => {
                if (chat.id === chatId) {
                    const updatedMessages = chat.messages.map(msg =>
                        msg.id === messageId ? { ...msg, is_pinned: true } : msg
                    );
                    return { ...chat, messages: updatedMessages };
                }
                return chat;
            });
            set({ chats: updatedChats });

            // Send to server
            if (socket && socket.readyState === WebSocket.OPEN) {
                socket.send(JSON.stringify({
                    type: 'pin_message',
                    message_id: messageId,
                    conversation_id: chatId,
                }));
            }
        },

        unpinMessage: (chatId, messageId) => {
            const { socket, chats } = get();

            // Update local state
            const updatedChats = chats.map(chat => {
                if (chat.id === chatId) {
                    const updatedMessages = chat.messages.map(msg =>
                        msg.id === messageId ? { ...msg, is_pinned: false } : msg
                    );
                    return { ...chat, messages: updatedMessages };
                }
                return chat;
            });
            set({ chats: updatedChats });

            // Send to server
            if (socket && socket.readyState === WebSocket.OPEN) {
                socket.send(JSON.stringify({
                    type: 'unpin_message',
                    message_id: messageId,
                    conversation_id: chatId,
                }));
            }
        },

        deleteChat: async (chatId) => {
            const { token } = get();
            if (!token) return;
            try {
                await api.chat.deleteConversation(token, chatId);
                set((state) => ({
                    chats: state.chats.filter((c) => c.id !== chatId)
                }));
            } catch (e) {
                console.error('Failed to delete chat', e);
            }
        },
        deleteChats: async (chatIds) => {
            const { deleteChat } = get();
            // Parallel delete
            await Promise.all(chatIds.map(id => deleteChat(id)));
        },
        toast: null,
        showToast: (type, text1, text2) => set({ toast: { type, text1, text2, id: Date.now() } }),
        hideToast: () => set({ toast: null }),
        updateSettings: async (settings) => {
            const { token, user } = get();
            if (!token || !user) return;
            try {
                const updatedUser = await api.auth.updateProfile(token, settings);
                set({ user: updatedUser });
            } catch (e) {
                console.error('Update settings failed', e);
                get().showToast('error', 'Update Failed', 'Could not save your settings.');
                throw e;
            }
        },
        deleteAccount: async () => {
            const { token, logout } = get();
            if (!token) return;
            try {
                await api.auth.deleteAccount(token);
                logout();
            } catch (e) {
                console.error('Delete account failed', e);
                get().showToast('error', 'Action Failed', 'Could not delete your account.');
                throw e;
            }
        },

        markRead: (chatId, messageId) => {
            const { socket, user } = get();
            // Respect privacy setting for read receipts
            if (user?.privacy_read_receipts === false) {
                console.log('[Store] Read receipts disabled, skipping mark_read');
                return;
            }
            if (socket && socket.readyState === WebSocket.OPEN) {
                socket.send(JSON.stringify({
                    type: 'mark_read',
                    message_id: messageId,
                    conversation_id: chatId
                }));
            }
        },
        markDelivered: (chatId, messageId) => {
            const { socket } = get();
            if (socket && socket.readyState === WebSocket.OPEN) {
                socket.send(JSON.stringify({
                    type: 'mark_delivered',
                    message_id: messageId,
                    conversation_id: chatId
                }));
            }
        },
        updateMessageRead: (messageId, chatId) => set((state) => ({
            chats: state.chats.map((chat) => {
                if (chatId && chat.id !== chatId) return chat;

                const msgIndex = chat.messages.findIndex(m => m.id === messageId);
                if (msgIndex === -1) return chat;

                const newMessages = [...chat.messages];
                newMessages[msgIndex] = { ...newMessages[msgIndex], isRead: true };
                return { ...chat, messages: newMessages };
            })
        })),
        updateMessageDelivered: (messageId, chatId) => set((state) => ({
            chats: state.chats.map((chat) => {
                if (chatId && chat.id !== chatId) return chat;

                const msgIndex = chat.messages.findIndex(m => m.id === messageId);
                if (msgIndex === -1) return chat;

                const newMessages = [...chat.messages];
                newMessages[msgIndex] = { ...newMessages[msgIndex], isDelivered: true };
                return { ...chat, messages: newMessages };
            })
        })),
        setChats: (chats) => set({ chats }),
        addMessage: (message) => {
            const chatId = (message.conversation_id || message.conversation)?.toString();
            const msgId = message.id.toString();

            const { chats } = get();
            const chatExists = chats.some(c => c.id === chatId);

            if (!chatExists) {
                console.log('[addMessage] Chat not found, creating placeholder:', chatId);
                const isFromMe = message.sender === 'me' || (message.sender?.username === get().user?.username);
                const placeholderChat: Chat = {
                    id: chatId,
                    name: 'Loading...',
                    avatar: null, // Initial placeholder avatar
                    lastMessage: message.text || (message.file ? 'Attachment' : ''),
                    lastMessageTime: new Date(message.timestamp),
                    unreadCount: isFromMe ? 0 : 1,
                    messages: [{ ...message, id: msgId }],
                    hasMore: true
                };
                set((state) => ({
                    chats: [placeholderChat, ...state.chats]
                }));
                // Fetch full chat details in background
                get().fetchChats();
                return;
            }

            set((state) => {
                return {
                    chats: state.chats.map((chat) => {
                        if (chat.id === chatId) {
                            const tempIdMatch = chat.messages.findIndex(m => m.id.startsWith('temp_') && m.text === message.text && m.sender === 'me');
                            let newMessages = [...chat.messages];

                            if (tempIdMatch !== -1) {
                                newMessages.splice(tempIdMatch, 1, { ...message, id: msgId });
                            } else if (!chat.messages.some(m => m.id.toString() === msgId)) {
                                console.log('[addMessage] Adding new message to chat:', chatId);
                                newMessages = [{ ...message, id: msgId }, ...chat.messages];
                            } else {
                                return chat;
                            }

                            return {
                                ...chat,
                                messages: newMessages,
                                lastMessage: message.text || (message.file ? 'Attachment' : ''),
                                lastMessageTime: new Date(message.timestamp),
                                unreadCount: state.activeChatId === chatId ? chat.unreadCount : (chat.unreadCount || 0) + 1
                            };
                        }
                        return chat;
                    }).sort((a, b) => {
                        const timeA = a.lastMessageTime ? new Date(a.lastMessageTime).getTime() : 0;
                        const timeB = b.lastMessageTime ? new Date(b.lastMessageTime).getTime() : 0;
                        return timeB - timeA;
                    })
                };
            });
        },
        connectWebSocket: () => {
            const { token, socket } = get();
            if (socket || !token) return;

            const wsUrl = process.env.EXPO_PUBLIC_WS_URL;
            if (!wsUrl) {
                console.error('Missing environment variable: EXPO_PUBLIC_WS_URL');
                return;
            }

            console.log('[WS] Connecting to:', wsUrl);
            const ws = new WebSocket(`${wsUrl}?token=${token}`);

            ws.onopen = () => {
                console.log('[WS] Connected');
                get().syncMessages();
            };

            ws.onmessage = async (e) => {
                console.log('[WS] 📥 Message received:', e.data); // Verbose log
                try {
                    const data = JSON.parse(e.data);
                    if (data.type === 'user_typing') {
                        const { conversation_id, sender_username } = data;
                        get().setTyping(conversation_id, sender_username);

                        setTimeout(() => {
                            get().setTyping(conversation_id, null);
                        }, 3000);
                    } else if (data.type === 'user_status') {
                        const { username, is_online, last_seen } = data;
                        console.log('[WS] Status update:', { username, is_online, last_seen });
                        set((state) => ({
                            chats: state.chats.map((chat) => {
                                // Participant name is usually the other person's username in 1-1
                                if (chat.name === username) {
                                    return { ...chat, is_online, last_seen };
                                }
                                return chat;
                            })
                        }));
                    } else if (data.type === 'webrtc_offer' || data.type === 'webrtc_answer' || data.type === 'webrtc_ice_candidate' || data.type === 'call_ended') {
                        await get().handleSignalingMessage(data);
                    } else if (data.type === 'message_read') {
                        const { message_id, conversation_id } = data;
                        get().updateMessageRead(message_id, conversation_id);
                    } else if (data.type === 'message_delivered') {
                        const { message_id, conversation_id } = data;
                        get().updateMessageDelivered(message_id, conversation_id);
                    } else if (data.type === 'message_edited') {
                        const { message_id, conversation_id, new_text } = data;
                        set((state) => ({
                            chats: state.chats.map((chat) => {
                                if (chat.id === conversation_id) {
                                    const newMessages = chat.messages.map((msg) =>
                                        msg.id === message_id ? { ...msg, text: new_text } : msg
                                    );
                                    // Update last message if it was the last one
                                    const lastMsg = newMessages[newMessages.length - 1];
                                    return { ...chat, messages: newMessages, lastMessage: lastMsg ? lastMsg.text : '' };
                                }
                                return chat;
                            })
                        }));
                    } else if (data.type === 'message_deleted') {
                        const { message_id, conversation_id, deleted_by } = data;
                        set((state) => ({
                            chats: state.chats.map((chat) => {
                                if (chat.id === conversation_id) {
                                    const newMessages = chat.messages.map((msg) => {
                                        if (msg.id === message_id) {
                                            // Replace with deleted placeholder
                                            return {
                                                ...msg,
                                                text: `Deleted by ${deleted_by || 'user'}`,
                                                isDeleted: true,
                                                file: undefined,
                                                file_type: undefined,
                                                file_name: undefined,
                                            };
                                        }
                                        return msg;
                                    });
                                    const lastMsg = newMessages.length > 0 ? newMessages[newMessages.length - 1].text : '';
                                    return { ...chat, messages: newMessages, lastMessage: lastMsg };
                                }
                                return chat;
                            })
                        }));
                    } else if (data.type === 'message_reaction') {
                        const { message_id, conversation_id, reactions } = data;
                        set((state) => ({
                            chats: state.chats.map((chat) => {
                                if (chat.id === conversation_id) {
                                    const newMessages = chat.messages.map((msg) =>
                                        msg.id === message_id ? { ...msg, reactions: reactions } : msg
                                    );
                                    return { ...chat, messages: newMessages };
                                }
                                return chat;
                            })
                        }));

                        // Reaction Notification
                        if (get().activeChatId !== conversation_id.toString()) {
                            const chat = get().chats.find(c => c.id === conversation_id.toString());
                            const senderName = chat?.name || 'Someone';

                            scheduleLocalNotification(
                                `Jarvis - New Reaction from ${senderName}`,
                                `${reactions[0]} to your message`,
                                { chatId: conversation_id }
                            );
                        }
                    } else if (data.message) {
                        const msg = data.message;
                        msg.id = msg.id.toString();
                        msg.timestamp = new Date(msg.timestamp);
                        msg.isRead = msg.is_read || false;
                        msg.isDelivered = msg.is_delivered || false;
                        // Handle backend inconsistency: conversation vs conversation_id
                        msg.conversation_id = (msg.conversation_id || msg.conversation)?.toString();

                        // Download media file locally if present (non-blocking)
                        if (msg.file) {
                            const fullMediaUrl = getMediaUrl(msg.file);
                            msg.remoteFile = msg.file; // Keep remote path

                            if (fullMediaUrl) {
                                // Check if file already exists locally first
                                const { getLocalMediaUri } = require('@/utils/media');
                                const existingLocalUri = getLocalMediaUri(msg.id.toString());

                                if (existingLocalUri) {
                                    // File already downloaded, use local URI immediately
                                    msg.file = existingLocalUri;
                                } else {
                                    // Start download in background, don't await
                                    downloadMedia(fullMediaUrl, msg.id.toString()).then(localUri => {
                                        if (localUri && localUri !== msg.file) {
                                            // Only update if we got a valid local URI
                                            set((state) => ({
                                                chats: state.chats.map((chat) => {
                                                    if (chat.id === msg.conversation_id) {
                                                        return {
                                                            ...chat,
                                                            messages: chat.messages.map((m) =>
                                                                m.id === msg.id ? { ...m, file: localUri } : m
                                                            ),
                                                        };
                                                    }
                                                    return chat;
                                                })
                                            }));
                                        }
                                    }).catch(err => console.error('[Media] Background download failed:', err));
                                }
                            }

                            // Infer file type from extension if not provided by backend
                            if (!msg.file_type && msg.file) {
                                const ext = msg.file.split('.').pop()?.toLowerCase();
                                if (ext === 'jpg' || ext === 'jpeg' || ext === 'png' || ext === 'gif' || ext === 'webp') {
                                    msg.file_type = `image/${ext === 'jpg' ? 'jpeg' : ext}`;
                                } else if (ext === 'mp4' || ext === 'mov' || ext === 'avi' || ext === 'webm') {
                                    msg.file_type = `video/${ext}`;
                                } else if (ext === 'pdf') {
                                    msg.file_type = 'application/pdf';
                                }
                            }

                            // Infer file name from path if not provided
                            if (!msg.file_name && msg.file) {
                                msg.file_name = msg.file.split('/').pop() || 'Attachment';
                            }
                        }

                        const currentUser = get().user?.username;
                        const senderUsername = typeof msg.sender === 'object' ? msg.sender.username : msg.sender;
                        msg.sender = senderUsername === currentUser ? 'me' : 'them';

                        get().addMessage(msg);

                        if (msg.sender === 'them') {
                            get().markDelivered(msg.conversation_id, msg.id);

                            // Check if user is in this chat
                            if (get().activeChatId === msg.conversation_id?.toString()) {
                                get().markRead(msg.conversation_id, msg.id);
                            } else {
                                // Increment unread count
                                set((state) => ({
                                    chats: state.chats.map((c) =>
                                        c.id === msg.conversation_id?.toString()
                                            ? { ...c, unreadCount: (c.unreadCount || 0) + 1 }
                                            : c
                                    )
                                }));

                                // Format body
                                let body = msg.text;
                                if (msg.reply_to) {
                                    body = `Replying to you: ${msg.text}`;
                                }

                                scheduleLocalNotification(
                                    `Jarvis - New Message from ${senderUsername}`,
                                    body,
                                    { chatId: msg.conversation_id }
                                );
                            }
                        }

                        // Save to DB
                        database.saveMessage(msg, msg.conversation_id);
                    }
                } catch (err) {
                    console.error('[WS] Parse error:', err);
                }
            };

            ws.onerror = (e) => {
                console.error('[WS] Error:', e);
            };

            ws.onclose = () => {
                console.log('[WS] Disconnected');
                set({ socket: null });

                // Auto-reconnect logic
                const { token } = get();
                if (token) {
                    console.log('[WS] Attempting to reconnect in 10s...');
                    setTimeout(() => {
                        const currentState = get();
                        if (currentState.token && !currentState.socket) {
                            console.log('[WS] Reconnecting now...');
                            currentState.connectWebSocket();
                        }
                    }, 10000);
                }
            };

            set({ socket: ws });
        },

        fetchCalls: async (loadMore = false) => {
            const { token, calls, callsOffset, hasMoreCalls } = get();
            if (!token) return;

            // If loading more and no more data, stop
            if (loadMore && !hasMoreCalls) return;

            // If refreshing (not loading more), reset offset
            const currentOffset = loadMore ? callsOffset : 0;
            const limit = 20;

            try {
                const newCalls = await api.chat.getCalls(token, limit, currentOffset);

                if (newCalls.length === 0) {
                    set({ hasMoreCalls: false });
                    return;
                }

                set((state) => {
                    let updatedCalls;
                    if (loadMore) {
                        // De-duplicate by ID just in case
                        const existingIds = new Set(state.calls.map(c => c.id));
                        const uniqueNewCalls = newCalls.filter((c: any) => !existingIds.has(c.id));
                        updatedCalls = [...state.calls, ...uniqueNewCalls];
                    } else {
                        updatedCalls = newCalls;
                    }

                    return {
                        calls: updatedCalls,
                        callsOffset: currentOffset + newCalls.length,
                        hasMoreCalls: newCalls.length >= limit
                    };
                });
            } catch (e) {
                console.error('Fetch calls failed', e);
            }
        },

        fetchChats: async () => {
            const { token } = get();

            const localChats = await database.getConversations();
            if (localChats.length > 0) {
                set((state) => {
                    const merged = localChats.map(local => {
                        const existing = state.chats.find(c => c.id === local.id);
                        if (existing && existing.messages.length > 0) {
                            return {
                                ...local,
                                messages: existing.messages,
                                hasMore: existing.hasMore
                            };
                        }
                        return local;
                    });
                    return { chats: merged };
                });
            }

            if (!token) return;

            const netState = await NetInfo.fetch();
            if (!netState.isConnected) return;

            try {
                const conversations = await api.chat.getConversations(token);
                const newChatsData = conversations.map((c: any) => {
                    const participant = c.participants.find((p: any) => p.username !== get().user?.username);
                    return {
                        id: c.id.toString(),
                        name: participant?.username || 'Unknown',
                        avatar: participant?.profile_picture || null,
                        last_seen: participant?.last_seen || null,
                        is_online: participant?.is_online || false,
                        lastMessage: c.last_message?.text || '',
                        lastMessageTime: c.last_message ? new Date(c.last_message.timestamp) : new Date(),
                        unreadCount: c.unread_count || 0,
                        messages: [],
                        user_id: c.other_user_id || participant?.id // Add user_id from backend
                    };
                });

                set((state) => {
                    const apiChatMap = new Map(newChatsData.map((c: any) => [c.id, c]));

                    const updatedExisting = state.chats.map(existing => {
                        const apiData = apiChatMap.get(existing.id);
                        if (apiData) {
                            return {
                                ...existing,
                                ...apiData,
                                messages: existing.messages,
                                hasMore: existing.hasMore
                            };
                        }
                        return existing;
                    });

                    const currentIds = new Set(updatedExisting.map(c => c.id));
                    const newFromApi = newChatsData.filter((c: any) => !currentIds.has(c.id));

                    return {
                        chats: [...updatedExisting, ...newFromApi].sort((a, b) => {
                            const timeA = a.lastMessageTime ? new Date(a.lastMessageTime).getTime() : 0;
                            const timeB = b.lastMessageTime ? new Date(b.lastMessageTime).getTime() : 0;
                            return timeB - timeA;
                        })
                    };
                });

                // Save to DB
                const { chats } = get();
                for (const chat of chats) {
                    await database.saveConversation(chat);
                }
            } catch (e) {
                console.error(e);
            }
        },

        fetchMessages: async (chatId: string) => {
            const { token } = get();

            const localMessages = await database.getMessages(chatId);
            const unsent = (await database.getUnsentMessages()).filter((m: any) => m.conversation_id === chatId);

            // Sort Newest -> Oldest
            let allMessages = [...localMessages, ...unsent].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

            // Initial View: valid data
            set((state) => ({
                chats: state.chats.map((c) => {
                    if (c.id === chatId) {
                        const existing = c.messages || [];
                        const merged = [...allMessages];
                        const mergedIds = new Set(merged.map(m => m.id));

                        existing.forEach(old => {
                            if (!mergedIds.has(old.id)) {
                                merged.push(old);
                            } else {
                                const index = merged.findIndex(m => m.id === old.id);
                                if (index !== -1 && typeof old.file === 'string' && old.file.startsWith('file://')) {
                                    merged[index].file = old.file;
                                }
                            }
                        });
                        merged.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
                        return { ...c, messages: merged, hasMore: true };
                    }
                    return c;
                })
            }));

            if (!token) return;
            const netState = await NetInfo.fetch();
            if (!netState.isConnected) return;

            try {
                const limit = 20;
                const msgs = await api.chat.getMessages(token, chatId, limit, 0);

                const messages: Message[] = await Promise.all(msgs.map(async (m: any) => {
                    let fileUri = m.file;
                    let remoteFile = m.file;

                    if (m.file) {
                        const fullMediaUrl = getMediaUrl(m.file);
                        if (fullMediaUrl) {
                            const localUri = await downloadMedia(fullMediaUrl, m.id.toString());
                            if (localUri) {
                                fileUri = localUri;
                            }
                        }
                    }

                    return {
                        id: m.id.toString(),
                        text: m.text,
                        sender: m.sender.username === get().user?.username ? 'me' : 'them',
                        timestamp: new Date(m.timestamp),
                        isRead: m.is_read,
                        isDelivered: m.is_delivered,
                        reactions: m.reactions,
                        reply_to: m.reply_to,
                        file: fileUri,
                        remoteFile: remoteFile,
                        file_type: m.file_type,
                        file_name: m.file_name,
                    };
                }));

                const hasMore = messages.length >= limit;

                set((state) => ({
                    chats: state.chats.map((c) => {
                        if (c.id === chatId) {
                            const merged = [...messages];
                            const mergedIds = new Set(merged.map(m => m.id));

                            unsent.forEach(u => {
                                if (!mergedIds.has(u.id)) {
                                    merged.push(u);
                                    mergedIds.add(u.id);
                                }
                            });

                            const existing = c.messages || [];
                            existing.forEach(old => {
                                const indexInMerged = merged.findIndex(m => m.id === old.id);
                                if (indexInMerged !== -1) {
                                    // Preserve local file URI if it exists and is a string
                                    if (typeof old.file === 'string' && old.file.startsWith('file://')) {
                                        merged[indexInMerged].file = old.file;
                                    }
                                } else {
                                    merged.push(old);
                                }
                            });

                            merged.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

                            return {
                                ...c,
                                messages: merged,
                                hasMore: hasMore
                            };
                        }
                        return c;
                    })
                }));

                for (const msg of messages) {
                    await database.saveMessage(msg, chatId);
                }
            } catch (e) {
                console.error(e);
            }
        },

        loadMoreMessages: async (chatId: string) => {
            const { token, chats } = get();
            if (!token) return;

            const chat = chats.find(c => c.id === chatId);
            if (!chat || chat.hasMore === false) return;

            const currentCount = chat.messages.length;
            const limit = 20;

            try {
                const msgs = await api.chat.getMessages(token, chatId, limit, currentCount);
                if (msgs.length === 0) {
                    set((state) => ({
                        chats: state.chats.map((c) => c.id === chatId ? { ...c, hasMore: false } : c)
                    }));
                    return;
                }

                const messages: Message[] = await Promise.all(msgs.map(async (m: any) => {
                    let fileUri = m.file;
                    let remoteFile = m.file;

                    if (m.file) {
                        const fullMediaUrl = getMediaUrl(m.file);
                        if (fullMediaUrl) {
                            const localUri = await downloadMedia(fullMediaUrl, m.id.toString());
                            if (localUri) {
                                fileUri = localUri;
                            }
                        }
                    }

                    return {
                        id: m.id.toString(),
                        text: m.text,
                        sender: m.sender.username === get().user?.username ? 'me' : 'them',
                        timestamp: new Date(m.timestamp),
                        isRead: m.is_read,
                        isDelivered: m.is_delivered,
                        reactions: m.reactions,
                        reply_to: m.reply_to,
                        file: fileUri,
                        remoteFile: remoteFile,
                        file_type: m.file_type,
                        file_name: m.file_name,
                    };
                }));

                const hasMore = messages.length >= limit;

                set((state) => ({
                    chats: state.chats.map((c) =>
                        c.id === chatId ? { ...c, messages: [...c.messages, ...messages], hasMore: hasMore } : c
                    )
                }));

                for (const msg of messages) {
                    await database.saveMessage(msg, chatId);
                }
            } catch (e) {
                console.error('Failed to load more messages', e);
            }
        },

        forwardMessage: async (message: Message, chatIds: string[]) => {
            const { socket } = get();
            const netState = await NetInfo.fetch();

            if (netState.isConnected && socket && socket.readyState === WebSocket.OPEN) {
                for (const chatId of chatIds) {
                    socket.send(JSON.stringify({
                        message: message.text,
                        conversation_id: chatId,
                        ...(message.file && { file: message.file, file_type: message.file_type })
                    }));
                }
            } else {
                for (const chatId of chatIds) {
                    const tempId = `temp_${Date.now()}_${chatId}`;
                    const newMessage: Message = {
                        id: tempId,
                        text: message.text,
                        sender: 'me',
                        timestamp: new Date(),
                        isRead: false,
                        isDelivered: false,
                        isUnsent: true,
                        file: message.file,
                        file_type: message.file_type,
                    };
                    get().addMessage({ ...newMessage, conversation_id: chatId });
                    await database.saveMessage(newMessage, chatId, true);
                }
            }
        }
        ,

        // Mute Notifications
        mutedChats: [],
        muteChat: (chatId: string) => {
            set((state) => {
                const mutedChats = [...state.mutedChats, chatId];
                AsyncStorage.setItem('mutedChats', JSON.stringify(mutedChats)).catch(console.error);
                return { mutedChats };
            });
        },
        unmuteChat: (chatId: string) => {
            set((state) => {
                const mutedChats = state.mutedChats.filter(id => id !== chatId);
                AsyncStorage.setItem('mutedChats', JSON.stringify(mutedChats)).catch(console.error);
                return { mutedChats };
            });
        },
        isChatMuted: (chatId: string) => {
            return get().mutedChats.includes(chatId);
        },

        // Clear Chat
        clearChat: async (chatId: string) => {
            try {
                const { token } = get();
                if (!token) throw new Error('Not authenticated');

                // Clear messages on server
                await api.chat.clearMessages(token, chatId);

                // Clear messages locally
                set((state) => ({
                    chats: state.chats.map((c) =>
                        c.id === chatId ? { ...c, messages: [], lastMessage: '', lastMessageTime: new Date() } : c
                    )
                }));

                // Clear from database
                await database.clearChatMessages(chatId);
            } catch (error) {
                console.error('Failed to clear chat:', error);
                throw error;
            }
        },

        initApp: async () => {
            try {
                // 1. Initialize SQLite
                await database.initDatabase();

                // 2. Load Auth State
                const token = await SecureStore.getItemAsync('token');
                const userStr = await AsyncStorage.getItem('user');
                const theme = (await AsyncStorage.getItem('theme')) as 'system' | 'light' | 'dark' | null;
                const mutedChatsStr = await AsyncStorage.getItem('mutedChats');

                if (token && userStr) {
                    set({ token, user: JSON.parse(userStr) });
                    get().connectWebSocket();
                    get().fetchChats(); // Restore chats from local DB immediately
                }

                if (theme) {
                    set({ theme });
                }

                if (mutedChatsStr) {
                    set({ mutedChats: JSON.parse(mutedChatsStr) });
                }

                set({ hasHydrated: true });
            } catch (e) {
                console.error('App initialization failed:', e);
                set({ hasHydrated: true });
            }
        }
    };
});
