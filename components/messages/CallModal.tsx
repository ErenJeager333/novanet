'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createBrowserClient } from '@/lib/supabase-client';
import { Phone, PhoneOff, Mic, MicOff, Video, VideoOff, Volume2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

interface CallModalProps {
  conversationId: string;
  currentUserId: string;
  remoteUserId: string;
  remoteName: string;
  remoteAvatar: string | null;
  mode: 'audio' | 'video';
  isIncoming: boolean;
  onClose: () => void;
}

export default function CallModal({
  conversationId,
  currentUserId,
  remoteUserId,
  remoteName,
  remoteAvatar,
  mode,
  isIncoming,
  onClose,
}: CallModalProps) {
  const supabase = createBrowserClient();
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  const [callStatus, setCallStatus] = useState<'calling' | 'ringing' | 'connected' | 'ended'>(
    isIncoming ? 'ringing' : 'calling'
  );
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(mode === 'video');
  const [duration, setDuration] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Démarre le timer quand connecté
  useEffect(() => {
    if (callStatus === 'connected') {
      timerRef.current = setInterval(() => setDuration(d => d + 1), 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [callStatus]);

  // Formate la durée
  function formatDuration(s: number) {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  }

  // Initialise WebRTC
  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel>;

    async function startCall() {
      try {
        // Récupère le flux local
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: mode === 'video',
        });
        localStreamRef.current = stream;

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        // Crée la connexion WebRTC
        const pc = new RTCPeerConnection({
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
          ],
        });
        peerRef.current = pc;

        // Ajoute les tracks locaux
        stream.getTracks().forEach(track => pc.addTrack(track, stream));

        // Quand on reçoit les tracks distants
        pc.ontrack = (event) => {
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = event.streams[0];
          }
          setCallStatus('connected');
        };

        // Écoute les signaux Supabase
        channel = supabase
          .channel(`call:${conversationId}:${currentUserId}`)
          .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'call_signals',
            filter: `receiver_id=eq.${currentUserId}`,
          }, async (payload: { new: Record<string, unknown> }) => {
            const { type, payload: signalPayload } = payload.new as {
              type: string;
              payload: RTCSessionDescriptionInit | RTCIceCandidateInit;
            };

            if (type === 'answer' && peerRef.current) {
              await peerRef.current.setRemoteDescription(
                new RTCSessionDescription(signalPayload as RTCSessionDescriptionInit)
              );
              setCallStatus('connected');
            } else if (type === 'ice-candidate' && peerRef.current) {
              await peerRef.current.addIceCandidate(
                new RTCIceCandidate(signalPayload as RTCIceCandidateInit)
              );
            } else if (type === 'offer' && peerRef.current) {
              await peerRef.current.setRemoteDescription(
                new RTCSessionDescription(signalPayload as RTCSessionDescriptionInit)
              );
              const answer = await peerRef.current.createAnswer();
              await peerRef.current.setLocalDescription(answer);
              await supabase.from('call_signals').insert({
                conversation_id: conversationId,
                sender_id: currentUserId,
                receiver_id: remoteUserId,
                type: 'answer',
                payload: answer,
              });
            } else if (type === 'hangup' || type === 'reject') {
              endCall();
            }
          })
          .subscribe();

        // Envoie les ICE candidates
        pc.onicecandidate = async (event) => {
          if (event.candidate) {
            await supabase.from('call_signals').insert({
              conversation_id: conversationId,
              sender_id: currentUserId,
              receiver_id: remoteUserId,
              type: 'ice-candidate',
              payload: event.candidate.toJSON(),
            });
          }
        };

        // Si on initie l'appel, on crée l'offre
        if (!isIncoming) {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          await supabase.from('call_signals').insert({
            conversation_id: conversationId,
            sender_id: currentUserId,
            receiver_id: remoteUserId,
            type: 'offer',
            payload: offer,
          });
        }
      } catch (err) {
        toast.error('Impossible d\'accéder au micro/caméra');
        onClose();
      }
    }

    startCall();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  async function acceptCall() {
    setCallStatus('connected');
  }

  async function endCall() {
    // Envoie le signal de raccrochage
    await supabase.from('call_signals').insert({
      conversation_id: conversationId,
      sender_id: currentUserId,
      receiver_id: remoteUserId,
      type: 'hangup',
      payload: {},
    });

    // Arrête les tracks
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    peerRef.current?.close();
    setCallStatus('ended');
    onClose();
  }

  function toggleMic() {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(t => { t.enabled = !micOn; });
      setMicOn(!micOn);
    }
  }

  function toggleCam() {
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach(t => { t.enabled = !camOn; });
      setCamOn(!camOn);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className={cn(
        'relative rounded-3xl overflow-hidden shadow-2xl',
        mode === 'video' && callStatus === 'connected'
          ? 'w-full h-full max-w-3xl max-h-[80vh]'
          : 'w-80'
      )}>

        {/* Fond vidéo distante */}
        {mode === 'video' && callStatus === 'connected' && (
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}

        {/* Fond si pas vidéo ou en attente */}
        {(mode === 'audio' || callStatus !== 'connected') && (
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 to-purple-700" />
        )}

        {/* Contenu */}
        <div className="relative z-10 flex flex-col items-center justify-between p-8 min-h-[400px]">
          <div className="text-center">
            {/* Avatar */}
            <div className="w-24 h-24 rounded-full bg-white/20 flex items-center justify-center text-white text-3xl font-bold mx-auto mb-4 overflow-hidden border-4 border-white/30">
              {remoteAvatar ? (
                <img src={remoteAvatar} alt={remoteName} className="w-full h-full object-cover" />
              ) : (
                remoteName.charAt(0).toUpperCase()
              )}
            </div>
            <h2 className="text-white text-xl font-bold">{remoteName}</h2>
            <p className="text-white/70 text-sm mt-1">
              {callStatus === 'calling' && '⏳ Appel en cours…'}
              {callStatus === 'ringing' && '📱 Appel entrant'}
              {callStatus === 'connected' && `🟢 ${formatDuration(duration)}`}
              {callStatus === 'ended' && '📵 Appel terminé'}
            </p>
            {mode === 'video' && <p className="text-white/50 text-xs mt-1">📹 Appel vidéo</p>}
            {mode === 'audio' && <p className="text-white/50 text-xs mt-1">🎙️ Appel audio</p>}
          </div>

          {/* Vidéo locale (petite) */}
          {mode === 'video' && callStatus === 'connected' && (
            <div className="absolute top-4 right-4 w-24 h-32 rounded-xl overflow-hidden border-2 border-white/30 shadow-lg">
              <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
            </div>
          )}

          {/* Contrôles */}
          <div className="flex items-center gap-4 mt-8">
            {callStatus === 'ringing' ? (
              <>
                {/* Rejeter */}
                <button
                  onClick={endCall}
                  className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center text-white shadow-lg transition-all active:scale-95"
                >
                  <PhoneOff size={26} />
                </button>
                {/* Accepter */}
                <button
                  onClick={acceptCall}
                  className="w-16 h-16 rounded-full bg-green-500 hover:bg-green-600 flex items-center justify-center text-white shadow-lg transition-all active:scale-95"
                >
                  <Phone size={26} />
                </button>
              </>
            ) : (
              <>
                {/* Micro */}
                <button
                  onClick={toggleMic}
                  className={cn(
                    'w-12 h-12 rounded-full flex items-center justify-center text-white shadow-md transition-all active:scale-95',
                    micOn ? 'bg-white/20 hover:bg-white/30' : 'bg-red-500 hover:bg-red-600'
                  )}
                >
                  {micOn ? <Mic size={20} /> : <MicOff size={20} />}
                </button>

                {/* Raccrocher */}
                <button
                  onClick={endCall}
                  className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center text-white shadow-lg transition-all active:scale-95"
                >
                  <PhoneOff size={26} />
                </button>

                {/* Caméra (si vidéo) */}
                {mode === 'video' && (
                  <button
                    onClick={toggleCam}
                    className={cn(
                      'w-12 h-12 rounded-full flex items-center justify-center text-white shadow-md transition-all active:scale-95',
                      camOn ? 'bg-white/20 hover:bg-white/30' : 'bg-red-500 hover:bg-red-600'
                    )}
                  >
                    {camOn ? <Video size={20} /> : <VideoOff size={20} />}
                  </button>
                )}

                {/* Haut-parleur */}
                <button className="w-12 h-12 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white shadow-md transition-all active:scale-95">
                  <Volume2 size={20} />
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}