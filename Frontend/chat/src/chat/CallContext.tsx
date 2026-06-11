import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { PublicUser } from '../lib/friends';
import { useSocket } from './SocketContext';

export type CallStatus =
  | 'idle'
  | 'calling' // yo llamo, esperando respuesta
  | 'incoming' // me llaman
  | 'connecting'
  | 'in-call';

interface CallState {
  status: CallStatus;
  peer: PublicUser | null;
  video: boolean;
  muted: boolean;
  cameraOff: boolean;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  startCall: (conversationId: string, peer: PublicUser, video: boolean) => void;
  accept: () => void;
  reject: () => void;
  hangup: () => void;
  toggleMute: () => void;
  toggleCamera: () => void;
}

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
};

const CallContext = createContext<CallState | null>(null);

export function CallProvider({ children }: { children: ReactNode }) {
  const socket = useSocket();

  const [status, setStatus] = useState<CallStatus>('idle');
  const [peer, setPeer] = useState<PublicUser | null>(null);
  const [video, setVideo] = useState(false);
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localRef = useRef<MediaStream | null>(null);
  const convRef = useRef<string | null>(null);
  const pendingOffer = useRef<RTCSessionDescriptionInit | null>(null);
  const pendingIce = useRef<RTCIceCandidateInit[]>([]);
  const ringRef = useRef<{ ctx: AudioContext; timer: number } | null>(null);

  // ---- Utilidades --------------------------------------------------------

  const cleanup = useCallback(() => {
    pcRef.current?.close();
    pcRef.current = null;
    localRef.current?.getTracks().forEach((t) => t.stop());
    localRef.current = null;
    pendingOffer.current = null;
    pendingIce.current = [];
    convRef.current = null;
    setLocalStream(null);
    setRemoteStream(null);
    setStatus('idle');
    setPeer(null);
    setMuted(false);
    setCameraOff(false);
  }, []);

  const buildPeer = useCallback(
    (conversationId: string) => {
      const pc = new RTCPeerConnection(RTC_CONFIG);
      pc.onicecandidate = (e) => {
        if (e.candidate) {
          socket?.emit('call:ice', {
            conversationId,
            candidate: e.candidate.toJSON(),
          });
        }
      };
      pc.ontrack = (e) => {
        setRemoteStream(e.streams[0]);
        setStatus('in-call');
      };
      pc.onconnectionstatechange = () => {
        if (
          pc.connectionState === 'failed' ||
          pc.connectionState === 'disconnected' ||
          pc.connectionState === 'closed'
        ) {
          // El otro extremo se cayó: cerramos.
          if (pcRef.current === pc) cleanup();
        }
      };
      pcRef.current = pc;
      return pc;
    },
    [socket, cleanup],
  );

  const getMedia = useCallback(async (wantVideo: boolean) => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: wantVideo,
    });
    localRef.current = stream;
    setLocalStream(stream);
    return stream;
  }, []);

  // ---- Acciones ----------------------------------------------------------

  const startCall = useCallback(
    async (conversationId: string, who: PublicUser, wantVideo: boolean) => {
      if (status !== 'idle' || !socket) return;
      try {
        convRef.current = conversationId;
        setPeer(who);
        setVideo(wantVideo);
        setStatus('calling');
        const stream = await getMedia(wantVideo);
        const pc = buildPeer(conversationId);
        stream.getTracks().forEach((t) => pc.addTrack(t, stream));
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit('call:offer', {
          conversationId,
          sdp: offer,
          video: wantVideo,
        });
      } catch {
        cleanup();
      }
    },
    [status, socket, getMedia, buildPeer, cleanup],
  );

  const accept = useCallback(async () => {
    const offer = pendingOffer.current;
    const conversationId = convRef.current;
    if (!offer || !conversationId || !socket) return;
    try {
      setStatus('connecting');
      const stream = await getMedia(video);
      const pc = buildPeer(conversationId);
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      // Aplicar candidatos ICE que llegaron antes de tener descripción remota.
      for (const c of pendingIce.current) await pc.addIceCandidate(c);
      pendingIce.current = [];
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit('call:answer', { conversationId, sdp: answer });
    } catch {
      hangup();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, getMedia, buildPeer, video]);

  const reject = useCallback(() => {
    if (convRef.current) {
      socket?.emit('call:end', {
        conversationId: convRef.current,
        reason: 'reject',
      });
    }
    cleanup();
  }, [socket, cleanup]);

  const hangup = useCallback(() => {
    if (convRef.current) {
      socket?.emit('call:end', {
        conversationId: convRef.current,
        reason: 'hangup',
      });
    }
    cleanup();
  }, [socket, cleanup]);

  const toggleMute = useCallback(() => {
    const track = localRef.current?.getAudioTracks()[0];
    if (track) {
      track.enabled = !track.enabled;
      setMuted(!track.enabled);
    }
  }, []);

  const toggleCamera = useCallback(() => {
    const track = localRef.current?.getVideoTracks()[0];
    if (track) {
      track.enabled = !track.enabled;
      setCameraOff(!track.enabled);
    }
  }, []);

  // ---- Señalización entrante ---------------------------------------------

  useEffect(() => {
    if (!socket) return;

    const onIncoming = (data: {
      conversationId: string;
      sdp: RTCSessionDescriptionInit;
      video: boolean;
      from: PublicUser;
    }) => {
      // Si ya estoy en otra llamada, rechazo automáticamente (ocupado).
      if (status !== 'idle') {
        socket.emit('call:end', {
          conversationId: data.conversationId,
          reason: 'busy',
        });
        return;
      }
      convRef.current = data.conversationId;
      pendingOffer.current = data.sdp;
      setPeer(data.from);
      setVideo(data.video);
      setStatus('incoming');
    };

    const onAnswered = async (data: { sdp: RTCSessionDescriptionInit }) => {
      const pc = pcRef.current;
      if (!pc) return;
      await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
      for (const c of pendingIce.current) await pc.addIceCandidate(c);
      pendingIce.current = [];
    };

    const onIce = async (data: { candidate: RTCIceCandidateInit }) => {
      const pc = pcRef.current;
      if (pc?.remoteDescription) {
        try {
          await pc.addIceCandidate(data.candidate);
        } catch {
          /* candidato inválido: ignorar */
        }
      } else {
        pendingIce.current.push(data.candidate);
      }
    };

    const onEnd = () => cleanup();

    socket.on('call:incoming', onIncoming);
    socket.on('call:answered', onAnswered);
    socket.on('call:ice', onIce);
    socket.on('call:end', onEnd);
    return () => {
      socket.off('call:incoming', onIncoming);
      socket.off('call:answered', onAnswered);
      socket.off('call:ice', onIce);
      socket.off('call:end', onEnd);
    };
  }, [socket, status, cleanup]);

  // Tono de llamada mientras suena (entrante o saliente), generado con WebAudio.
  useEffect(() => {
    const ringing = status === 'calling' || status === 'incoming';
    if (!ringing) {
      if (ringRef.current) {
        clearInterval(ringRef.current.timer);
        void ringRef.current.ctx.close();
        ringRef.current = null;
      }
      return;
    }
    if (ringRef.current) return;
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    const ctx = new AudioCtx();
    const beep = () => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = status === 'incoming' ? 520 : 440;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.15, ctx.currentTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.6);
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.6);
    };
    beep();
    const timer = window.setInterval(beep, status === 'incoming' ? 1500 : 3000);
    ringRef.current = { ctx, timer };
  }, [status]);

  const value: CallState = {
    status,
    peer,
    video,
    muted,
    cameraOff,
    localStream,
    remoteStream,
    startCall,
    accept,
    reject,
    hangup,
    toggleMute,
    toggleCamera,
  };

  return <CallContext.Provider value={value}>{children}</CallContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useCall(): CallState {
  const ctx = useContext(CallContext);
  if (!ctx) throw new Error('useCall debe usarse dentro de <CallProvider>');
  return ctx;
}
