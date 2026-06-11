import { useEffect, useRef } from 'react';
import { Avatar } from '../components/Avatar';
import { mediaUrl } from '../lib/media';
import { useCall } from './CallContext';

/** Capa global de llamada: entrante, saliente y en curso. */
export function CallOverlay() {
  const call = useCall();
  const localVideo = useRef<HTMLVideoElement>(null);
  const remoteVideo = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (localVideo.current && call.localStream) {
      localVideo.current.srcObject = call.localStream;
    }
  }, [call.localStream]);

  useEffect(() => {
    if (remoteVideo.current && call.remoteStream) {
      remoteVideo.current.srcObject = call.remoteStream;
    }
  }, [call.remoteStream]);

  if (call.status === 'idle') return null;

  const name = call.peer?.displayName ?? 'Contacto';
  const kind = call.video ? 'Videollamada' : 'Llamada';

  // --- Llamada entrante ---
  if (call.status === 'incoming') {
    return (
      <div className="call-overlay">
        <div className="call-card">
          <Avatar
            name={name}
            src={mediaUrl(call.peer?.avatarUrl)}
            size={96}
          />
          <h2>{name}</h2>
          <p className="call-sub">{kind} entrante…</p>
          <div className="call-actions">
            <button className="call-btn reject" onClick={call.reject}>
              📵 Rechazar
            </button>
            <button className="call-btn accept" onClick={call.accept}>
              {call.video ? '📹' : '📞'} Aceptar
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- Llamada saliente (esperando respuesta) ---
  if (call.status === 'calling' || call.status === 'connecting') {
    return (
      <div className="call-overlay">
        <div className="call-card">
          <Avatar
            name={name}
            src={mediaUrl(call.peer?.avatarUrl)}
            size={96}
          />
          <h2>{name}</h2>
          <p className="call-sub">
            {call.status === 'connecting' ? 'Conectando…' : `${kind}…`}
          </p>
          <div className="call-actions">
            <button className="call-btn reject" onClick={call.hangup}>
              📵 Cancelar
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- En llamada ---
  return (
    <div className="call-overlay in-call">
      <div className="call-stage">
        {call.video ? (
          <video
            ref={remoteVideo}
            className="call-remote-video"
            autoPlay
            playsInline
          />
        ) : (
          <div className="call-audio-stage">
            <Avatar
              name={name}
              src={mediaUrl(call.peer?.avatarUrl)}
              size={120}
            />
            <h2>{name}</h2>
            <p className="call-sub">En llamada</p>
          </div>
        )}
        {/* El audio remoto se reproduce siempre (también en llamada de voz). */}
        {!call.video && (
          <video ref={remoteVideo} autoPlay playsInline className="call-hidden" />
        )}
        {call.video && (
          <video
            ref={localVideo}
            className="call-local-video"
            autoPlay
            playsInline
            muted
          />
        )}
      </div>
      <div className="call-bar">
        <button
          className={`call-control ${call.muted ? 'on' : ''}`}
          onClick={call.toggleMute}
          title={call.muted ? 'Activar micro' : 'Silenciar'}
        >
          {call.muted ? '🔇' : '🎤'}
        </button>
        {call.video && (
          <button
            className={`call-control ${call.cameraOff ? 'on' : ''}`}
            onClick={call.toggleCamera}
            title={call.cameraOff ? 'Encender cámara' : 'Apagar cámara'}
          >
            {call.cameraOff ? '🚫' : '📹'}
          </button>
        )}
        <button className="call-control hangup" onClick={call.hangup} title="Colgar">
          📞
        </button>
      </div>
    </div>
  );
}
