import {
    RTCPeerConnection,
    RTCIceCandidate,
    RTCSessionDescription,
    mediaDevices,
    MediaStream,
} from 'react-native-webrtc';
import * as Audio from 'expo-audio';

class WebRTCService {
    peerConnection: RTCPeerConnection | null = null;
    localStream: MediaStream | null = null;
    remoteStream: MediaStream | null = null;
    onRemoteStream: ((stream: MediaStream) => void) | null = null;
    onIceCandidate: ((candidate: RTCIceCandidate) => void) | null = null;
    onIceRestart: ((offer: RTCSessionDescription) => void) | null = null;

    configuration: RTCConfiguration = {
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun.ekiga.net' },
            { urls: 'stun:stun.ideasip.com' },
            // Public TURN servers for better connectivity
            {
                urls: 'turn:openrelay.metered.ca:80',
                username: 'openrelayproject',
                credential: 'openrelayproject',
            },
            {
                urls: 'turn:openrelay.metered.ca:443',
                username: 'openrelayproject',
                credential: 'openrelayproject',
            },
            { urls: 'stun:stun2.l.google.com:19302' },
            { urls: 'stun:stun3.l.google.com:19302' },
            { urls: 'stun:stun4.l.google.com:19302' },
        ],
        iceTransportPolicy: 'all' as RTCIceTransportPolicy,
        bundlePolicy: 'max-bundle' as RTCBundlePolicy,
        rtcpMuxPolicy: 'require' as RTCRtcpMuxPolicy,
        // @ts-ignore
        sdpSemantics: 'unified-plan',
        iceCandidatePoolSize: 0, // Disable early candidate pooling to stabilize trickle
    };

    async startLocalStream(isVideo: boolean = true) {
        try {
            const stream = await mediaDevices.getUserMedia({
                audio: true,
                video: isVideo ? {
                    width: 640,
                    height: 480,
                    frameRate: 30,
                    facingMode: 'user', // Front camera
                } : false,
            });
            this.localStream = stream;
            stream.getTracks().forEach(track => {
                console.log(`[WebRTC] Local track started: Kind=${track.kind}, ID=${track.id}, Enabled=${track.enabled}, Muted=${track.muted}`);
            });
            return stream;
        } catch (error) {
            console.error('Error starting local stream:', error);
            throw error;
        }
    }

    createPeerConnection() {
        if (this.peerConnection) {
            this.peerConnection.close();
        }

        this.peerConnection = new RTCPeerConnection(this.configuration);

        (this.peerConnection as any).onicecandidate = (event: any) => {
            if (event.candidate && this.onIceCandidate) {
                this.onIceCandidate(event.candidate);
            }
        };

        (this.peerConnection as any).onconnectionstatechange = async (event: any) => {
            console.log('[WebRTC] 🌐 Connection State:', this.peerConnection?.connectionState);
            if (this.peerConnection?.connectionState === 'failed') {
                console.warn('[WebRTC] ⚠️ Connection failed, attempting ICE restart...');
                const offer = await this.restartIce();
                if (offer && this.onIceRestart) {
                    this.onIceRestart(offer);
                }
            }
        };

        (this.peerConnection as any).onsignalingstatechange = () => {
            console.log('[WebRTC] 📶 Signaling State Change:', this.peerConnection?.signalingState);
        };

        (this.peerConnection as any).oniceconnectionstatechange = (event: any) => {
            console.log('[WebRTC] ICE Connection State:', this.peerConnection?.iceConnectionState);
            if (this.peerConnection?.iceConnectionState === 'failed') {
                console.log('[WebRTC] ICE connection failed');
            }
        };

        (this.peerConnection as any).onicegatheringstatechange = (event: any) => {
            console.log('[WebRTC] ICE Gathering State:', this.peerConnection?.iceGatheringState);
        };

        (this.peerConnection as any).ontrack = (event: any) => {
            console.log(`[WebRTC] 🎵 ontrack event: Kind=${event.track?.kind}, ID=${event.track?.id}, Enabled=${event.track?.enabled}, Muted=${event.track?.muted}`);

            // Use the existing remoteStream or create a new one
            if (!this.remoteStream) {
                console.log('[WebRTC] Creating new MediaStream for remote tracks');
                this.remoteStream = new MediaStream();
            }

            // Ensure the track is added to our tracked stream
            if (event.track) {
                // Clear existing tracks of the same kind to prevent "stale" tracks
                // IMPORTANT: We remove from stream but DO NOT call track.stop() to avoid killing the underlying flow
                this.remoteStream.getTracks().forEach(track => {
                    if (track.kind === event.track.kind && track.id !== event.track.id) {
                        console.log(`[WebRTC] Removing stale ${track.kind} track: ${track.id}`);
                        this.remoteStream?.removeTrack(track);
                    }
                });

                event.track.enabled = true; // Force enable

                // Only add if not already present
                const exists = this.remoteStream.getTracks().some(t => t.id === event.track.id);
                if (!exists) {
                    console.log(`[WebRTC] Attaching ${event.track.kind} track to remote stream`);
                    this.remoteStream.addTrack(event.track);
                } else {
                    console.log(`[WebRTC] Track ${event.track.id} already attached`);
                }

                // Track state listener
                event.track.onmute = () => console.log(`[WebRTC] Track ${event.track.id} (${event.track.kind}) muted`);
                event.track.onunmute = () => console.log(`[WebRTC] Track ${event.track.id} (${event.track.kind}) unmuted`);
            }

            if (this.onRemoteStream) {
                console.log(`[WebRTC] Notifying store of remote stream update. Tracks: ${this.remoteStream.getTracks().length}`);
                this.onRemoteStream(this.remoteStream);
            }
        };

        // Add local stream tracks to peer connection
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => {
                this.peerConnection?.addTrack(track, this.localStream!);
            });
        }
    }

    async createOffer() {
        console.log('[WebRTC] Creating offer...');
        if (!this.peerConnection) {
            console.error('[WebRTC] Peer connection missing in createOffer');
            throw new Error('Peer connection not created. Call createPeerConnection() first.');
        }

        try {
            const offer = await this.peerConnection.createOffer({
                offerToReceiveVideo: true,
                offerToReceiveAudio: true
            });
            console.log('[WebRTC] Offer created, setting local description...');
            await this.peerConnection.setLocalDescription(offer);
            console.log('[WebRTC] Offer created and set as local description');
            return offer;
        } catch (error) {
            console.error("Error creating offer:", error);
            throw error;
        }
    }

    async createAnswer() {
        if (!this.peerConnection) {
            throw new Error('Peer connection not created. Call createPeerConnection() first.');
        }

        try {
            const answer = await this.peerConnection.createAnswer();
            await this.peerConnection.setLocalDescription(answer);
            console.log('[WebRTC] Answer created and set as local description');
            return answer;
        } catch (error) {
            console.error("Error creating answer:", error);
            throw error;
        }
    }

    async setRemoteDescription(sdp: RTCSessionDescription) {
        if (!this.peerConnection) {
            throw new Error('Peer connection not created. Call createPeerConnection() first.');
        }
        try {
            await this.peerConnection.setRemoteDescription(new RTCSessionDescription(sdp));
            console.log('[WebRTC] Remote description set successfully');
        } catch (error) {
            console.error("Error setting remote description:", error);
            throw error;
        }
    }

    async addIceCandidate(candidate: RTCIceCandidate) {
        if (!this.peerConnection) return;
        try {
            // WebRTC requires a remote description to be set before adding candidates
            if (this.peerConnection.remoteDescription) {
                await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
            } else {
                console.warn('[WebRTC] addIceCandidate called without remoteDescription, this should be handled by buffering in the store.');
            }
        } catch (error) {
            console.error("Error adding ice candidate:", error);
        }
    }

    async restartIce() {
        if (!this.peerConnection) return;
        try {
            console.log('[WebRTC] Restarting ICE...');
            const offer = await this.peerConnection.createOffer({ iceRestart: true });
            await this.peerConnection.setLocalDescription(offer);
            console.log('[WebRTC] ICE restart initiated');
            // Return the offer so it can be sent to the remote peer
            return offer;
        } catch (error) {
            console.error('[WebRTC] Error restarting ICE:', error);
            return null;
        }
    }

    endCall() {
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => track.stop());
            this.localStream = null;
        }
        if (this.peerConnection) {
            this.peerConnection.close();
            this.peerConnection = null;
        }
        this.remoteStream = null;
        this.onRemoteStream = null;
        this.onIceCandidate = null;
        this.onIceRestart = null;
    }

    toggleAudio(enabled: boolean) {
        if (this.localStream) {
            this.localStream.getAudioTracks().forEach(track => track.enabled = enabled);
        }
    }

    toggleVideo(enabled: boolean) {
        if (this.localStream) {
            this.localStream.getVideoTracks().forEach(track => track.enabled = enabled);
        }
    }

    switchCamera() {
        if (this.localStream) {
            this.localStream.getVideoTracks().forEach(track => {
                // @ts-ignore: _switchCamera is a react-native-webrtc extension
                if (track._switchCamera) track._switchCamera();
            });
        }
    }

    async toggleSpeaker(enabled: boolean) {
        try {
            await Audio.setAudioModeAsync({
                allowsRecording: true,
                playsInSilentMode: true,
                interruptionMode: 'doNotMix',
                shouldRouteThroughEarpiece: !enabled,
                shouldPlayInBackground: true,
            });
        } catch (e) {
            console.error("Error toggling speaker", e);
        }
    }
}

export const webrtcService = new WebRTCService();
