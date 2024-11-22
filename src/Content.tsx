import React, { useState, useRef, useEffect } from "react";
import sipService from "./services/sip/sipService";
import { CustomSessionState } from "./services/sip/type";

const Content: React.FC = () => {
    // //numpad keys
    // const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "0", "#"];

    // // Media AudioDevices States
    // const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
    // const [selectedMicrophone, setSelectedMicrophone] = useState<string>("");
    // const [selectedSpeaker, setSelectedSpeaker] = useState<string>("");
    // //Sip Option States
    // const [target, setTarget] = useState<string>("");
    // const localAudioRef = useRef<HTMLAudioElement>(null);
    // const remoteAudioRef = useRef<HTMLAudioElement>(null);
    // const [username, setUsername] = useState<string>("2000");
    // const [password, setPassword] = useState<string>("W3$7Tr^j@");
    // const [input, setInput] = useState("");

    // const wsServer = "liwewireelectrical.site";
    // const serverPath = "/ws";
    // const wsPort = 8089;

    // const {
    //     changeMicrophone,
    //     changeSpeaker,
    //     startStatsMonitoring,
    //     stopStatsMonitoring,
    //     sessionState,
    //     mediaStats,
    //     incomingCall,
    //     currentSession,
    //     sessions,
    //     isMute,
    //     terminate,
    //     reject,
    //     toggleHold,
    //     register,
    //     call,
    //     answer,
    //     sendDtmf,
    //     toggleMute,
    //     unRegister
    // } = sipService({
    //     username: username,
    //     password: password,
    //     serverPath: serverPath,
    //     wsPort: wsPort,
    //     wsServer: wsServer,
    //     media: {
    //         remote: {
    //             audio: remoteAudioRef.current || undefined
    //         }
    //     }
    // })

    // const handleKeyPress = (key: string) => {
    //     console.log("Tuşa Basıldı:", key);
    //     setInput((prev) => prev + key);
    //     sendDtmf(key)
    // };
    // console.log("Session State Yeni:", sessionState)

    // const checkAudioPermissions = async () => {
    //     try {
    //         const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    //         stream.getTracks().forEach(track => track.stop());
    //         if (!stream.active) {
    //             return { message: "Mikrofon izni alındı.", success: true }
    //         }
    //     } catch (err) {
    //         return { message: "Mikrofon iznini kontrol edin\n(Tarayıcınız medya aygıtlarını desteklemiyor olabilir.)\nİzinler aktif ve halen çalışmıyorsa farklı tarayıcıda tekrar deneyin.", err, success: false }
    //     }
    // };

    // const getAudioDevices = async () => {
    //     try {
    //         const deviceInfos = await navigator.mediaDevices.enumerateDevices();

    //         if (!deviceInfos || deviceInfos.length === 0) {
    //             console.error("Cihaz bilgileri alınamadı.");
    //             return { message: "Cihaz bilgileri alınamadı.", success: false };
    //         }

    //         console.log("deviceInfos", deviceInfos);
    //         setAudioDevices(deviceInfos);

    //         const microphones = deviceInfos.filter(
    //             (device) => device.kind === "audioinput"
    //         );
    //         const speakers = deviceInfos.filter(
    //             (device) => device.kind === "audiooutput"
    //         );

    //         if (microphones.length > 0) {
    //             setSelectedMicrophone(microphones[0].deviceId);
    //         }

    //         if (speakers.length > 0) {
    //             setSelectedSpeaker(speakers[0].deviceId);
    //         }
    //         console.log("Cihaz bilgileri başarıyla alındı")
    //         return { message: "Cihaz bilgileri başarıyla alındı.", success: true };
    //     } catch (err) {
    //         console.error("Cihaz bilgilerini alırken bir hata oluştu:", err);
    //         return { message: "Cihaz bilgilerini alırken bir hata oluştu.", err, success: false };
    //     }
    // };

    // const handleDeviceChange = async () => {
    //     await getAudioDevices();
    //     await handleMicrophoneChange({ target: { value: selectedMicrophone } } as React.ChangeEvent<HTMLSelectElement>);
    //     await handleSpeakerChange({ target: { value: selectedSpeaker } } as React.ChangeEvent<HTMLSelectElement>);
    // }

    // useEffect(() => {
    //     getAudioDevices();
    //     navigator.mediaDevices.ondevicechange = handleDeviceChange;
    //     return () => {
    //         navigator.mediaDevices.ondevicechange = null;
    //     };
    // }, []);


    // const handleMicrophoneChange = async (event: React.ChangeEvent<HTMLSelectElement>) => {
    //     const newDeviceId = event.target.value;

    //     await changeMicrophone(newDeviceId)
    //     setSelectedMicrophone(newDeviceId)
    // };


    // const handleSpeakerChange = async (event: React.ChangeEvent<HTMLSelectElement>) => {
    //     const newDeviceId = event.target.value;

    //     await changeSpeaker(newDeviceId)
    //     setSelectedSpeaker(newDeviceId);
    // };

    // const handleRegister = async () => {
    //     register()
    // };

    // const handleRefreshDevices = async () => {
    //     const permission = await checkAudioPermissions()

    //     if (!permission?.success) {
    //         alert(permission?.message)
    //         return
    //     }
    //     console.log(permission.message)
    //     getAudioDevices()
    // }

    // const handleCall = async () => {
    //     const permission = await checkAudioPermissions()

    //     if (!permission?.success) {
    //         alert(permission?.message)
    //         return
    //     }

    //     await call(target)
    //     // if (newSession) {
    //     //   setSession(newSession);
    //     // }
    // };

    return (
        <div className="flex flex-1 w-full h-full flex-col gap-2 bg-slate-300">
           
        </div>
    );
};

export default Content;
