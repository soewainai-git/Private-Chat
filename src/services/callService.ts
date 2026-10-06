import { UserIdentity } from '../types/chat';
import { getSupabase } from './supabaseClient';
import {
  playOutgoingRingtone,
  playIncomingRingtone,
  playConnectedSound,
  playEndedSound,
  stopAllCallSounds,
} from './callSounds';

export type CallStatus =
  | 'idle'
  | 'calling'     // Outgoing ringing
  | 'incoming'    // Incoming ringing
  | 'connecting'  // ICE / WebRTC handshake
  | 'connected'   // Active call
  | 'ended';

export interface CallSession {
  callId: string;
  caller: UserIdentity;
  callee: UserIdentity;
  status: CallStatus;
  isMuted: boolean;
  isSpeakerOn: boolean;
  startedAt: number | null; // Timestamp when connected
}

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:global.stun.twilio.com:3478' },
  ],
};

let currentSession: CallSession | null = null;
let peerConnection: RTCPeerConnection | null = null;
let localStream: MediaStream | null = null;
let remoteAudioElement: HTMLAudioElement | null = null;
let broadcastChannel: BroadcastChannel | null = null;
let supabaseChannel: any = null;

// Callbacks
type StateListener = (session: CallSession | null) => void;
const listeners = new Set<StateListener>();

function notifyListeners() {
  const clone = currentSession ? { ...currentSession } : null;
  listeners.forEach(cb => cb(clone));
}

export function subscribeToCallState(callback: StateListener): () => void {
  listeners.add(callback);
  callback(currentSession ? { ...currentSession } : null);
  return () => {
    listeners.delete(callback);
  };
}

function getRemoteAudio(): HTMLAudioElement {
  if (!remoteAudioElement) {
    remoteAudioElement = document.createElement('audio');
    remoteAudioElement.autoplay = true;
    (remoteAudioElement as any).playsInline = true;
    document.body.appendChild(remoteAudioElement);
  }
  return remoteAudioElement;
}

// Signaling helper
function sendSignal(type: string, payload: any) {
  // 1. BroadcastChannel for same-browser testing
  if (broadcastChannel) {
    broadcastChannel.postMessage({ type, payload });
  }

  // 2. Supabase Realtime for cross-device communication
  if (supabaseChannel) {
    try {
      supabaseChannel.send({
        type: 'broadcast',
        event: type,
        payload,
      });
    } catch (err) {
      console.warn('Signaling broadcast warning:', err);
    }
  }
}

// Initialize Signaling listeners
export function initCallSignaling(currentUser: UserIdentity) {
  if (typeof window === 'undefined') return () => {};

  if (!broadcastChannel) {
    broadcastChannel = new BroadcastChannel('soe-haru-voice-calls-v1');
  }

  const handleSignalMessage = async (type: string, payload: any) => {
    if (!payload) return;

    if (type === 'call_invite') {
      // Someone is calling us!
      if (payload.callee === currentUser && (!currentSession || currentSession.status === 'idle')) {
        currentSession = {
          callId: payload.callId,
          caller: payload.caller,
          callee: payload.callee,
          status: 'incoming',
          isMuted: false,
          isSpeakerOn: true,
          startedAt: null,
        };
        playIncomingRingtone();
        notifyListeners();
      } else if (payload.callee === currentUser && currentSession && currentSession.status !== 'idle') {
        // We are already busy
        sendSignal('call_reject', { callId: payload.callId, reason: 'busy' });
      }
    } else if (type === 'call_accept') {
      if (currentSession && currentSession.callId === payload.callId && currentSession.caller === currentUser) {
        stopAllCallSounds();
        currentSession.status = 'connecting';
        notifyListeners();
        // As caller, create WebRTC offer now that callee accepted!
        await initiateWebRTCOffer();
      }
    } else if (type === 'call_reject') {
      if (currentSession && currentSession.callId === payload.callId) {
        stopAllCallSounds();
        playEndedSound();
        currentSession.status = 'ended';
        notifyListeners();
        cleanupCall();
      }
    } else if (type === 'call_offer') {
      if (currentSession && currentSession.callId === payload.callId && currentSession.callee === currentUser) {
        await handleReceivedOffer(payload.sdp);
      }
    } else if (type === 'call_answer') {
      if (currentSession && currentSession.callId === payload.callId && currentSession.caller === currentUser) {
        await handleReceivedAnswer(payload.sdp);
      }
    } else if (type === 'call_ice') {
      if (currentSession && currentSession.callId === payload.callId && payload.candidate) {
        if (peerConnection && peerConnection.remoteDescription) {
          try {
            await peerConnection.addIceCandidate(new RTCIceCandidate(payload.candidate));
          } catch (e) {
            console.warn('ICE Candidate add error:', e);
          }
        }
      }
    } else if (type === 'call_end') {
      if (currentSession && currentSession.callId === payload.callId) {
        stopAllCallSounds();
        playEndedSound();
        currentSession.status = 'ended';
        notifyListeners();
        cleanupCall();
      }
    }
  };

  const bcHandler = (e: MessageEvent) => {
    const { type, payload } = e.data || {};
    handleSignalMessage(type, payload);
  };
  broadcastChannel.addEventListener('message', bcHandler);

  const supabase = getSupabase();
  if (supabase) {
    supabaseChannel = supabase.channel('soe-haru-call-signaling-room');
    supabaseChannel
      .on('broadcast', { event: 'call_invite' }, ({ payload }: any) => handleSignalMessage('call_invite', payload))
      .on('broadcast', { event: 'call_accept' }, ({ payload }: any) => handleSignalMessage('call_accept', payload))
      .on('broadcast', { event: 'call_reject' }, ({ payload }: any) => handleSignalMessage('call_reject', payload))
      .on('broadcast', { event: 'call_offer' }, ({ payload }: any) => handleSignalMessage('call_offer', payload))
      .on('broadcast', { event: 'call_answer' }, ({ payload }: any) => handleSignalMessage('call_answer', payload))
      .on('broadcast', { event: 'call_ice' }, ({ payload }: any) => handleSignalMessage('call_ice', payload))
      .on('broadcast', { event: 'call_end' }, ({ payload }: any) => handleSignalMessage('call_end', payload))
      .subscribe();
  }

  return () => {
    if (broadcastChannel) {
      broadcastChannel.removeEventListener('message', bcHandler);
    }
    if (supabase && supabaseChannel) {
      supabase.removeChannel(supabaseChannel);
      supabaseChannel = null;
    }
  };
}

// 1. Caller starts outgoing call
export async function startCall(caller: UserIdentity, callee: UserIdentity): Promise<boolean> {
  if (currentSession && currentSession.status !== 'idle' && currentSession.status !== 'ended') {
    return false;
  }

  const callId = 'call-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7);

  currentSession = {
    callId,
    caller,
    callee,
    status: 'calling',
    isMuted: false,
    isSpeakerOn: true,
    startedAt: null,
  };

  playOutgoingRingtone();
  notifyListeners();

  // Send invitation signal
  sendSignal('call_invite', { callId, caller, callee });

  return true;
}

// 2. Callee accepts incoming call
export async function acceptCall(): Promise<boolean> {
  if (!currentSession || currentSession.status !== 'incoming') return false;

  stopAllCallSounds();
  currentSession.status = 'connecting';
  notifyListeners();

  // Notify caller that we accepted
  sendSignal('call_accept', { callId: currentSession.callId, callee: currentSession.callee });

  // Get local microphone stream
  try {
    localStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
      video: false,
    });
  } catch (err) {
    console.error('Failed to get user audio media:', err);
    rejectCall();
    return false;
  }

  setupPeerConnection();

  return true;
}

// 3. Callee rejects call
export function rejectCall() {
  if (!currentSession) return;
  const callId = currentSession.callId;
  stopAllCallSounds();
  currentSession.status = 'ended';
  notifyListeners();

  sendSignal('call_reject', { callId, reason: 'declined' });
  cleanupCall();
}

// 4. Either party ends call
export function endCall() {
  if (!currentSession) return;
  const callId = currentSession.callId;
  stopAllCallSounds();
  playEndedSound();
  currentSession.status = 'ended';
  notifyListeners();

  sendSignal('call_end', { callId });
  cleanupCall();
}

// WebRTC peer connection setup
function setupPeerConnection() {
  if (peerConnection) {
    try {
      peerConnection.close();
    } catch {}
  }

  peerConnection = new RTCPeerConnection(RTC_CONFIG);

  if (localStream) {
    localStream.getTracks().forEach(track => {
      peerConnection?.addTrack(track, localStream!);
    });
  }

  peerConnection.onicecandidate = event => {
    if (event.candidate && currentSession) {
      sendSignal('call_ice', {
        callId: currentSession.callId,
        candidate: event.candidate.toJSON(),
      });
    }
  };

  peerConnection.ontrack = event => {
    const remoteStream = event.streams[0];
    const audioEl = getRemoteAudio();
    audioEl.srcObject = remoteStream;
    audioEl.play().catch(e => console.warn('Audio auto-play note:', e));

    if (currentSession && currentSession.status !== 'connected') {
      playConnectedSound();
      currentSession.status = 'connected';
      currentSession.startedAt = Date.now();
      notifyListeners();
    }
  };

  peerConnection.onconnectionstatechange = () => {
    if (peerConnection?.connectionState === 'connected') {
      if (currentSession && currentSession.status !== 'connected') {
        playConnectedSound();
        currentSession.status = 'connected';
        currentSession.startedAt = Date.now();
        notifyListeners();
      }
    } else if (
      peerConnection?.connectionState === 'disconnected' ||
      peerConnection?.connectionState === 'failed' ||
      peerConnection?.connectionState === 'closed'
    ) {
      if (currentSession && currentSession.status === 'connected') {
        endCall();
      }
    }
  };
}

// Caller creates WebRTC Offer
async function initiateWebRTCOffer() {
  try {
    localStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
      video: false,
    });
  } catch (err) {
    console.error('Caller microphone access error:', err);
    endCall();
    return;
  }

  setupPeerConnection();

  if (!peerConnection || !currentSession) return;

  try {
    const offer = await peerConnection.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: false,
    });
    await peerConnection.setLocalDescription(offer);

    sendSignal('call_offer', {
      callId: currentSession.callId,
      sdp: offer,
    });
  } catch (err) {
    console.error('Failed to create offer:', err);
    endCall();
  }
}

// Callee handles received Offer and responds with Answer
async function handleReceivedOffer(offerSdp: RTCSessionDescriptionInit) {
  if (!peerConnection || !currentSession) return;

  try {
    await peerConnection.setRemoteDescription(new RTCSessionDescription(offerSdp));
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);

    sendSignal('call_answer', {
      callId: currentSession.callId,
      sdp: answer,
    });
  } catch (err) {
    console.error('Failed to handle offer or create answer:', err);
    endCall();
  }
}

// Caller handles received Answer
async function handleReceivedAnswer(answerSdp: RTCSessionDescriptionInit) {
  if (!peerConnection) return;
  try {
    await peerConnection.setRemoteDescription(new RTCSessionDescription(answerSdp));
  } catch (err) {
    console.error('Failed to set remote answer:', err);
  }
}

// Audio controls
export function toggleMute(): boolean {
  if (!currentSession || !localStream) return false;
  const newMuted = !currentSession.isMuted;
  localStream.getAudioTracks().forEach(track => {
    track.enabled = !newMuted;
  });
  currentSession.isMuted = newMuted;
  notifyListeners();
  return newMuted;
}

export function toggleSpeaker(): boolean {
  if (!currentSession) return false;
  const newSpeaker = !currentSession.isSpeakerOn;
  currentSession.isSpeakerOn = newSpeaker;
  const audioEl = getRemoteAudio();
  audioEl.volume = newSpeaker ? 1.0 : 0.4;
  notifyListeners();
  return newSpeaker;
}

// Internal Cleanup
function cleanupCall() {
  stopAllCallSounds();

  if (peerConnection) {
    try {
      peerConnection.close();
    } catch {}
    peerConnection = null;
  }

  if (localStream) {
    try {
      localStream.getTracks().forEach(track => track.stop());
    } catch {}
    localStream = null;
  }

  if (remoteAudioElement) {
    try {
      remoteAudioElement.srcObject = null;
    } catch {}
  }

  setTimeout(() => {
    if (currentSession && currentSession.status === 'ended') {
      currentSession = null;
      notifyListeners();
    }
  }, 1200);
}
