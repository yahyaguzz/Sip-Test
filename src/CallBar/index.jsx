import React, { useEffect, useRef, useState } from "react";
import ThemeController from "./components/ThemeController";
import {
  FaChevronDown,
  FaLock,
  FaMicrophone,
  FaMicrophoneSlash,
  FaNetworkWired,
  FaStackpath,
  FaUser,
} from "react-icons/fa6";
import {
  FiLock,
  FiMic,
  FiMicOff,
  FiPhone,
  FiSettings,
  FiUser,
  FiX,
} from "react-icons/fi";
import Input from "./components/Input";
import Drawer from "./components/Drawer";
import {
  MdCallReceived,
  MdClose,
  MdLock,
  MdMic,
  MdMicOff,
  MdOutlineCall,
  MdOutlineSettings,
  MdPause,
  MdPerson,
  MdPlayArrow,
  MdRefresh,
  MdSettings,
} from "react-icons/md";
import sipService from "../services/sip/sipService";
import { CustomSessionState } from "../services/sip/type";
import Session from "./components/Session";
import Modal from "./components/Modal";
import IncomingCall from "./components/IncomingCall";
import { RegistererState } from "sip.js";

function CallBar({ children }) {
  const tabs = [
    { id: "login", title: "Giriş Yap" },
    { id: "settings", title: "Ayarlar" },
  ];
  const [audioDevices, setAudioDevices] = useState([]);
  const [selectedMicrophone, setSelectedMicrophone] = useState("");
  const [selectedSpeaker, setSelectedSpeaker] = useState("");
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedTab, setSelectedTab] = useState(tabs?.[0]);
  const [incomingCallModal, setIncomingCallModal] = useState(null);
  const [sessionVolume, setSessionVolume] = useState(0.5);
  const [ringtoneVolume, setRingtoneVolume] = useState(0.5);
  const ringtoneRef = useRef(null);

  const [target, setTarget] = useState("");
  const localAudioRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const [username, setUsername] = useState("2000");
  const [password, setPassword] = useState("W3$7Tr^j@");
  const [wsServer, setWsServer] = useState("liwewireelectrical.site");
  const [serverPath, setServerPath] = useState("/ws");
  const [wsPort, setWsPort] = useState(8089);
  const [input, setInput] = useState("");

  const {
    changeMicrophone,
    changeSpeaker,
    startStatsMonitoring,
    stopStatsMonitoring,
    sessionState,
    mediaStats,
    registererState,
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
    sendDtmf,
    toggleMute,
    unRegister,
  } = sipService({
    username: username,
    password: password,
    serverPath: serverPath,
    wsPort: wsPort,
    wsServer: wsServer,
    media: {
      remote: {
        audio: remoteAudioRef.current || undefined,
      },
    },
  });

  // Medya tuşları zil sesini etkilediği için devre dışı bırakıyoruz
  useEffect(() => {
    if ("mediaSession" in navigator) {
      navigator.mediaSession.setActionHandler("play", () => {
        console.log("Play tuşu engellendi.");
      });
      navigator.mediaSession.setActionHandler("pause", () => {
        console.log("Pause tuşu engellendi.");
      });
      navigator.mediaSession.setActionHandler("stop", () => {
        console.log("Stop tuşu engellendi.");
      });
      navigator.mediaSession.setActionHandler("seekbackward", null); // Varsayılanı sıfırla
      navigator.mediaSession.setActionHandler("seekforward", null);
      navigator.mediaSession.setActionHandler("seekto", null);
      navigator.mediaSession.setActionHandler("previoustrack", null);
      navigator.mediaSession.setActionHandler("nexttrack", null);
    }

    return () => {
      // Cleanup işlemleri gerekirse eklenebilir
      if ("mediaSession" in navigator) {
        navigator.mediaSession.setActionHandler("play", null);
        navigator.mediaSession.setActionHandler("pause", null);
        navigator.mediaSession.setActionHandler("stop", null);
      }
    };
  }, []);

  useEffect(() => {
    setIncomingCallModal(incomingCall ? true : null);
  }, [incomingCall]);

  useEffect(() => {
    if (incomingCallModal) {
      ringtoneRef.current?.play();
    } else {
      ringtoneRef.current?.pause();
      ringtoneRef.current.currentTime = 0;
    }
  }, [incomingCallModal]);

  const toggleDrawer = () => {
    setIsDrawerOpen((prev) => !prev);
  };

  const checkAudioPermissions = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      if (!stream.active) {
        return { message: "Mikrofon izni alındı.", success: true };
      }
    } catch (err) {
      return {
        message:
          "Mikrofon iznini kontrol edin\n(Tarayıcınız medya aygıtlarını desteklemiyor olabilir.)\nİzinler aktif ve halen çalışmıyorsa farklı tarayıcıda tekrar deneyin.",
        err,
        success: false,
      };
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
      console.log("Cihaz bilgileri başarıyla alındı");
      return { message: "Cihaz bilgileri başarıyla alındı.", success: true };
    } catch (err) {
      console.error("Cihaz bilgilerini alırken bir hata oluştu:", err);
      return {
        message: "Cihaz bilgilerini alırken bir hata oluştu.",
        err,
        success: false,
      };
    }
  };

  const handleDeviceChange = async () => {
    await getAudioDevices();
    await handleMicrophoneChange({ target: { value: selectedMicrophone } });
    await handleSpeakerChange({ target: { value: selectedSpeaker } });
  };

  useEffect(() => {
    getAudioDevices();
    navigator.mediaDevices.ondevicechange = handleDeviceChange;
    return () => {
      navigator.mediaDevices.ondevicechange = null;
    };
  }, []);

  const handleMicrophoneChange = async (event) => {
    const newDeviceId = event.target.value;

    await changeMicrophone(newDeviceId);
    setSelectedMicrophone(newDeviceId);
  };

  const handleSpeakerChange = async (event) => {
    const newDeviceId = event.target.value;

    await changeSpeaker(newDeviceId);
    setSelectedSpeaker(newDeviceId);
  };

  const handleRegister = async () => {
    register();
  };

  const handleRefreshDevices = async () => {
    const permission = await checkAudioPermissions();

    if (!permission?.success) {
      alert(permission?.message);
      return;
    }
    console.log(permission.message);
    getAudioDevices();
  };

  const handleCall = async () => {
    const permission = await checkAudioPermissions();

    if (!permission?.success) {
      alert(permission?.message);
      return;
    }

    await call(target);
  };

  const handleMute = async () => {
    toggleMute();
  };

  const changeRingtoneVolume = (e) => {
    const newVolume = parseFloat(e.target.value);
    setRingtoneVolume(newVolume);
    if (ringtoneRef.current) {
      ringtoneRef.current.volume = newVolume;
    }
  };

  const changeSessionVolume = (e) => {
    const newVolume = parseFloat(e.target.value);
    setSessionVolume(newVolume);
    if (remoteAudioRef.current) {
      remoteAudioRef.current.volume = newVolume;
    }
  };

  return (
    <div className="flex flex-1 w-full h-full flex-col">
      <Modal
        visible={incomingCallModal}
        onClose={() => setIncomingCallModal(false)}
        disableBgClose
      >
        <IncomingCall
          incomingCall={incomingCall}
          answer={answer}
          reject={reject}
        />
      </Modal>
      <audio
        disableRemotePlayback
        className="hidden"
        ref={localAudioRef}
        translate="no"
        autoPlay
        muted
      ></audio>
      <audio
        disableRemotePlayback
        className="hidden"
        ref={remoteAudioRef}
        translate="no"
        autoPlay
      ></audio>
      {/* Ringtone Audio */}
      <audio
        disableRemotePlayback
        className="hidden"
        ref={ringtoneRef}
        translate="no"
        src="/ringtone.mp3"
        loop
      />
      <div
        className={`navbar fixed bg-base-300 bg-opacity-90 backdrop-blur-xl z-20 min-h-9 h-12 transition-all duration-300`}
      >
        {/* Bottom Shadow */}
        <div
          className={`absolute bottom-0 left-0 ${
            isDrawerOpen ? "w-[calc(100%-20rem)]" : "w-full"
          } h-2 bg-transparent shadow-md transition-all duration-200`}
        ></div>
        {/* Inner Navbar */}
        <div className="flex flex-col">
          <div className="flex justify-center items-center gap-1">
            <div
              className={`w-[6px] h-[6px] rounded-full ${
                registererState === RegistererState.Registered
                  ? "bg-green-500"
                  : "bg-red-500 animate-pulse"
              }`}
            />
            <label className="text-[10px]">
              {registererState === RegistererState.Registered
                ? "Çevrimiçi"
                : "Çevrimdışı"}
            </label>
          </div>

          <button
            className={`btn btn-circle btn-xs ${
              registererState === RegistererState.Registered && "hidden"
            }`}
            onClick={() => register()}
          >
            <MdRefresh className="" />
          </button>
        </div>
        <div className="flex-1 gap-2 justify-center transition-all duration-300">
          {/* Gelen Çağrı */}
          {incomingCallModal === false && (
            <div className="dropdown dropdown-hover transition-all duration-300">
              <button tabIndex={0} className="btn btn-sm text-xs">
                <span className="truncate w-28">{incomingCall?.number}</span>
                <div className="flex gap-1 items-center text-gray-500">
                  <span className={`text-xs text-center`}>Gelen Çağrı</span>
                  <MdCallReceived size={12} />
                </div>
              </button>
              <div className="dropdown-content z-[1]">
                <IncomingCall
                  incomingCall={incomingCall}
                  answer={answer}
                  reject={reject}
                />
              </div>
            </div>
          )}
          {/* Numara girişi */}
          <Input
            placeholder={"Numara Girin"}
            leftIcon={<MdOutlineCall />}
            inputProps={{
              type: "tel",
              value: target,
              onChange: (e) => setTarget(e.target.value),
            }}
          />
          <button
            className="btn btn-circle btn-success btn-sm btn-responsive"
            onClick={handleCall}
          >
            <MdOutlineCall className="fill-base-100" />
          </button>

          {currentSession && (
            <button
              className="btn btn-circle btn-error btn-sm"
              onClick={async () => await terminate()}
            >
              <MdOutlineCall className="rotate-[135deg] fill-base-100" />
            </button>
          )}
          {currentSession && (
            <label
              className={`btn btn-circle btn-sm swap swap-rotate ${
                currentSession?.sessionState === CustomSessionState.Held &&
                "animate-pulse"
              }`}
            >
              <input
                type="checkbox"
                checked={
                  currentSession?.sessionState === CustomSessionState.Held
                }
                onClick={async () => {
                  const { message } = await toggleHold();
                  console.log(message);
                }}
                readOnly
              />
              <MdPause className="swap-off" />
              <MdPlayArrow className="swap-on" />
            </label>
          )}
          <label className="btn btn-circle btn-sm swap swap-rotate">
            <input
              type="checkbox"
              checked={isMute}
              onClick={handleMute}
              readOnly
            />
            <MdMic size={16} className="swap-on" />
            <MdMicOff size={16} className="swap-off" />
          </label>

          {sessions?.map((session, index) => {
            return (
              <Session
                key={`session-${session.session.id}-${index}`}
                session={session}
                handleHold={async () => {
                  const { message } = await toggleHold(session);
                  console.log(message);
                }}
                handleTerminate={async () => await terminate(session)}
              />
            );
          })}
        </div>

        <div className="flex-none">
          <label
            htmlFor="settings-drawer"
            onClick={toggleDrawer}
            className="drawer-button swap swap-rotate btn btn-circle btn-ghost btn-sm"
          >
            <input type="checkbox" checked={isDrawerOpen} readOnly />
            <MdClose size={18} className="swap-on" />
            <MdOutlineSettings size={18} className="swap-off" />
          </label>
        </div>
      </div>

      {/* Drawer And Page Content Here */}
      <div className="drawer drawer-end">
        {/* Drawer Toggle */}
        <input
          id="settings-drawer"
          type="checkbox"
          checked={isDrawerOpen}
          className="drawer-toggle"
          readOnly
        />

        {/* Main Content Area */}
        <div className="drawer-content flex flex-col flex-1 w-full h-full bg-base-100 pt-12">
          {children}
        </div>

        {/* Drawer Sidebar */}
        <div className="drawer-side top-12">
          <label
            htmlFor="settings-drawer"
            aria-label="close sidebar" //${isDrawerOpen && "!bg-base-content/30"}
            className={`drawer-overlay !relative -inset-x-80 !transition-all !duration-500 ease-in ${
              isDrawerOpen && "!bg-base-content/10 !backdrop-blur-[1px]"
            }`}
            onClick={toggleDrawer}
          ></label>

          <div className="w-80 h-[calc(100%-3rem)] fixed top-12 bg-base-300/90 backdrop-blur-lg p-8 shadow-2xl">
            <div role="tablist" className="tabs tabs-bordered">
              {tabs.map((tab, index) => {
                return (
                  <a
                    key={`${tab?.id}-${index}`}
                    role="tab"
                    onClick={() => setSelectedTab(tab)}
                    className={`tab transition-all duration-300 ${
                      selectedTab?.id === tab?.id && "tab-active"
                    }`}
                  >
                    {tab?.title}
                  </a>
                );
              })}
            </div>
            <div></div>
            <div
              className={`flex flex-col gap-2 mt-4 transition-all duration-300`}
            >
              {/* Login Tab */}
              {selectedTab.id === "login" && (
                <>
                  <Input
                    size="md"
                    placeholder="Kullanıcı Adı"
                    leftIcon={<MdPerson />}
                    inputProps={{
                      value: username,
                      onChange: (e) => setUsername(e.target.value),
                    }}
                  />
                  <Input
                    size="md"
                    placeholder="Şifre"
                    leftIcon={<MdLock />}
                    inputProps={{
                      value: password,
                      onChange: (e) => setPassword(e.target.value),
                    }}
                  />
                  <Input
                    size="md"
                    placeholder="Server"
                    leftIcon={<FaNetworkWired />}
                    inputProps={{
                      value: wsServer,
                      onChange: (e) => setWsServer(e.target.value),
                    }}
                  />
                  <Input
                    size="md"
                    placeholder="Server Path"
                    leftIcon={<FaStackpath />}
                    inputProps={{
                      value: serverPath,
                      onChange: (e) => setServerPath(e.target.value),
                    }}
                  />
                  <Input
                    size="md"
                    placeholder="Server Port"
                    leftIcon={<FaStackpath />}
                    inputProps={{
                      value: wsPort,
                      onChange: (e) => setWsPort(e.target.value),
                    }}
                  />
                  <div className="flex flex-1 gap-4">
                    <button
                      className="btn btn-error btn-outline flex-1"
                      onClick={unRegister}
                    >
                      Çıkış Yap
                    </button>
                    <button
                      className="btn btn-success text-base-100 btn-md flex-1"
                      onClick={handleRegister}
                    >
                      Giriş Yap
                    </button>
                  </div>
                </>
              )}

              {/* Settings Tab */}
              {selectedTab.id === "settings" && (
                <>
                  <label
                    htmlFor="theme-controller"
                    className="label label-text self-start gap-4 cursor-pointer"
                  >
                    Tema
                    <ThemeController className="" />
                  </label>

                  <button
                    id="refresh-devices"
                    className="btn btn-sm"
                    onClick={handleRefreshDevices}
                  >
                    Cihazları Yenile <MdRefresh />
                  </button>

                  <label htmlFor="mic" className="form-control label-text">
                    Mikrofonlar
                    <select
                      id="mic"
                      className="select select-bordered select-md w-full max-w-xs"
                      onChange={handleMicrophoneChange}
                      value={selectedMicrophone}
                    >
                      {audioDevices
                        .filter((device) => device.kind === "audioinput")
                        .map((device) => (
                          <option key={device.deviceId} value={device.deviceId}>
                            {device.label || `Mikrofon ${device.deviceId}`}
                          </option>
                        ))}
                    </select>
                  </label>

                  <label htmlFor="speaker" className="form-control label-text">
                    Hoperlörler
                    <select
                      id="speaker"
                      className="select select-bordered select-md w-full max-w-xs"
                      onChange={handleSpeakerChange}
                      value={selectedSpeaker}
                    >
                      {audioDevices
                        .filter((device) => device.kind === "audiooutput")
                        .map((device) => (
                          <option key={device.deviceId} value={device.deviceId}>
                            {device.label || `Hoparlör ${device.deviceId}`}
                          </option>
                        ))}
                    </select>
                  </label>
                  <label
                    htmlFor="ringtoneVolume"
                    className="label label-text gap-2"
                  >
                    Zil Sesi Seviyesi
                    <input
                      id="ringtoneVolume"
                      type="range"
                      min={0}
                      max="1"
                      step="0.01"
                      value={ringtoneVolume}
                      onChange={changeRingtoneVolume}
                      className="range range-xs !w-44"
                    />
                  </label>
                  <label
                    htmlFor="sessionVolume"
                    className="label label-text gap-2"
                  >
                    Görüşme Ses Seviyesi
                    <input
                      id="sessionVolume"
                      type="range"
                      min={0}
                      max="1"
                      step="0.01"
                      value={sessionVolume}
                      onChange={changeSessionVolume}
                      className="range range-xs !w-44"
                    />
                  </label>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CallBar;
