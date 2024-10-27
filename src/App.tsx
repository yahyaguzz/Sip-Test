import React, { useState, useRef, useEffect } from "react";
import {
  UserAgent,
  Registerer,
  Inviter,
  SessionState,
  URI,
  Invitation,
  Session,
  InviterOptions,
  UserAgentOptions,
} from "sip.js";
import { AckableIncomingResponseWithSession, IncomingInviteRequest, IncomingResponse, OutgoingInviteRequest } from "sip.js/lib/core";
import { SessionDescriptionHandler, TransportOptions } from "sip.js/lib/platform/web";

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

    const transportOptions: TransportOptions = {
      server: `wss://${wsServer}:${wsPort}${serverPath}`,
      traceSip: true,
    };

    const mediaStreamFactory = () => {
      return navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false
      });
    };

    const userAgentOptions: UserAgentOptions = {
      uri: UserAgent.makeURI(`sip:${username}@${wsServer}`),
      transportOptions,
      authorizationUsername: username,
      authorizationPassword: password,
      displayName: "Yahya Test",
      sessionDescriptionHandlerFactory: (session: Session, options) => {
        const sessionDescriptionHandlerConfiguration = {
          iceGatheringTimeout: 5000, // ICE bağlantı kurulma süresi
          peerConnectionConfiguration: {
            iceServers: [{ urls: "stun:stun.l.google.com:19302" }] // ICE Sunucuları ayarlayabilirsin
          }
        };
        const logger = session.userAgent.getLogger("sip.SessionDescriptionHandler");
        return new SessionDescriptionHandler(logger, mediaStreamFactory, sessionDescriptionHandlerConfiguration);
      }
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

    // ua.delegate = {
    //   onInvite(invitation: Invitation) {
    //     invitation.accept({ sessionDescriptionHandlerOptions: { constraints: { audio: true, video: false } } }).then((response) => {
    //       console.log("Davet kabul edildi:", response);
    //       console.log("userAgentOptions sessionDescriptionHandlerFactory session.sessionDescriptionHandler", invitation.sessionDescriptionHandler)
    //     });
    //     handleSession(invitation);
    //   },
    // }
  };

  // Arama başlatma fonksiyonu
  const handleCall = async () => {
    if (userAgent && registered) {
      console.log("Arama if içinde başladı");
      const targetURI = new URI("sip", target, wsServer); // Hedef URI burada oluşturuldu

      try {
        // const mediaStream = await navigator.mediaDevices.getUserMedia({
        //   audio: {
        //     deviceId: { exact: selectedSpeaker }, // Seçilen mikrofon deviceId'sini kullan
        //   },
        // });

        // if (localAudioRef.current) {
        //   localAudioRef.current.srcObject = mediaStream; // Ses akışını yerel ses kaynağına bağla
        // }

        const inviteOptions: InviterOptions = {
          sessionDescriptionHandlerOptions: {
            constraints: {
              audio: true,
              video: false,
            },

          },
        };

        const inviter = new Inviter(userAgent, targetURI);

        // inviter.delegate.onSessionDescriptionHandler({sessionDescriptionHandler: SessionDescriptionHandler, provisional: true})

        inviter
          .invite()
          .then(({ delegate, }: OutgoingInviteRequest) => {
            delegate = {
              onAccept: ({ session, ack }: AckableIncomingResponseWithSession) => {
                ack()

                session.delegate = {
                  onInvite: (request: IncomingInviteRequest) => {
                    request.accept()
                  },
                };
                //Invite onaylanıyor ve görüşme iki taraf için de tam anlamıyla başladığını doğruluyoruz
              },

            };
          })
          .catch((error: Error) => {
            console.error("Invite hata:", error);
          });
        console.log("inviter._referred", inviter)
        handleSession(inviter)
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
    const sessionDescriptionHandler: any = session.sessionDescriptionHandler;
    console.log("handleSession sessionDescriptionHandler:", sessionDescriptionHandler.peerConnection)
    const peerConnection = sessionDescriptionHandler?.peerConnection;
    peerConnection?.getSenders().forEach((sender) => {
      if (sender.track) {
        sender.track.enabled = true;
      }
    });

    peerConnection?.getReceivers().forEach((receiver) => {
      if (receiver.track) {
        receiver.track.enabled = true;
      }
    });

    // Remote SDP'nin var olup olmadığını kontrol et
    const remoteSDH = peerConnection?.currentRemoteDescription;

    console.log("Karşıdan gelen SDP:", remoteSDH);

    peerConnection?.addEventListener("track", (event) => {
      if (event.track.kind === "audio") {
        if (remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = event.streams[0];
          remoteAudioRef.current.play().catch((error) => console.log("Play hatası:", error));
        }
      }
    });
    // session.delegate = {
    //   onSessionDescriptionHandler: (sessionDescriptionHandler: SessionDescriptionHandler) => {
    //     const peerConnection = sessionDescriptionHandler?.peerConnection;
    //     console.log("Peer Connection kurulmuş durumda:", peerConnection);

    //     // Giden medya akışı için track'leri etkinleştir
    //     peerConnection?.getSenders().forEach((sender) => {
    //       if (sender.track) {
    //         sender.track.enabled = true;
    //       }
    //     });

    //     peerConnection?.getReceivers().forEach((receiver) => {
    //       if (receiver.track) {
    //         receiver.track.enabled = true;
    //       }
    //     });

    //     // Remote SDP'nin var olup olmadığını kontrol et
    //     const remoteSDH = peerConnection?.currentRemoteDescription;

    //     console.log("Karşıdan gelen SDP:", remoteSDH);

    //     peerConnection?.addEventListener("track", (event) => {
    //       if (event.track.kind === "audio") {
    //         if (remoteAudioRef.current) {
    //           remoteAudioRef.current.srcObject = event.streams[0];
    //           remoteAudioRef.current.play().catch((error) => console.log("Play hatası:", error));
    //         }
    //       }
    //     });
    //     // Gelen medya akışını ayarla
    //     // peerConnection?.addEventListener("track", (event: RTCTrackEvent) => {
    //     //   console.log("Track olayı:", event);
    //     //   if (event.track.kind === "audio") {
    //     //     // Yeni bir medya akışı oluştur ve sesi bağla
    //     //     const remoteStream = new MediaStream();
    //     //     remoteStream.addTrack(event.track);

    //     //     if (remoteAudioRef.current) {
    //     //       remoteAudioRef.current.srcObject = remoteStream;
    //     //       remoteAudioRef.current.play();
    //     //     }
    //     //   }
    //     // });
    //   },
    // };

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
