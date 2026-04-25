import { StateCreator } from 'zustand';
import { MediaStream } from 'react-native-webrtc';
import * as Audio from 'expo-audio';
import * as KeepAwake from 'expo-keep-awake';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { webrtcService } from '@/services/webrtc';
import { AppState } from '@/store';

interface CallState {
    isCalling: boolean;
    incomingCall: { chatId: string, offer: any, isVideo: boolean, callerName?: string, callerAvatar?: string } | null;
    remoteStream: MediaStream | null;
    localStream: MediaStream | null;
    activeChatId: string | null;
    bufferedCandidates: any[];
    isMinimized: boolean;
    isVideo?: boolean;
    isRequestingPermissions: boolean;
    connectionState: string;
}

export interface CallSlice {
    callState: CallState;
    startCall: (chatId: string, isVideo?: boolean) => Promise<void>;
    endCall: () => void;
    acceptCall: () => Promise<void>;
    handleSignalingMessage: (message: any) => Promise<void>;
    setIsMinimized: (isMinimized: boolean) => void;
    setupWebRTCListeners: (chatId: string) => void;
}

// These would normally be inside the component or a dedicated service, but kept for parity
let callSound: any = null;
let ringtoneActive = false;

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

export const createCallSlice: StateCreator<AppState, [], [], CallSlice> = (set, get) => ({
    callState: {
        isCalling: false,
        incomingCall: null,
        remoteStream: null,
        localStream: null,
        activeChatId: null,
        bufferedCandidates: [],
        isMinimized: false,
        isRequestingPermissions: false,
        connectionState: 'new',
    },
    setIsMinimized: (isMinimized) => set((state) => ({
        callState: { ...state.callState, isMinimized }
    })),
    setupWebRTCListeners: (chatId: string) => {
        const { socket } = get() as any;

        webrtcService.onRemoteStream = (stream) => {
            console.log('[CallSlice] 📺 Remote stream received, tracks:', stream.getTracks().length);
            set((state) => ({
                callState: { ...state.callState, remoteStream: stream }
            }));
        };

        webrtcService.onIceCandidate = (candidate) => {
            if (socket) {
                console.log(`[CallSlice] 🧊 Sending ICE Candidate for chat: ${chatId}`);
                socket.send(JSON.stringify({
                    type: 'webrtc_ice_candidate',
                    chat_id: chatId, // Changed from conversation_id
                    candidate
                }));
            }
        };

        webrtcService.onConnectionStateChange = (state) => {
            console.log('[CallSlice] 🌐 Connection State:', state);
            set((s) => ({
                callState: { ...s.callState, connectionState: state }
            }));
            
            if (state === 'connected') {
                stopRingtone();
            }
        };
    },
    startCall: async (chatId, isVideo = true) => {
        set((state) => ({
            callState: { ...state.callState, isCalling: true, activeChatId: chatId, isMinimized: false, bufferedCandidates: [], isVideo, isRequestingPermissions: true }
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
            
            (get() as any).setupWebRTCListeners(chatId);
            const offer = await webrtcService.createOffer();
            const { socket } = get() as any;
            if (socket) {
                console.log(`[CallSlice] 📡 Sending webrtc_offer for chat: ${chatId}, Video: ${isVideo}`);
                socket.send(JSON.stringify({
                    type: 'webrtc_offer',
                    chat_id: chatId, // Changed from conversation_id
                    offer,
                    is_video: isVideo // Added missing field
                }));
            }
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

        const { chatId, offer, isVideo } = callState.incomingCall;
        console.log('[AcceptCall] Accepting from:', chatId, 'isVideo:', isVideo, 'offerPrefix:', offer?.sdp?.substring(0, 50));
        stopRingtone();
        
        // Instantly transition state to lock out additional taps and dismiss modals
        set((state) => ({
            callState: { 
                ...state.callState, 
                isCalling: true, 
                activeChatId: chatId, 
                isVideo, 
                isRequestingPermissions: true,
                incomingCall: null // Clear incoming call immediately to force UI remount
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
            
            (get() as any).setupWebRTCListeners(chatId);
            const answer = await webrtcService.createAnswer(offer);
            const { socket } = get() as any;
            if (socket) {
                console.log(`[CallSlice] ✅ Sending webrtc_answer for chat: ${chatId}`);
                socket.send(JSON.stringify({
                    type: 'webrtc_answer',
                    chat_id: chatId, // Changed from conversation_id
                    answer,
                    is_video: isVideo // Consistent with offer
                }));
            }
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
        const { callState, socket } = get() as any;
        console.log('[EndCall] Cleaning up call state');
        stopRingtone();
        webrtcService.closeConnection();
        KeepAwake.deactivateKeepAwake();
        if (socket && callState.activeChatId) {
            console.log(`[CallSlice] 🔴 Sending call_ended for chat: ${callState.activeChatId}`);
            socket.send(JSON.stringify({
                type: 'call_ended',
                chat_id: callState.activeChatId // Changed from conversation_id
            }));
        }
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
                connectionState: 'closed',
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
                set((state) => ({
                    callState: { 
                        ...state.callState, 
                        incomingCall: { 
                            chatId: data.chat_id || data.conversation_id, // Fallback for safety
                            offer: data.offer, 
                            isVideo: !!data.is_video,
                            callerName: data.caller_name || '',
                            callerAvatar: data.caller_avatar || ''
                        } 
                    }
                }));
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
                get().endCall();
                break;
        }
    },
});
