import React, { useState, useRef, useEffect, useMemo } from "react";
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
import { SessionDescriptionHandler, SessionDescriptionHandlerConfiguration, TransportOptions } from "sip.js/lib/platform/web";
import sipService, { call } from "./services/sip/sipService";

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
  const [sessionState, setSessionState] = useState<SessionState>(SessionState.Initial);
  const [target, setTarget] = useState<string>("905418733299");
  const localAudioRef = useRef<HTMLAudioElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const [username, setUsername] = useState<string>("2000");
  const [password, setPassword] = useState<string>("W3$7Tr^j@");

  const wsServer = "liwewireelectrical.site"; // SIP Server
  const serverPath = "/ws"; // SIP Server Path
  const wsPort = 8089; // SIP Server Port


  const handleSession = useMemo(() => sipService(session, remoteAudioRef.current), [session, remoteAudioRef.current])
  console.log("Session State Yeni:", handleSession.sessionState)
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

    // const mediaStreamFactory = () => {
    //   return navigator.mediaDevices.getUserMedia({
    //     audio: true,
    //     video: false
    //   });
    // };

    const userAgentOptions: UserAgentOptions = {
      uri: UserAgent.makeURI(`sip:${username}@${wsServer}`),
      transportOptions,
      authorizationUsername: username,
      authorizationPassword: password,
      displayName: "Yahya Test",
      //Burayı kaldırdığımızda da çalışıyor
      // sessionDescriptionHandlerFactory: (session: Session, options) => {
      //   const sessionDescriptionHandlerConfiguration: SessionDescriptionHandlerConfiguration = {
      //     iceGatheringTimeout: 0,
      //     peerConnectionConfiguration: {
      //       iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
      //     },
      //   };
      //   const logger = session.userAgent.getLogger("sip.SessionDescriptionHandler");
      //   return new SessionDescriptionHandler(logger, mediaStreamFactory, sessionDescriptionHandlerConfiguration);
      // },
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
      // onInvite(invitation: Invitation) {
      //   invitation.accept({ sessionDescriptionHandlerOptions: { constraints: { audio: true, video: false } } }).then((response) => {
      //     console.log("Davet kabul edildi:", response);
      //     console.log("userAgentOptions sessionDescriptionHandlerFactory session.sessionDescriptionHandler", invitation.sessionDescriptionHandler)
      //   });
      //   handleSession(invitation);
      // },
      onDisconnect(error) {
        console.log("ua.delegate onDisconnect calisti")
        setSession(null)
      },
    }
  };

  const handleHangup = () => {
    handleSession?.terminate()
    setSession(null)
  }

  // Arama başlatma fonksiyonu
  const handleCall = async () => {
    const newSession = await call(userAgent, registered, target)
    console.log("newSession", newSession)
    if (newSession) {
      setSession(newSession);
    }
  };

  // Oturum yönetimi (session) ve medya akışını ayarlama
  const handleSessionOld = async (session: Session) => {



  };

  useEffect(() => {

    setSessionState(handleSession?.sessionState || SessionState.Initial);
    console.log("State Güncellendi: ",handleSession.sessionState)
  }, [handleSession.sessionState]);

  // Cihaz seçme fonksiyonları
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

  useEffect(() => {
    // Başlangıçta cihazları al
    getDevices();

    // Cihaz değişikliklerini dinle
    const handleDeviceChange = async () => {
      await handleMicrophoneChange({ target: { value: selectedMicrophone } } as React.ChangeEvent<HTMLSelectElement>);
      await getDevices();
    };

    navigator.mediaDevices.ondevicechange = handleDeviceChange;

    // Temizlik fonksiyonu
    return () => {
      navigator.mediaDevices.ondevicechange = null;
    };
  }, []);

  const handleMicrophoneChange = async (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newDeviceId = event.target.value;

    handleSession.changeMicrophone(newDeviceId)

    setSelectedMicrophone(newDeviceId)

  };


  const handleSpeakerChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newDeviceId = event.target.value;

    if (remoteAudioRef.current && remoteAudioRef.current.setSinkId) {
      remoteAudioRef.current.setSinkId(newDeviceId).catch((error) => {
        console.error("Hoparlör değiştirilemedi:", error);
      });
    } else {
      console.warn("Tarayıcınız setSinkId() fonksiyonunu desteklemiyor.");
    }
    setSelectedSpeaker(newDeviceId);
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
