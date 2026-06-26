import { StateCreator } from 'zustand';
import { MediaStream } from 'react-native-webrtc';
import * as Audio from 'expo-audio';
import * as KeepAwake from 'expo-keep-awake';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { webrtcService } from '@/services/webrtc';
import { clearPendingCallIntent } from '@/services/pendingCallIntent';
import { AppState } from '@/store';
import { api } from '@/services/api';

type IncomingCallSource = 'signaling' | 'notification' | 'fcm';

export interface IncomingCallState {
    chatId: string;
    offer: any | null;
    isVideo: boolean;
    callerName?: string;
    callerAvatar?: string;
    callUUID?: string;
    source: IncomingCallSource;
    awaitingOffer: boolean;
}

interface CallState {
    isCalling: boolean;
    incomingCall: IncomingCallState | null;
    remoteStream: MediaStream | null;
    localStream: MediaStream | null;
    activeChatId: string | null;
    activeCallUUID: string | null;
    bufferedCandidates: any[];
    isMinimized: boolean;
    isVideo?: boolean;
    isRequestingPermissions: boolean;
    connectionState: string;
    startTime: number | null;
    isInitiator?: boolean;
}

export interface CallSlice {
    callState: CallState;
    startCall: (chatId: string, isVideo?: boolean) => Promise<void>;
    endCall: () => void;
    acceptCall: () => Promise<void>;
    seedIncomingCall: (incomingCall: Omit<IncomingCallState, 'offer' | 'awaitingOffer'> & { offer?: any | null; awaitingOffer?: boolean }) => void;
    clearIncomingCall: () => void;
    handleSignalingMessage: (message: any) => Promise<void>;
    setIsMinimized: (isMinimized: boolean) => void;
    setupWebRTCListeners: (chatId: string, callUUID?: string | null) => void;
}

// These would normally be inside the component or a dedicated service, but kept for parity
let callSound: any = null;
let ringtoneActive = false;
const SIGNALING_SOCKET_WAIT_MS = 4000;
const SIGNALING_SOCKET_POLL_MS = 100;

const createCallUUID = () => `call_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;

const playRingtone = async (isIncoming: boolean) => {
    try {
        if (ringtoneActive) return;
        ringtoneActive = true;
        await Audio.setAudioModeAsync({
            playsInSilentMode: true,
            interruptionMode: 'doNotMix',
            allowsRecording: true,
            shouldRouteThroughEarpiece: false,
            shouldPlayInBackground: true,
        });
        if (callSound) {
            callSound.pause();
            callSound = null;
        }
        const source = isIncoming
            ? require('@/assets/sounds/incoming_call.mp3')
            : require('@/assets/sounds/outgoing_call.wav');
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
        ringtoneActive = false;
        if (callSound) {
            // expo-audio uses .pause() or .stop() - safely handling cleanup
            if (typeof callSound.pause === 'function') callSound.pause();
            callSound = null;
        }
    } catch (e) {
        console.log('Error stopping ringtone', e);
    }
};

const getOpenSignalingSocket = (get: () => AppState): WebSocket | null => {
    const socket = (get() as any).socket as WebSocket | null;
    if (socket && socket.readyState === WebSocket.OPEN) {
        return socket;
    }
    return null;
};

const waitForOpenSignalingSocket = async (get: () => AppState): Promise<WebSocket | null> => {
    const state = get() as any;
    if (state.connectWebSocket) {
        state.connectWebSocket();
    }

    const deadline = Date.now() + SIGNALING_SOCKET_WAIT_MS;
    while (Date.now() < deadline) {
        const socket = getOpenSignalingSocket(get);
        if (socket) {
            return socket;
        }

        await new Promise((resolve) => setTimeout(resolve, SIGNALING_SOCKET_POLL_MS));
    }

    return null;
};

const sendSignalingMessage = async (
    get: () => AppState,
    payload: Record<string, any> & { type: string },
    options: { waitForOpen?: boolean } = {}
) => {
    let socket = getOpenSignalingSocket(get);
    if (!socket && options.waitForOpen) {
        socket = await waitForOpenSignalingSocket(get);
    }

    if (!socket) {
        console.warn(`[CallSlice] Signaling socket is not open for ${payload.type}`);
        return false;
    }

    try {
        socket.send(JSON.stringify(payload));
        return true;
    } catch (error) {
        console.error(`[CallSlice] Failed to send ${payload.type}:`, error);
        return false;
    }
};

const buildIncomingCallState = (
    nextIncomingCall: Omit<IncomingCallState, 'offer' | 'awaitingOffer'> & { offer?: any | null; awaitingOffer?: boolean },
    existingIncomingCall: IncomingCallState | null
): IncomingCallState => {
    const offer = nextIncomingCall.offer ?? existingIncomingCall?.offer ?? null;

    return {
        chatId: nextIncomingCall.chatId,
        offer,
        isVideo: nextIncomingCall.isVideo,
        callerName: nextIncomingCall.callerName ?? existingIncomingCall?.callerName ?? '',
        callerAvatar: nextIncomingCall.callerAvatar ?? existingIncomingCall?.callerAvatar ?? '',
        callUUID: nextIncomingCall.callUUID ?? existingIncomingCall?.callUUID,
        source: nextIncomingCall.source ?? existingIncomingCall?.source ?? 'notification',
        awaitingOffer: nextIncomingCall.awaitingOffer ?? !offer,
    };
};

const isSameCall = (
    existingIncomingCall: IncomingCallState | null,
    chatId: string,
    callUUID?: string | null
) => {
    if (!existingIncomingCall) {
        return false;
    }

    if (callUUID && existingIncomingCall.callUUID) {
        return existingIncomingCall.callUUID === callUUID;
    }

    return existingIncomingCall.chatId === chatId;
};

export const createCallSlice: StateCreator<AppState, [], [], CallSlice> = (set, get) => ({
    callState: {
        isCalling: false,
        incomingCall: null,
        remoteStream: null,
        localStream: null,
        activeChatId: null,
        activeCallUUID: null,
        bufferedCandidates: [],
        isMinimized: false,
        isRequestingPermissions: false,
        connectionState: 'new',
        startTime: null,
        isInitiator: false,
    },
    setIsMinimized: (isMinimized) => set((state) => ({
        callState: { ...state.callState, isMinimized }
    })),
    seedIncomingCall: (incomingCall) => {
        const { callState } = get();
        if (callState.isCalling && callState.activeChatId && callState.activeChatId !== incomingCall.chatId) {
            console.log('[CallSlice] Ignoring incoming call while another call is active');
            return;
        }

        set((state) => ({
            callState: {
                ...state.callState,
                incomingCall: buildIncomingCallState(incomingCall, state.callState.incomingCall),
                isMinimized: false,
            }
        }));
        playRingtone(true);
    },
    clearIncomingCall: () => {
        void clearPendingCallIntent();
        stopRingtone();
        set((state) => ({
            callState: {
                ...state.callState,
                incomingCall: null,
            }
        }));
    },
    setupWebRTCListeners: (chatId: string, callUUID?: string | null) => {
        webrtcService.onRemoteStream = (stream) => {
            console.log('[CallSlice] 📺 Remote stream received, tracks:', stream.getTracks().length);
            set((state) => ({
                callState: { ...state.callState, remoteStream: stream }
            }));
        };

        webrtcService.onIceCandidate = async (candidate) => {
            console.log(`[CallSlice] 🧊 Sending ICE Candidate for chat: ${chatId}`);
            await sendSignalingMessage(get, {
                    type: 'webrtc_ice_candidate',
                    chat_id: chatId, // Changed from conversation_id
                    ...(callUUID ? { call_uuid: callUUID } : {}),
                    candidate
                }, { waitForOpen: true });
        };

        webrtcService.onConnectionStateChange = (state) => {
            const normalizedState = state || 'unknown';
            console.log('[CallSlice] 🌐 Connection State:', normalizedState);
            set((s) => ({
                callState: { 
                    ...s.callState, 
                    connectionState: normalizedState,
                    startTime: (normalizedState === 'connected' && !s.callState.startTime) ? Date.now() : s.callState.startTime
                }
            }));
            
            if (normalizedState === 'connected') {
                stopRingtone();
            }
        };
    },
    startCall: async (chatId, isVideo = true) => {
        const callUUID = createCallUUID();
        set((state) => ({
            callState: {
                ...state.callState,
                isCalling: true,
                activeChatId: chatId,
                activeCallUUID: callUUID,
                isMinimized: false,
                bufferedCandidates: [],
                isVideo,
                isRequestingPermissions: true,
                isInitiator: true
            }
        }));
        try {
            const audioStatus = await Audio.requestRecordingPermissionsAsync();
            const cameraStatus = await ImagePicker.requestCameraPermissionsAsync();
            set((state) => ({
                callState: { ...state.callState, isRequestingPermissions: false }
            }));
            if (audioStatus.status !== 'granted' || (isVideo && cameraStatus.status !== 'granted')) {
                (get() as any).showAlert('Permission Required', 'Camera and Microphone permissions are needed for calls.');
                get().endCall();
                return;
            }
            KeepAwake.activateKeepAwakeAsync();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            playRingtone(false);
            
            // Note: Modern expo-audio manages sessions automatically; setAudioModeAsync is deprecated/removed in expo-audio
            // We only keep functional routing if strictly needed.
            
            const stream = await webrtcService.getLocalStream(isVideo);
            set((state) => ({
                callState: { ...state.callState, localStream: stream }
            }));

            const signalingSocket = await waitForOpenSignalingSocket(get);
            if (!signalingSocket) {
                (get() as any).showToast('error', 'Call unavailable', 'Still connecting to chat server. Please try again in a moment.');
                get().endCall();
                return;
            }

            (get() as any).setupWebRTCListeners(chatId, callUUID);
            const offer = await webrtcService.createOffer();
            const offerSent = await sendSignalingMessage(get, {
                    type: 'webrtc_offer',
                    chat_id: chatId, // Changed from conversation_id
                    call_uuid: callUUID,
                    offer,
                    is_video: isVideo // Added missing field
                });

            if (!offerSent) {
                (get() as any).showToast('error', 'Call unavailable', 'Still connecting to chat server. Please try again in a moment.');
                get().endCall();
                return;
            }
            console.log(`[CallSlice] 📡 Sent webrtc_offer for chat: ${chatId}, Video: ${isVideo}`);
        } catch (e) {
            console.error('[CallSlice] ❌ Start call failed:', e);
            get().endCall();
        }
    },
    acceptCall: async () => {
        const { callState } = get();
        if (!callState.incomingCall) {
            console.warn('[AcceptCall] No incoming call found in state');
            return;
        }
        
        // Concurrency Lock: Prevent double-execution if user triple-taps Answer
        if (callState.isRequestingPermissions || callState.isCalling) {
            console.warn('[AcceptCall] Already processing accept, ignoring duplicate call');
            return;
        }

        const { chatId, callUUID, offer, isVideo } = callState.incomingCall;
        if (!offer) {
            console.warn('[AcceptCall] Missing WebRTC offer, waiting for signaling to catch up');
            get().showToast('info', 'Reconnecting to call', 'Waiting for the caller connection to resume.');
            return;
        }

        console.log('[AcceptCall] Accepting from:', chatId, 'isVideo:', isVideo, 'offerPrefix:', offer?.sdp?.substring(0, 50));
        stopRingtone();
        void clearPendingCallIntent();
        
        // Instantly transition state to lock out additional taps and dismiss modals
        set((state) => ({
            callState: { 
                ...state.callState, 
                isCalling: true, 
                activeChatId: chatId, 
                activeCallUUID: callUUID || null,
                isVideo, 
                isRequestingPermissions: true,
                incomingCall: null, // Clear incoming call immediately to force UI remount
                isInitiator: false
            }
        }));
        try {
            const audioStatus = await Audio.requestRecordingPermissionsAsync();
            const cameraStatus = await ImagePicker.requestCameraPermissionsAsync();
            set((state) => ({
                callState: { ...state.callState, isRequestingPermissions: false }
            }));
            if (audioStatus.status !== 'granted' || (isVideo && cameraStatus.status !== 'granted')) {
                (get() as any).showAlert('Permission Required', 'Camera and Microphone permissions are needed for calls.');
                get().endCall();
                return;
            }
            KeepAwake.activateKeepAwakeAsync();
            await Audio.setAudioModeAsync({
                playsInSilentMode: true,
                allowsRecording: true,
                interruptionMode: 'doNotMix',
                shouldRouteThroughEarpiece: !isVideo,
            });
            const stream = await webrtcService.getLocalStream(isVideo);
            set((state) => ({
                callState: { ...state.callState, localStream: stream }
            }));

            const signalingSocket = await waitForOpenSignalingSocket(get);
            if (!signalingSocket) {
                (get() as any).showToast('error', 'Call unavailable', 'Lost connection to the chat server while answering.');
                get().endCall();
                return;
            }

            (get() as any).setupWebRTCListeners(chatId, callUUID);
            const answer = await webrtcService.createAnswer(offer);
            const answerSent = await sendSignalingMessage(get, {
                    type: 'webrtc_answer',
                    chat_id: chatId, // Changed from conversation_id
                    ...(callUUID ? { call_uuid: callUUID } : {}),
                    answer,
                    is_video: isVideo // Consistent with offer
                });

            if (!answerSent) {
                (get() as any).showToast('error', 'Call unavailable', 'Lost connection to the chat server while answering.');
                get().endCall();
                return;
            }
            console.log(`[CallSlice] ✅ Sent webrtc_answer for chat: ${chatId}`);
            if (callState.bufferedCandidates.length > 0) {
                console.log('[AcceptCall] 🚰 Draining', callState.bufferedCandidates.length, 'buffered candidates');
                for (const candidate of callState.bufferedCandidates) {
                    await webrtcService.addIceCandidate(candidate);
                }
                set((state) => ({
                    callState: { ...state.callState, bufferedCandidates: [] }
                }));
            }
        } catch (e) {
            console.error('Accept call failed', e);
            get().endCall();
        }
    },
    endCall: () => {
        const { callState } = get() as any;
        console.log('[EndCall] Cleaning up call state');
        void clearPendingCallIntent();
        stopRingtone();
        webrtcService.closeConnection();
        KeepAwake.deactivateKeepAwake();
        if (callState.activeChatId) {
            console.log(`[CallSlice] 🔴 Sending call_ended for chat: ${callState.activeChatId}`);
            void sendSignalingMessage(get, {
                type: 'call_ended',
                chat_id: callState.activeChatId, // Changed from conversation_id
                ...(callState.activeCallUUID ? { call_uuid: callState.activeCallUUID } : {}),
            });
        }

        const token = (get() as any).token;
        const chats = (get() as any).chats;
        const activeChat = chats?.find((c: any) => c.id.toString() === callState.activeChatId?.toString());
        const receiverUsername = activeChat ? activeChat.name : null;

        if (token && callState.isInitiator && callState.activeChatId && receiverUsername) {
            const endedAt = new Date().toISOString();
            const startedAt = callState.startTime 
                ? new Date(callState.startTime).toISOString() 
                : new Date().toISOString();
            const status = callState.startTime ? 'completed' : 'missed';
            
            console.log(`[CallSlice] Logging call to history for: ${receiverUsername}, status: ${status}`);
            void api.chat.logCall(token, {
                receiver_username: receiverUsername,
                started_at: startedAt,
                ended_at: endedAt,
                status: status,
                is_video: !!callState.isVideo
            }).then(() => {
                void (get() as any).fetchCalls?.(false);
            }).catch((err) => {
                console.error('[CallSlice] Failed to log call:', err);
            });
        }
        set((state) => ({
            callState: {
                isCalling: false,
                incomingCall: null,
                remoteStream: null,
                localStream: null,
                activeChatId: null,
                activeCallUUID: null,
                bufferedCandidates: [],
                isMinimized: false,
                isRequestingPermissions: false,
                connectionState: 'closed',
                startTime: null,
                isInitiator: false,
            }
        }));
    },
    handleSignalingMessage: async (data) => {
        const { callState } = get();
        switch (data.type) {
            case 'webrtc_offer':
                console.log('[Signaling] Received offer from chat:', data.chat_id || data.conversation_id);
                if (callState.isCalling) {
                    console.log('[Signaling] Busy, rejecting offer');
                    // Optional: send busy signal
                    return;
                }
                set((state) => {
                    const chatId = String(data.chat_id || data.conversation_id);
                    const callUUID = data.call_uuid || data.callUUID || null;
                    const existingIncomingCall = state.callState.incomingCall;
                    const isSamePendingCall = isSameCall(existingIncomingCall, chatId, callUUID);

                    return {
                        callState: {
                            ...state.callState,
                            incomingCall: buildIncomingCallState(
                                {
                                    chatId,
                                    offer: data.offer,
                                    isVideo: !!data.is_video,
                                    callerName: data.caller_name || existingIncomingCall?.callerName || '',
                                    callerAvatar: data.caller_avatar || existingIncomingCall?.callerAvatar || '',
                                    callUUID: callUUID || existingIncomingCall?.callUUID,
                                    source: isSamePendingCall ? (existingIncomingCall?.source ?? 'signaling') : 'signaling',
                                    awaitingOffer: false,
                                },
                                isSamePendingCall ? existingIncomingCall : null
                            )
                        }
                    };
                });
                playRingtone(true);
                break;
            case 'webrtc_answer':
                console.log('[Signaling] Received answer');
                stopRingtone();
                await webrtcService.handleAnswer(data.answer);
                break;
            case 'webrtc_ice_candidate':
                console.log('[Signaling] Received ICE candidate');
                if (webrtcService.isRemoteDescriptionSet()) {
                    await webrtcService.addIceCandidate(data.candidate);
                } else {
                    console.log('[Signaling] Buffering candidate');
                    set((state) => ({
                        callState: { ...state.callState, bufferedCandidates: [...state.callState.bufferedCandidates, data.candidate] }
                    }));
                }
                break;
            case 'call_ended':
                console.log('[Signaling] Call ended by remote for chat:', data.chat_id || data.conversation_id);
                if (
                    callState.incomingCall &&
                    !callState.isCalling &&
                    isSameCall(
                        callState.incomingCall,
                        String(data.chat_id || data.conversation_id),
                        data.call_uuid || data.callUUID || null
                    )
                ) {
                    get().clearIncomingCall();
                    get().showToast('info', 'Call ended', 'The caller hung up before the call could reconnect.');
                    return;
                }
                get().endCall();
                break;
        }
    },
});
