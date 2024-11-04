import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import {
  UserAgent,
  Registerer,
  SessionState,
  Session,
  UserAgentOptions,
} from "sip.js";
import sipService, { call, useSessionState } from "./services/sip/sipService";
import { TransportOptions } from "sip.js/lib/platform/web";

// Cihaz türlerini tanımlamak için gerekli tipler
type MediaDeviceInfo = {
  deviceId: string;
  kind: string;
  label: string;
};

const App: React.FC = () => {
  // media audioDevices states
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedMicrophone, setSelectedMicrophone] = useState<string>("");
  const [selectedSpeaker, setSelectedSpeaker] = useState<string>("");

  const [userAgent, setUserAgent] = useState<UserAgent | null>(null);
  const [registered, setRegistered] = useState<boolean>(false);
  const [session, setSession] = useState<Session | null>(null);
  const [target, setTarget] = useState<string>("");
  const localAudioRef = useRef<HTMLAudioElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const [username, setUsername] = useState<string>("2000");
  const [password, setPassword] = useState<string>("W3$7Tr^j@");

  const wsServer = "liwewireelectrical.site";
  const serverPath = "/ws";
  const wsPort = 8089;

  const sessionState = useSessionState(session);
  const handleSession = useMemo(() => sipService(session, remoteAudioRef.current), [session, remoteAudioRef.current])

  console.log("Session State Yeni:", sessionState)

  const checkPermissions = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log("Mikrofon izni alındı.");
      stream.getTracks().forEach(track => track.stop());
    } catch (err) {
      console.error("Mikrofon izni reddedildi veya bir hata oluştu:", err);
    }
  };

  const getAudioDevices = async () => {

    const deviceInfos = await navigator.mediaDevices.enumerateDevices();
    setAudioDevices(deviceInfos);

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

  const handleDeviceChange = useCallback(async () => {
    await getAudioDevices();
    await handleMicrophoneChange({ target: { value: selectedMicrophone } } as React.ChangeEvent<HTMLSelectElement>);
    handleSpeakerChange({ target: { value: selectedSpeaker } } as React.ChangeEvent<HTMLSelectElement>);
  }, [selectedMicrophone, selectedSpeaker])

  useEffect(() => {
    checkPermissions()

    getAudioDevices();


    navigator.mediaDevices.ondevicechange = handleDeviceChange;

    return () => {
      navigator.mediaDevices.ondevicechange = null;
    };
  }, []);


  const handleMicrophoneChange = async (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newDeviceId = event.target.value;

    session && await handleSession.changeMicrophone(newDeviceId)
    setSelectedMicrophone(newDeviceId)
  };


  const handleSpeakerChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newDeviceId = event.target.value;

    session && handleSession.changeSpeaker(newDeviceId)
    setSelectedSpeaker(newDeviceId);
  };

  useEffect(() => {
    switch (sessionState) {
      case SessionState.Terminated:
        setSession(null)
        break;
      default:
        break;
    }
  }, [sessionState])

  const transportOptions: TransportOptions = {
    server: `wss://${wsServer}:${wsPort}${serverPath}`,
    traceSip: true,
  };

  const userAgentOptions: UserAgentOptions = {
    uri: UserAgent.makeURI(`sip:${username}@${wsServer}`),
    transportOptions,
    authorizationUsername: username,
    authorizationPassword: password,
    displayName: username,
    logBuiltinEnabled: true,
    logLevel: "debug",
    delegate: {
      onInvite(invitation) {
        console.log("Yeni arama geldi:", invitation);

        invitation.accept({
          sessionDescriptionHandlerOptions: {
            constraints: { audio: true, video: false },
          }
        }).then((response) => {
          console.log("Arama kabul edildi:", response);
          setSession(invitation);
        }).catch((error) => {
          console.error("Arama kabul edilemedi:", error);
        });
      },
      onConnect() {
        console.log("Connect oldu")
      },
    }
  };

  const handleRegister = async () => {
    if (!username || !password) {
      console.error("Username and password are required!");
      return;
    }

    const ua = new UserAgent(userAgentOptions);
    console.log("UserAgent oluşturuldu:", ua);
    ua.start()
      .then(() => {
        const registerer = new Registerer(ua);
        registerer.register().then((response) => {
          console.log("handleRegister Kayıt başarılı:", response);
        }).catch((error) => {
          console.log("Kayıt başarısız hata:", error);
        });
        setRegistered(true);
        setUserAgent(ua);
        console.log("Kullanıcı kayıt oldu!");
      })
      .catch((error: Error) => {
        console.error("Register hata:", error);
      });
  };

  const handleHangup = async () => {
    await handleSession?.terminate()
  }

  const handleCall = async () => {
    const newSession = await call(userAgent, registered, target)
    console.log("newSession:", newSession)
    if (newSession) {
      setSession(newSession);
    }
  };

  return (
    <div>
      <div>
        <h2>SIP.js WebRTC Client</h2>
        {/* Register */}
        <select value={username} onChange={(e) => setUsername(e.target.value)}>
          <option value="2000" defaultChecked>2000</option>
          <option value="2001">2001</option>
        </select>
        <select value={password} onChange={(e) => setPassword(e.target.value)}>
          <option value="W3$7Tr^j@" defaultChecked>2000 password</option>
          <option value="FpxT6718*">2001 password</option>
        </select>
        {/* <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <input
          type="text"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        /> */}
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
            {session && <button onClick={handleHangup}>Hangup</button>}
          </>
        )}
        {/* Ses akışı */}
        <audio ref={localAudioRef} autoPlay muted></audio>
        <audio ref={remoteAudioRef} autoPlay></audio>
      </div>

      <div>
        <button onClick={getAudioDevices}>Cihazları Yenile</button>
        <div>
          <h2>Mikrofon Seçin</h2>
          <select onChange={handleMicrophoneChange} value={selectedMicrophone}>
            {audioDevices
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
            {audioDevices
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
