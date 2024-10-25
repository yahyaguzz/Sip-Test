import React, { useState, useRef, useEffect } from "react";
import {
  UserAgent,
  Registerer,
  Inviter,
  SessionState,
  URI,
  Invitation,
  Session,
} from "sip.js";
import { AckableIncomingResponseWithSession, OutgoingInviteRequest } from "sip.js/lib/core";
import { SessionDescriptionHandler } from "sip.js/lib/platform/web";

// Cihaz türlerini tanımlamak için gerekli tipler
type MediaDeviceInfo = {
  deviceId: string;
  kind: string;
  label: string;
};

const App: React.FC = () => {
  // media devices states
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedMicrophone, setSelectedMicrophone] = useState<string>("");
  const [selectedSpeaker, setSelectedSpeaker] = useState<string>("");

  const [userAgent, setUserAgent] = useState<UserAgent | null>(null);
  const [registered, setRegistered] = useState<boolean>(false);
  const [session, setSession] = useState<Session | null>(null);
  const [target, setTarget] = useState<string>("905418733299");
  const localAudioRef = useRef<HTMLAudioElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const [username, setUsername] = useState<string>("2000");
  const [password, setPassword] = useState<string>("W3$7Tr^j@");

  const wsServer = "liwewireelectrical.site"; // SIP Server
  const serverPath = "/ws"; // SIP Server Path
  const wsPort = 8089; // SIP Server Port

  // SIP UserAgent ve Registerer kurulum
  const handleRegister = () => {
    if (!username || !password) {
      console.error("Username and password are required!");
      return;
    }

    const transportOptions = {
      server: `wss://${wsServer}:${wsPort}${serverPath}`,
      traceSip: true,
    };

    const userAgentOptions = {
      uri: UserAgent.makeURI(`sip:${username}@${wsServer}`), // URI doğru şekilde oluşturuldu
      transportOptions,
      authorizationUsername: username,
      authorizationPassword: password,
      displayName: "Yahya Test",
    };

    const ua = new UserAgent(userAgentOptions);
    console.log("UserAgent oluşturuldu:", ua);

    ua.start()
      .then(() => {
        const registerer = new Registerer(ua);
        registerer.register();
        setRegistered(true);
        setUserAgent(ua);
        console.log("Kullanıcı register oldu!");
      })
      .catch((error: Error) => {
        console.error("Register hata:", error);
      });

    ua.delegate = {
      onInvite(invitation: Invitation) {
        invitation.accept().then((session) => {
          console.log("Davet kabul edildi:", session);
          handleSession(invitation);
        });
      },
    };
  };

  // Arama başlatma fonksiyonu
  const handleCall = async () => {
    if (userAgent && registered) {
      console.log("Arama if içinde başladı");
      const targetURI = new URI("sip", target, wsServer); // Hedef URI burada oluşturuldu

      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            deviceId: { exact: selectedMicrophone }, // Seçilen mikrofon deviceId'sini kullan
          },
        });

        if (localAudioRef.current) {
          localAudioRef.current.srcObject = mediaStream; // Ses akışını yerel ses kaynağına bağla
        }

        const inviteOptions = {
          sessionDescriptionHandlerOptions: {
            constraints: { audio: true },
            localMediaStream: mediaStream,
          },
        };

        const inviter = new Inviter(userAgent, targetURI, inviteOptions);

        inviter
          .invite()
          .then(({ delegate }: OutgoingInviteRequest) => {
            delegate = {
              onAccept: (ackAbleSession: AckableIncomingResponseWithSession) => {
                // if (
                //   session &&
                //   session?.sessionDescriptionHandler?.peerConnection
                // ) {
                //   const remoteStream =
                //     session?.sessionDescriptionHandler?.peerConnection;
                //   const audioElements = document.querySelectorAll("audio");

                //   audioElements.forEach((audio) => {
                //     audio.srcObject = remoteStream as unknown as MediaStream;
                //   });
                // }
                // handleSession(ackAbleSession.session)
              },

            };


          })
          .catch((error: Error) => {
            console.error("Invite hata:", error);
          });
      } catch (error) {
        console.error("Media akışı alma hatası:", error);
      }
    } else {
      console.error("UserAgent ya da kayıtlı değil!");
    }
  };

  // Oturum yönetimi (session) ve medya akışını ayarlama
  const handleSession = (session: Session) => {
    console.log("handleSession Session:", session);

    session.delegate = {
      onSessionDescriptionHandler: (sessionDescriptionHandler: SessionDescriptionHandler) => {
        console.log("Session Description Handler hazır");
        const peerConnection = sessionDescriptionHandler?.peerConnection;

        peerConnection?.addEventListener("track", (event: RTCTrackEvent) => {
          console.log("Track olayı:", event);
          if (event.track.kind === "audio") {
            const remoteStream = new MediaStream();
            remoteStream.addTrack(event.track);

            if (remoteAudioRef.current) {
              remoteAudioRef.current.srcObject = remoteStream;
              remoteAudioRef.current.play();
            }
          }
        });
      },
    };

    setSession(session);
  };

  // Çağrı sonlandırma fonksiyonu
  const handleHangup = () => {
    if (session) {
      session.bye();
      setSession(null);
    }
  };

  // Cihaz seçme fonksiyonları
  useEffect(() => {
    const getDevices = async () => {
      const deviceInfos = await navigator.mediaDevices.enumerateDevices();
      setDevices(deviceInfos);

      const microphones = deviceInfos.filter(
        (device) => device.kind === "audioinput"
      );
      const speakers = deviceInfos.filter(
        (device) => device.kind === "audiooutput"
      );

      if (microphones.length > 0) {
        setSelectedMicrophone(microphones[0].deviceId);
      }

      if (speakers.length > 0) {
        setSelectedSpeaker(speakers[0].deviceId);
      }
    };

    getDevices();
  }, []);

  const handleMicrophoneChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedMicrophone(event.target.value);
  };

  const handleSpeakerChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedSpeaker(event.target.value);
  };

  return (
    <div>
      <div>
        <h2>SIP.js WebRTC Client</h2>
        {/* Register */}
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button onClick={handleRegister}>Register</button>
        {/* Arama Yapma */}
        {registered && (
          <>
            <input
              type="text"
              placeholder="Target username"
              value={target ?? ""}
              onChange={(e) => setTarget(e.target.value)}
            />
            <button onClick={handleCall}>Call</button>
            <button onClick={handleHangup}>Hangup</button>
          </>
        )}
        {/* Ses akışı */}
        <audio ref={localAudioRef} autoPlay muted></audio>
        <audio ref={remoteAudioRef} autoPlay></audio>
      </div>

      <div>
        <div>
          <h2>Mikrofon Seçin</h2>
          <select onChange={handleMicrophoneChange} value={selectedMicrophone}>
            {devices
              .filter((device) => device.kind === "audioinput")
              .map((device) => (
                <option key={device.deviceId} value={device.deviceId}>
                  {device.label || `Mikrofon ${device.deviceId}`}
                </option>
              ))}
          </select>
        </div>

        <div>
          <h2>Hoparlör Seçin</h2>
          <select onChange={handleSpeakerChange} value={selectedSpeaker}>
            {devices
              .filter((device) => device.kind === "audiooutput")
              .map((device) => (
                <option key={device.deviceId} value={device.deviceId}>
                  {device.label || `Hoparlör ${device.deviceId}`}
                </option>
              ))}
          </select>
        </div>

        <div>
          <h2>Seçilen Aygıtlar</h2>
          <p>Seçilen Mikrofon: {selectedMicrophone}</p>
          <p>Seçilen Hoparlör: {selectedSpeaker}</p>
        </div>
      </div>
    </div>
  );
};

export default App;
