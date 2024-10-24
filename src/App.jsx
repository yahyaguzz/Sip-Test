import { useState, useRef, useEffect } from "react";
import { UserAgent, Registerer, Inviter, SessionState, URI } from "sip.js";

const App = () => {
  // media devices states
  const [devices, setDevices] = useState([]);
  const [selectedMicrophone, setSelectedMicrophone] = useState("");
  const [selectedSpeaker, setSelectedSpeaker] = useState("");

  const [userAgent, setUserAgent] = useState(null);
  const [registered, setRegistered] = useState(false);
  const [session, setSession] = useState(null);
  const [target, setTarget] = useState("905418733299");
  const localAudioRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const [username, setUsername] = useState("2000");
  const [password, setPassword] = useState("W3$7Tr^j@");
  const wsServer = "liwewireelectrical.site"; // SIP Sunucusu
  const serverPath = "/ws"; // SIP Sunucusu
  const wsPort = 8089; // SIP Sunucusu
  // liwewireelectrical.site port 8089
  // /ws
  // extension : 2000
  // secret : W3$7Tr^j@
  // SIP UserAgent ve Registerer kurulum
  const handleRegister = () => {
    if (!username || !password) {
      console.error("Username and password are required!");
      return;
    }

    const transportOptions = {
      server: `wss://${wsServer}:${wsPort}${serverPath}`,
      traceSip: true,
      media: {
        remote: {
          audio: true,
        },
      },
    };

    const userAgentOptions = {
      uri: UserAgent.makeURI("sip:" + username + "@" + wsServer), // URI doğru şekilde oluşturuldu
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
      .catch((error) => {
        console.error("Register hata:", error);
      });

    ua.delegate = {
      onInvite(invitation) {
        invitation.accept().then((session) => {
          console.log("Davet kabul edildi:", session);
          handleSession(session);
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
        // Seçilen mikrofonu kullanarak ses akışını al
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            deviceId: { exact: selectedMicrophone }, // Seçilen mikrofon deviceId'sini kullan
          },
        });
        console.log("MediaStream");
        if (localAudioRef.current) {
          localAudioRef.current.srcObject = mediaStream; // Ses akışını yerel ses kaynağına bağla
        }

        const inviteOptions = {
          sessionDescriptionHandlerOptions: {
            constraints: { audio: true },
            localMediaStream: mediaStream,
          },
        };

        const inviter = new Inviter(userAgent, targetURI, inviteOptions); // Inviter'da URI kullanıldı

        inviter
          .invite()
          .then((session) => {
            session.delegate.onAccept((a)=>console.log("session.delegate içi",a))
            handleSession(session);
            // Hoparlör ayarını burada ayarlamak gerekebilir
            if (session && session.sessionDescriptionHandler) {
              const remoteStream =
                session.sessionDescriptionHandler.peerConnection;
              const audioElements = document.querySelectorAll("audio"); // Eğer birden fazla ses elementi varsa

              audioElements.forEach((audio) => {
                audio.srcObject = remoteStream; // Hoparlör akışını ilgili elemana bağla
              });
            }
          })
          .catch((error) => {
            console.error("Invite hata:", error);
          });

        // inviter?.statChange?.addListener((state) => {
        //   switch (state) {
        //     case SessionState.Initial:
        //       break;
        //     case SessionState.Establishing:
        //       break;
        //     case SessionState.Established:
        //       setupRemoteMedia(inviter);
        //       break;
        //     case SessionState.Terminating:
        //     // fall through
        //     case SessionState.Terminated:
        //       break;
        //     default:
        //       throw new Error("Unknown session state.");
        //   }
        // });
      } catch (error) {
        console.error("Media akışı alma hatası:", error);
      }
    } else {
      console.error("UserAgent ya da kayıtlı değil!");
    }
  };

  function setupRemoteMedia(session) {
    const remoteStream = session.sessionDescriptionHandler.peerConnection
      .getReceivers()
      .map((receiver) => receiver.track);

    // Burada remoteStream, uzaktaki kullanıcının medya akışı (ses/video) olur
    const remoteAudio = document.getElementById(selectedSpeaker);
    if (remoteAudio) {
      remoteAudio.srcObject = new MediaStream(remoteStream);
      remoteAudio.play();
    }
  }

  // Oturum yönetimi (session) ve medya akışını ayarlama

  const handleSession = (session) => {
    console.log("handleSession Session:", session);
  
    session.delegate = {
      onSessionDescriptionHandler() {
        console.log("Session Description Handler hazır");
        const peerConnection = session.sessionDescriptionHandler.peerConnection;
  
        // Track olayını dinle
        peerConnection.addEventListener("track", (event) => {
          console.log("Track olayı:", event);
          if (event.track.kind === "audio") {
            const remoteStream = new MediaStream();
            remoteStream.addTrack(event.track); // Uzaktaki ses akışını al
            
            if (remoteAudioRef.current) {
              remoteAudioRef.current.srcObject = remoteStream; // Ses akışını bağla
              remoteAudioRef.current.play(); // Oynatmaya başla
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

  //Media select functions
  useEffect(() => {
    const getDevices = async () => {
      const deviceInfos = await navigator?.mediaDevices?.enumerateDevices();
      setDevices(deviceInfos);

      // Varsayılan mikrofon ve hoparlörü ayarla
      const microphones = deviceInfos.filter(
        (device) => device.kind === "audioinput"
      );
      const speakers = deviceInfos.filter(
        (device) => device.kind === "audiooutput"
      );

      if (microphones.length > 0) {
        setSelectedMicrophone(microphones[0].deviceId); // İlk mikrofonu varsayılan olarak ayarla
      }

      if (speakers.length > 0) {
        setSelectedSpeaker(speakers[0].deviceId); // İlk hoparlörü varsayılan olarak ayarla
      }
    };

    getDevices();
  }, []);

  const handleMicrophoneChange = (event) => {
    setSelectedMicrophone(event.target.value);
  };

  const handleSpeakerChange = (event) => {
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
        <audio ref={localAudioRef} autoPlay muted></audio> {/* Kendi sesi */}
        <audio id="remote-audio" ref={remoteAudioRef} autoPlay></audio> {/* Karşı taraf sesi */}
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
          <h2>Hoperlör Seçin</h2>
          <select onChange={handleSpeakerChange} value={selectedSpeaker}>
            {devices
              .filter((device) => device.kind === "audiooutput")
              .map((device) => (
                <option key={device.deviceId} value={device.deviceId}>
                  {device.label || `Hoperlör ${device.deviceId}`}
                </option>
              ))}
          </select>
        </div>

        <div>
          <h2>Seçilen Aygıtlar</h2>
          <p>Seçilen Mikrofon: {selectedMicrophone}</p>
          <p>Seçilen Hoperlör: {selectedSpeaker}</p>
        </div>
      </div>
    </div>
  );
};

export default App;
