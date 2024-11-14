import React, { useState, useRef, useEffect } from "react";
import sipService from "./services/sip/sipService";
import { CustomSessionState } from "./services/sip/type";

const App: React.FC = () => {
  //numpad keys
  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "0", "#"];

  // Media AudioDevices States
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedMicrophone, setSelectedMicrophone] = useState<string>("");
  const [selectedSpeaker, setSelectedSpeaker] = useState<string>("");
  //Sip Option States
  const [target, setTarget] = useState<string>("");
  const localAudioRef = useRef<HTMLAudioElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const [username, setUsername] = useState<string>("2000");
  const [password, setPassword] = useState<string>("W3$7Tr^j@");
  const [input, setInput] = useState("");

  const wsServer = "liwewireelectrical.site";
  const serverPath = "/ws";
  const wsPort = 8089;

  const {
    changeMicrophone,
    changeSpeaker,
    startStatsMonitoring,
    stopStatsMonitoring,
    sessionState,
    mediaStats,
    registerer,
    incomingCall,
    currentSession,
    sessions,
    isMute,
    terminate,
    reject,
    toggleHold,
    register,
    call,
    answer,
    sendDmtf,
    toggleMute,
    unRegister
  } = sipService({
    username: username,
    password: password,
    serverPath: serverPath,
    wsPort: wsPort,
    wsServer: wsServer,
    media: {
      remote: {
        audio: remoteAudioRef.current || undefined
      }
    }
  })

  const handleKeyPress = (key: string) => {
    console.log("Tuşa Basıldı:", key);
    setInput((prev) => prev + key);
    sendDmtf(key)
  };
  console.log("Session State Yeni:", sessionState)

  const checkAudioPermissions = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      if (!stream.active) {
        return { message: "Mikrofon izni alındı.", success: true }
      }
    } catch (err) {
      return { message: "Mikrofon iznini kontrol edin\n(Tarayıcınız medya aygıtlarını desteklemiyor olabilir.)\nİzinler aktif ve halen çalışmıyorsa farklı tarayıcıda tekrar deneyin.", err, success: false }
    }
  };

  const getAudioDevices = async () => {
    try {
      const deviceInfos = await navigator.mediaDevices.enumerateDevices();

      if (!deviceInfos || deviceInfos.length === 0) {
        console.error("Cihaz bilgileri alınamadı.");
        return { message: "Cihaz bilgileri alınamadı.", success: false };
      }

      console.log("deviceInfos", deviceInfos);
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
      console.log("Cihaz bilgileri başarıyla alındı")
      return { message: "Cihaz bilgileri başarıyla alındı.", success: true };
    } catch (err) {
      console.error("Cihaz bilgilerini alırken bir hata oluştu:", err);
      return { message: "Cihaz bilgilerini alırken bir hata oluştu.", err, success: false };
    }
  };

  const handleDeviceChange = async () => {
    await getAudioDevices();
    await handleMicrophoneChange({ target: { value: selectedMicrophone } } as React.ChangeEvent<HTMLSelectElement>);
    await handleSpeakerChange({ target: { value: selectedSpeaker } } as React.ChangeEvent<HTMLSelectElement>);
  }

  useEffect(() => {
    getAudioDevices();
    navigator.mediaDevices.ondevicechange = handleDeviceChange;
    return () => {
      navigator.mediaDevices.ondevicechange = null;
    };
  }, []);


  const handleMicrophoneChange = async (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newDeviceId = event.target.value;

    await changeMicrophone(newDeviceId)
    setSelectedMicrophone(newDeviceId)
  };


  const handleSpeakerChange = async (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newDeviceId = event.target.value;

    await changeSpeaker(newDeviceId)
    setSelectedSpeaker(newDeviceId);
  };

  const handleRegister = async () => {
    register()
  };

  const handleRefreshDevices = async () => {
    const permission = await checkAudioPermissions()

    if (!permission?.success) {
      alert(permission?.message)
      return
    }
    console.log(permission.message)
    getAudioDevices()
  }

  const handleCall = async () => {
    const permission = await checkAudioPermissions()

    if (!permission?.success) {
      alert(permission?.message)
      return
    }

    await call(target)
    // if (newSession) {
    //   setSession(newSession);
    // }
  };

  return (
    <div>
      <div>
        {sessions.map((session, index) => <div key={`session-${index}-${session.number}`} className="flex flex-row">
          <div>

            <div>Display Name: {session.displayName}</div>
            <div>Numara: {session.number}</div>
            <div>Durum: {session.sessionState}</div>
          </div>
          <div>
            <button onClick={async () => terminate(session)}>Görüşmeyi Bitir</button>
            <button onClick={async () => await toggleHold(session)}>{session.sessionState === CustomSessionState.Held ? "Beklemeden Çıkar" : "Beklemeye Al"}</button>

          </div>
        </div>)}
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
        <button onClick={unRegister}>unRegister</button>
        {/* Arama Yapma */}
        {registerer && (
          <>
            <input
              type="text"
              list="suggestions"
              placeholder="Target username"
              value={target ?? ""}
              onChange={(e) => setTarget(e.target.value)}
            />
            <datalist id="suggestions">
              <option value="905418733299" />
              <option value="2000" />
              <option value="2001" />
            </datalist>
            <button onClick={handleCall}>Arama Yap</button>
            {currentSession &&
              <>
                <button onClick={async () => await terminate()}>Kapat</button>
                <button onClick={async () => await toggleHold()}>{currentSession?.sessionState === CustomSessionState.Held ? "Beklemede" : "Beklemeye Al"}</button>
              </>}
            <button onClick={toggleMute}>{isMute ? "Mikrofonu Aç" : "Mikrofonu Kapat"}</button>
            {incomingCall && <button onClick={reject}>Reddet</button>}
          </>
        )}
        {/* Ses akışı */}
        <audio ref={localAudioRef} translate="no" autoPlay muted></audio>
        <audio ref={remoteAudioRef} translate="no" autoPlay></audio>
      </div>
      {currentSession && <><h2>currentSession Çağrı</h2>
        {currentSession.displayName && <h1>Display Name: {currentSession.displayName}</h1>}
        <h1>Number: {currentSession.number}</h1>
      </>}
      {incomingCall && <>
        <h2>incomingCall Gelen Çağrı</h2>
        {incomingCall.displayName && <h1>Display Name: {incomingCall.displayName}</h1>}
        <h1>Number: {incomingCall.number}</h1>
        <button onClick={answer}>
          Yanıtla
        </button>
      </>}
      <div>
        <button onClick={handleRefreshDevices}>
          Cihazları Yenile
        </button>
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
        <div>
          <h2>Gelen Giden Veriler</h2>
          <label htmlFor="selectMs"></label>
          <select id="selectMs" defaultValue={-1} onChange={(event) => {
            if (Number(event.target.value) === -1) {
              stopStatsMonitoring()
              return
            }
            startStatsMonitoring(Number(event.target.value))
          }}>
            <option value={-1}>Stop Monitoring</option>
            <option value={1000}>1000</option>
            <option value={3000}>3000</option>
            <option value={5000}>5000</option>
          </select>
          {
            mediaStats.map(({ stats, sessionId }) =>
              <>
                <p>Oturum Id: {sessionId}</p>
                <p>Gelen Paketler: {stats.bytesReceived}</p>
                <p>Giden Paketler: {stats.bytesSent}</p>
              </>)
          }

        </div>
        <div className="flex flex-col items-center justify-center bg-slate-700 p-2">
          {/* Giriş Alanı */}
          <div className="mb-4 text-2xl font-semibold text-gray-800">
            {input || "Tuşlayın..."}
          </div>

          {/* Tuş Takımı */}
          <div className="grid grid-cols-3 gap-4 w-40">
            {keys.map((key) => (
              <button
                key={key}
                onClick={() => handleKeyPress(key)}
                className="bg-blue-500 text-white font-bold py-2 px-4 rounded hover:bg-blue-700 active:bg-blue-800"
              >
                {key}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
