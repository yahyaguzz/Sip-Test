import { useEffect, useState } from "react";
import {
  Invitation,
  Inviter,
  InviterInviteOptions,
  InviterOptions,
  Registerer,
  Session,
  SessionInfoOptions,
  SessionState,
  UserAgent,
  UserAgentOptions,
} from "sip.js";
import { URI } from "sip.js/lib/core";
import { holdModifier, TransportOptions } from "sip.js/lib/platform/web";
import {
  CustomSessionState,
  SessionStateType,
  SessionType,
  SipServiceResponse,
  User,
} from "./type";

const wsServer = "liwewireelectrical.site";
const initialStatsValues = {
  packetsSent: 0,
  bytesSent: 0,
  packetsReceived: 0,
  bytesReceived: 0,
};

function sipService(user: User) {
  const speaker = user.media?.remote?.audio;
  const [sessionState, setSessionState] = useState<SessionStateType>(
    SessionState.Initial
  );
  const [mediaStats, setMediaStats] = useState(initialStatsValues);
  const [statsIsActive, setStatsIsActive] = useState<number | null>(null);
  const [isOnHold, setIsOnHold] = useState<boolean>(false);

  const [userAgent, setUserAgent] = useState<UserAgent | null>(null);
  const [registerer, setRegisterer] = useState<Registerer | null>(null);
  const [invitation, setInvitation] = useState<SessionType | null>(null);
  const [sessions, setSessions] = useState<Array<SessionType>>([]);
  const [isMute, setIsMute] = useState<boolean>(true);

  const sessionsLastIndex = sessions.length > 0 ? sessions.length - 1 : 0;
  const currentSession: SessionType | null =
    sessions.length > 0 ? sessions?.[sessionsLastIndex] : null;
  const transportOptions: TransportOptions = {
    server: `wss://${wsServer}:${user.wsPort}${user.serverPath}`,
    traceSip: true,
  };

  const generateSession = (session: Session | Invitation | Inviter) => {
    const newSession: SessionType = {
      session: session,
      sessionState: session.state,
      displayName: session.remoteIdentity.displayName,
      number: session.remoteIdentity.uri.user,
    };

    if (session instanceof Invitation) {
      setInvitation(newSession);
    }

    setSessions((prevState) => [...prevState, newSession]);
    return newSession;
  };

  let uaOptions: UserAgentOptions = {
    uri: UserAgent.makeURI(`sip:${user.username}@${wsServer}`),
    transportOptions,
    authorizationUsername: user.username,
    authorizationPassword: user.password,
    displayName: user.username,
    logBuiltinEnabled: true,
    logLevel: "debug",
    delegate: {
      onInvite(invitation) {
        setInvitation({
          session: invitation,
          sessionState: invitation.state,
        });
        invitation.delegate = {
          onAck(ack) {
            console.log("onAck çalıştı", ack);
            setInvitation(null);
          },
          onBye(bye) {
            console.log("onBye çalıştı", bye);
            // bye.accept().then(() => {
            // })
            setSessions((prevState) =>
              prevState.filter((s) => s.session.id !== invitation.id)
            );
            setInvitation(null);
          },
          onCancel(cancel) {
            console.log("onBye çalıştı", cancel);
            setSessions((prevState) =>
              prevState.filter((s) => s.session.id !== invitation.id)
            );
            setInvitation(null);
          },
          onSessionDescriptionHandler(sessionDescriptionHandler, provisional) {
            enableSenderTracks(invitation);
            enableReceiverTracks(true, invitation);
            startSpeakerStream(invitation);
            generateSession(invitation);
          },
        };
      },
      ...user.delegate,
    },
    ...user.userAgentOptions,
  };

  const register = () => {
    if (!user.username || !user.password) {
      console.error("Username and password are required!");
      return;
    }

    const ua = new UserAgent(uaOptions);

    ua.start()
      .then(() => {
        const registerer = new Registerer(ua);
        registerer
          .register()
          .then((response) => {
            console.log("handleRegister Kayıt başarılı:", response);
          })
          .catch((error) => {
            console.log("Kayıt başarısız hata:", error);
          });
        setRegisterer(registerer);
        setUserAgent(ua);
        console.log("Kullanıcı kayıt oldu!");
      })
      .catch((error: Error) => {
        console.error("Register hata:", error);
      });
  };
  const unRegister = async (): Promise<SipServiceResponse> => {
    if (!userAgent || !registerer) {
      return { message: "Kayıttan çıkma başarısız", success: false };
    }
    try {
      await registerer?.unregister();
      userAgent
        ?.stop()
        .then(() => {
          setUserAgent(null);
        })
        .catch((err) =>
          console.error("Kullanıcı sonlandırma başarısız.\nHata:", err)
        );
      setRegisterer(null);
      setIsMute(false);
      setSessions([]);
      setIsOnHold(false);
      setInvitation(null);
    } catch (error) {
      return {
        message: "Kayıttan çıkma başarısız",
        success: false,
        error: error,
      };
    }
    return { message: "Kayıttan çıkıldı", success: true };
  };

  //Session Management//
  const sessionDescriptionHandler: any =
    currentSession?.session?.sessionDescriptionHandler;
  const peerConnection: RTCPeerConnection =
    sessionDescriptionHandler?.peerConnection;
  console.log("sipService-sessions:", sessions);
  //SessionState Control
  useEffect(() => {
    //todo: Buradaki media aygıtlarının aktifleştirilmesi daha farklı olmalı gibime geliyor.
    switch (sessionState) {
      case CustomSessionState.Held:
        break;
      case CustomSessionState.InConferance:
        break;
      case SessionState.Initial:
        break;
      case SessionState.Establishing:
        break;
      case SessionState.Established:
        break;
      case SessionState.Terminating:
        break;
      case SessionState.Terminated:
        setSessions((prevState) =>
          prevState.filter((s) => s.sessionState !== SessionState.Terminated)
        );
        // setSessions((prevState) =>
        //   prevState.filter((s) => s.session.id !== currentSession?.session.id)
        // );
        break;
      default:
        throw new Error("Unknown state");
    }
  }, [sessionState]);

  //Stats Control
  useEffect(() => {
    if (statsIsActive === null || !currentSession?.session) {
      setMediaStats(initialStatsValues);
      return;
    }

    const updateMediaStats = async () => {
      const stats = await monitorMediaStats();
      setMediaStats(stats);
    };

    const intervalId = setInterval(
      async () => await updateMediaStats(),
      statsIsActive
    );

    return () => clearInterval(intervalId);
  }, [currentSession?.session, statsIsActive]);

  //Session Starting
  useEffect(() => {
    if (!currentSession?.session) {
      setSessionState(SessionState.Terminated);
      return;
    }

    const handleStateChange = (newState: SessionState) => {
      switch (newState) {
        case SessionState.Established:
          setSessionState((prevState) =>
            prevState === CustomSessionState.Held ||
            prevState === CustomSessionState.InConferance
              ? prevState
              : SessionState.Established
          );
          break;
        default:
          setSessionState(newState);
      }
    };

    currentSession?.session.stateChange.addListener(handleStateChange);

    return () => {
      currentSession?.session.stateChange.removeListener(handleStateChange);
    };
  }, [currentSession?.session]);

  const enableSenderTracks = (session: Session): SipServiceResponse => {
    const sdh: any = session?.sessionDescriptionHandler;
    const peerConnection: RTCPeerConnection = sdh?.peerConnection;
    console.log("enableSenderTracks değişti:", peerConnection);
    try {
      peerConnection?.getSenders().forEach((sender: RTCRtpSender) => {
        if (sender.track) {
          sender.track.enabled = !isMute;
        }
      });
    } catch (error) {
      return {
        message: `Mikrofon aktifliği değiştirilemedi`,
        success: false,
        error: error,
      };
    }

    return {
      message: !isMute ? "Mikrofon aktif edildi" : "Mikrofon kapatıldı",
      success: true,
    };
  };

  const enableReceiverTracks = (
    enable: boolean,
    session: Session
  ): SipServiceResponse => {
    const sdh: any = session?.sessionDescriptionHandler;
    const peerConnection: RTCPeerConnection = sdh?.peerConnection;
    try {
      peerConnection?.getReceivers().forEach((receiver: RTCRtpReceiver) => {
        if (receiver.track) {
          receiver.track.enabled = enable;
        }
      });
    } catch (error) {
      return {
        message: `Hoparlör aktifliği değiştirilemedi`,
        success: false,
        error: error,
      };
    }

    return {
      message: enable ? "Hoparlör aktif edildi" : "Hoperlör kapatıldı",
      success: true,
    };
  };

  const startSpeakerStream = (session: Session): SipServiceResponse => {
    const sdh: any = session?.sessionDescriptionHandler;
    const peerConnection: RTCPeerConnection = sdh?.peerConnection;
    try {
      peerConnection?.addEventListener("track", (event) => {
        if (event.track.kind === "audio" && speaker) {
          speaker.srcObject = event.streams[0];
          speaker.addEventListener("loadedmetadata", () => {
            speaker.play().catch((error) => console.log("Play hatası:", error));
          });
        }
      });
    } catch (error) {
      return {
        message: `Gelen ses akışı baştılamadı`,
        success: false,
        error: error,
      };
    }

    return {
      message: "Gelen ses akışı başladı",
      success: true,
    };
  };

  const changeMicrophone = async (deviceId: string) => {
    if (currentSession?.session) {
      try {
        const newStream = await navigator.mediaDevices.getUserMedia({
          audio: { deviceId: { exact: deviceId } },
        });

        const newTrack = newStream.getAudioTracks()[0];
        if (peerConnection) {
          const sender = peerConnection
            .getSenders()
            .find((s: RTCRtpSender) => s.track?.kind === "audio");

          if (sender && newTrack) {
            await sender.replaceTrack(newTrack);
          }
        } else {
          console.log("TESTTTTTTT");
        }
      } catch (error) {
        console.error("Mikrofon değiştirme hatası:", error);
      }
    } else {
      console.error("handleMicrophoneChange: Session bulunamadı");
    }
  };

  const changeSpeaker = async (deviceId: string) => {
    if (speaker && speaker.setSinkId) {
      await speaker.setSinkId(deviceId).catch((error) => {
        console.error("Hoparlör değiştirilemedi:", error);
      });
    } else {
      console.warn("Tarayıcınız setSinkId() fonksiyonunu desteklemiyor.");
    }
  };

  const terminate = async (): Promise<SipServiceResponse> => {
    if (!currentSession?.session) {
      return { message: "Görüşme bulunamadı", success: false };
    }
    let terminateStatus = false;
    try {
      switch (sessionState) {
        case SessionState.Initial:
          if (currentSession?.session instanceof Inviter) {
            await currentSession?.session.cancel();
            terminateStatus = true;
          }
          break;
        case SessionState.Establishing:
          if (currentSession?.session instanceof Inviter) {
            await currentSession?.session.cancel();
            terminateStatus = true;
          }
          break;
        case SessionState.Established:
          await currentSession?.session.bye();
          terminateStatus = true;
          break;
        case CustomSessionState.Held:
          await currentSession?.session.bye();
          terminateStatus = true;
          break;
        case CustomSessionState.InConferance:
          await currentSession?.session.bye();
          terminateStatus = true;
          break;
        case SessionState.Terminating:
          break;
        case SessionState.Terminated:
          break;
        default:
          throw new Error(`terminate Unknown state: ${sessionState}`);
      }
      if (terminateStatus) {
        setSessions((prevState) =>
          prevState.filter((s) => s.session.id !== currentSession?.session.id)
        );
      }
      return { message: "Görüşme sonlandı", success: true };
    } catch (error) {
      return {
        message: "Görüşme sonlandırılamadı",
        success: false,
        error: error,
      };
    }
  };

  const reject = async () => {
    if (!invitation?.session) {
      console.log("terminate Session bulunamadı!!");
      return;
    }

    if (invitation?.session instanceof Invitation) {
      await invitation?.session.reject().then(() => {
        console.log(`terminate Invitation rejected (sent 480)`);
        setInvitation(null);
      });
    }
  };

  const startStatsMonitoring = (ms: number) => {
    if (ms === statsIsActive) return;
    setStatsIsActive(ms ?? 1000);
  };

  const stopStatsMonitoring = () => {
    setStatsIsActive(null);
  };

  const monitorMediaStats = async () => {
    let statsData = {
      packetsSent: 0,
      bytesSent: 0,
      packetsReceived: 0,
      bytesReceived: 0,
    };

    if (peerConnection) {
      const stats = await peerConnection?.getStats();
      stats.forEach((report) => {
        if (report.type === "outbound-rtp" && report.kind === "audio") {
          statsData.packetsSent = report.packetsSent;
          statsData.bytesSent = report.bytesSent;
        } else if (report.type === "inbound-rtp" && report.kind === "audio") {
          statsData.packetsReceived = report.packetsReceived;
          statsData.bytesReceived = report.bytesReceived;
        }
      });
    }
    return statsData;
  };

  const sendDmtf = (key: string) => {
    const dtmfBody = `Signal=${key}\r\nDuration=100\r\n`; // Ton ve süre bilgisi

    const options: SessionInfoOptions = {
      requestOptions: {
        body: {
          contentDisposition: "render",
          contentType: "application/dtmf-relay",
          content: dtmfBody,
        },
      },
    };

    currentSession?.session.info(options).catch((error) => {
      console.error("DTMF gönderimi başarısız:", error);
    });
  };

  const setHold = async (): Promise<SipServiceResponse> => {
    try {
      if (
        !currentSession?.session ||
        !currentSession?.session.sessionDescriptionHandler
      ) {
        return {
          message: "Geçerli bir oturum bulunamadı.",
          success: false,
        };
      }
      if (peerConnection.localDescription) {
        // SDP Güncellemesi
        const modifiers = !isOnHold
          ? [holdModifier] // Beklemeye almak için
          : []; // Beklemeden çıkarmak için

        // Re-INVITE gönderimi
        await currentSession?.session.invite({
          requestDelegate: {
            onAccept: () => {
              console.log(`Call ${!isOnHold ? "on hold" : "resumed"}`);
            },
            onReject: () => {
              console.error("Re-INVITE rejected.");
            },
          },
          sessionDescriptionHandlerModifiers: modifiers,
        });
      }
      setIsOnHold((prev) => !prev);
      setSessionState(
        isOnHold ? SessionState.Established : CustomSessionState.Held
      );
      return {
        message: `Çağrı ${
          !isOnHold ? "beklemeye alındı" : "beklemeden çıkarıldı"
        }.`,
        success: true,
      };
    } catch (error) {
      console.error("Beklemeye alma hatası:", error);
      return {
        message: "Beklemeye alma işleminde bir hata oluştu.",
        success: false,
        error: error,
      };
    }
  };

  const mute = () => {
    if (sessions.length > 0) {
      sessions?.map(({ session }) => {
        enableSenderTracks(session);
      });
    }
    setIsMute(!isMute);
    return { message: "Mikrofon kapatıldı", success: true };
  };

  const call = async (target: string) => {
    if (userAgent && registerer) {
      const targetURI = new URI("sip", target, wsServer);
      const inviterOptions: InviterOptions = {
        sessionDescriptionHandlerOptions: {
          constraints: {
            audio: true,
            video: false,
          },
        },
        earlyMedia: true,
      };

      try {
        const inviter = new Inviter(userAgent, targetURI, inviterOptions);

        const inviterInviteOptions: InviterInviteOptions = {
          sessionDescriptionHandlerOptions: {
            constraints: { audio: true, video: false },
          },
        };

        inviter.delegate = {
          onBye(bye) {
            setSessions((prevState) =>
              prevState.filter((s) => s.session.id !== inviter.id)
            );
          },
          onCancel(cancel) {
            setSessions((prevState) =>
              prevState.filter((s) => s.session.id !== inviter.id)
            );
          },
          onSessionDescriptionHandler(sessionDescriptionHandler, provisional) {
            enableSenderTracks(inviter);
            enableReceiverTracks(true, inviter);
            startSpeakerStream(inviter);
            generateSession(inviter);
          },
        };

        inviter
          .invite()
          .then(() => {})
          .catch((error: Error) => {
            console.error("inviter.invite() hata:", error);
          });
      } catch (error) {
        console.error("inviter.invite() Media akışı alma hatası:", error);
      }
    } else {
      console.error("inviter.invite() UserAgent ya da kayıtlı değil!");
    }
  };

  const answer = async () => {
    if (invitation?.session instanceof Invitation && invitation?.session) {
      try {
        await invitation.session.accept();
        console.log("Arama kabul edildi:", invitation);
        setHold();
        setInvitation(null);
      } catch (error) {
        return { message: "Arama kabul edilemedi" };
      }
    } else {
      console.log("Gelen çağrı bulunamadı!");
    }
  };

  return {
    sessionState,
    incomingCall: invitation,
    registerer,
    mediaStats,
    currentSession,
    changeMicrophone,
    changeSpeaker,
    startStatsMonitoring,
    stopStatsMonitoring,
    setHold,
    call,
    terminate,
    reject,
    answer,
    register,
    sendDmtf,
    mute,
    isMute,
    unRegister,
  };
}

export default sipService;
