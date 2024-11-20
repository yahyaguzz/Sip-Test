import { useEffect, useState } from "react";
import {
  Invitation,
  Inviter,
  InviterOptions,
  Registerer,
  RegistererState,
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
  SessionType,
  SipServiceResponse,
  User,
} from "./type";

const wsServer = "liwewireelectrical.site";
interface StatsType {
  sessionId: string;
  stats: {
    packetsSent: number;
    bytesSent: number;
    packetsReceived: number;
    bytesReceived: number;
  };
}

function sipService(user: User) {
  const speaker = user.media?.remote?.audio;
  const [mediaStats, setMediaStats] = useState<Array<StatsType>>([]);
  const [statsIsActive, setStatsIsActive] = useState<number | null>(null);

  const [userAgent, setUserAgent] = useState<UserAgent | null>(null);
  const [registerer, setRegisterer] = useState<Registerer | null>(null);
  const [registererState, setRegistererState] =
    useState<RegistererState | null>(null);
  const [invitation, setInvitation] = useState<SessionType | null>(null);
  const [sessions, setSessions] = useState<Array<SessionType>>([]);
  const [isMute, setIsMute] = useState<boolean>(false);

  const sessionsLastIndex = sessions.length > 0 ? sessions.length - 1 : 0;
  const currentSession: SessionType | null =
    sessions.length > 0
      ? sessions?.find((s) => s.sessionState !== CustomSessionState.Held) ||
        sessions?.[sessionsLastIndex]
      : null;

  const transportOptions: TransportOptions = {
    server: `wss://${wsServer}:${user.wsPort}${user.serverPath}`,
    traceSip: true,
  };

  const uaOptions: UserAgentOptions = {
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
          displayName: invitation.remoteIdentity.displayName,
          number: invitation.remoteIdentity.uri.user,
        });
        invitation.delegate = {
          onAck(ack) {
            console.log("onAck çalıştı", ack);
            toggleHold();
            setInvitation(null);
            generateSession(invitation);
          },
          onBye(bye) {
            console.log("onBye çalıştı", bye);
            removeSession(invitation);
            setInvitation(null);
          },
          onCancel(cancel) {
            console.log("onCancel çalıştı", cancel);
            removeSession(invitation);
            setInvitation(null);
          },
          onSessionDescriptionHandler() {},
        };
      },
      ...user.delegate,
    },
    ...user.userAgentOptions,
  };

  const generateSession = async (session: Session | Invitation | Inviter) => {
    const newSession: SessionType = {
      session: session,
      sessionState: session.state,
      displayName: session.remoteIdentity.displayName,
      number: session.remoteIdentity.uri.user,
    };
    // Setup tracks
    await changeMicrophone("default"); // Select default device at startup
    startSpeakerStream(session);
    enableReceiverTracks(true, session);
    enableSenderTracks(session, !isMute);

    setSessions((prevState) => [...prevState, newSession]);
  };

  const removeSession = (session: Session) => {
    setSessions((prevState) =>
      prevState.filter((s) => s.session.id !== session.id)
    );
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
            registerer.stateChange.addListener((state) => {
              setRegistererState(state);
            });
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

  //Stats Control
  useEffect(() => {
    if (statsIsActive === null || !currentSession?.session) {
      setMediaStats([]);
      return;
    }

    const updateMediaStats = async () => {
      const allStats = await Promise.all(
        sessions.map(async (s) => {
          return {
            sessionId: s.session.id,
            stats: await getMediaStats(s.session),
          };
        })
      );

      setMediaStats(allStats);
    };

    const intervalId = setInterval(
      async () => await updateMediaStats(),
      statsIsActive
    );

    return () => clearInterval(intervalId);
  }, [currentSession?.session, statsIsActive]);

  //Session State Management
  useEffect(() => {
    if (!currentSession) {
      return;
    }

    const handleStateChange = (
      newState: SessionState,
      session: SessionType
    ) => {
      switch (newState) {
        case SessionState.Established:
          const updatedSessions = sessions.map((s) =>
            s.session.id === session.session.id
              ? {
                  ...s,
                  sessionState:
                    s.sessionState === CustomSessionState.Held ||
                    s.sessionState === CustomSessionState.InConferance
                      ? s.sessionState
                      : SessionState.Established,
                }
              : s
          );
          setSessions(updatedSessions);
          break;
        case SessionState.Terminated:
          setSessions((prevState) =>
            prevState.filter((s) => s.sessionState !== SessionState.Terminated)
          );
          break;
        default:
          const newSessions = sessions?.map((s) =>
            s.session.id === session.session.id
              ? {
                  ...s,
                  sessionState: newState,
                }
              : s
          );
          setSessions(newSessions);
      }
    };

    // useEffect(() => {
    //   if (!invitation) return;

    //   // Session durumunu dinlemek için stateChange listener ekle
    //   invitation?.session.stateChange.addListener((state) => {
    //     console.log("Session state değişti:", state);

    //     // Çağrı reddedildi veya bittiğinde session'ı kaldır
    //     if (
    //       state === SessionState.Terminated
    //     ) {
    //       removeSession(invitation.session); // Session'ı listeden kaldır
    //     }
    //   });

    //   // return () => {
    //   //   // Listener'ı temizle
    //   //   invitation?.session.stateChange.removeListeners();
    //   // };
    // }, [invitation]);

    return sessions?.forEach((session) => {
      session.session.stateChange.addListener((state) =>
        handleStateChange(state, session)
      );
      return () => {
        session.session.stateChange.removeListener((event) =>
          handleStateChange(event, session)
        );
      };
    });
  }, [sessions]);

  const enableSenderTracks = (
    session: Session,
    enable: boolean
  ): SipServiceResponse => {
    const sdh: any = session?.sessionDescriptionHandler;
    const peerConnection: RTCPeerConnection = sdh?.peerConnection;
    console.log("enableSenderTracks değişti:", peerConnection);
    try {
      peerConnection?.getSenders().forEach((sender: RTCRtpSender) => {
        if (sender.track) {
          sender.track.enabled = enable;
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
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        audio: { deviceId: { exact: deviceId } },
      });

      let newTrack = newStream.getAudioTracks()[0];
      newTrack.enabled = !isMute;
      if (sessions.length > 0) {
        sessions.forEach(async ({ session }) => {
          const sdh: any = session.sessionDescriptionHandler;
          const peerConnection: RTCPeerConnection = sdh.peerConnection;

          const sender = peerConnection
            .getSenders()
            .find((s: RTCRtpSender) => s.track?.kind === "audio");
          if (sender && newTrack) {
            await sender.replaceTrack(newTrack);
            enableSenderTracks(session, !isMute);
          }
        });
      } else {
        console.log("Görüşme bulunamadı");
      }
    } catch (error) {
      console.error("Mikrofon değiştirme hatası:", error);
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
  console.log("currentSession?.sessionState", currentSession?.sessionState);
  const terminate = async (
    session?: SessionType
  ): Promise<SipServiceResponse> => {
    if (!currentSession) {
      return { message: "Görüşme bulunamadı", success: false };
    }

    const sessionUsed: SessionType = session || currentSession;
    try {
      switch (sessionUsed.sessionState) {
        case SessionState.Initial:
          if (sessionUsed?.session instanceof Inviter) {
            await sessionUsed?.session.cancel();
            removeSession(sessionUsed.session);
          }
          break;
        case SessionState.Establishing:
          if (sessionUsed?.session instanceof Inviter) {
            await sessionUsed?.session.cancel();
            removeSession(sessionUsed.session);
          }
          break;
        case SessionState.Established:
          await sessionUsed?.session.bye();
          removeSession(sessionUsed.session);
          break;
        case CustomSessionState.Held:
          await sessionUsed?.session.bye();
          removeSession(sessionUsed.session);
          break;
        case CustomSessionState.InConferance:
          await sessionUsed?.session.bye();
          removeSession(sessionUsed.session);
          break;
        case SessionState.Terminating:
          break;
        case SessionState.Terminated:
          break;
        default:
          throw new Error(
            `terminate Unknown state: ${sessionUsed.sessionState}`
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

  const startStatsMonitoring = (ms: number) => {
    if (ms === statsIsActive) return;
    setStatsIsActive(ms ?? 1000);
  };

  const stopStatsMonitoring = () => {
    setStatsIsActive(null);
  };

  const getMediaStats = async (session: Session) => {
    const sdh: any = session?.sessionDescriptionHandler;
    const peerConnection: RTCPeerConnection = sdh?.peerConnection;
    let statsData = {
      packetsSent: 0,
      bytesSent: 0,
      packetsReceived: 0,
      bytesReceived: 0,
    };

    if (peerConnection) {
      try {
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
      } catch (error) {
        console.error("Stats getirilemedi Hata:", error);
      }
    }

    return statsData;
  };

  const sendDtmf = (key: string, session?: SessionType) => {
    const sessionUsed = session || currentSession;
    const dtmfBody = `Signal=${key}\r\nDuration=100\r\n`;

    const options: SessionInfoOptions = {
      requestOptions: {
        body: {
          contentDisposition: "render",
          contentType: "application/dtmf-relay",
          content: dtmfBody,
        },
      },
    };

    sessionUsed?.session.info(options).catch((error) => {
      console.error("DTMF gönderimi başarısız:", error);
    });
  };

  const toggleHold = async (
    session?: SessionType
  ): Promise<SipServiceResponse> => {
    const findHeldSession = sessions?.find(
      (s) => s.sessionState !== CustomSessionState.Held
    );
    const sessionUsed = session || currentSession;

    if (
      sessionUsed?.sessionState === CustomSessionState.Held &&
      findHeldSession
    ) {
      return {
        message:
          "Aktif olan oturumlar mevcut. Konferans görüşmesi yapmak isterseniz birleştir butonunu kullanınız.",
        success: false,
      };
    }

    const isOnHold = sessionUsed?.sessionState === CustomSessionState.Held;
    const sdh: any = sessionUsed?.session?.sessionDescriptionHandler;
    const peerConnection: RTCPeerConnection = sdh?.peerConnection;
    if (
      !sessionUsed?.session ||
      !sessionUsed?.session.sessionDescriptionHandler
    ) {
      return {
        message: "Geçerli bir oturum bulunamadı.",
        success: false,
      };
    }

    try {
      if (peerConnection.localDescription) {
        // SDP Güncellemesi
        const modifiers = !isOnHold
          ? [holdModifier] // Beklemeye almak için
          : []; // Beklemeden çıkarmak için

        // Re-INVITE gönderimi
        await sessionUsed?.session.invite({
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
      const updatedSessions = sessions.map((s) =>
        s.session.id === sessionUsed.session.id
          ? {
              ...s,
              sessionState: isOnHold
                ? SessionState.Established
                : CustomSessionState.Held,
            }
          : s
      );
      setSessions(updatedSessions);
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

  const toggleMute = () => {
    if (sessions.length > 0) {
      sessions?.map(({ session }) => {
        enableSenderTracks(session, !!isMute);
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

        inviter.delegate = {
          onBye(bye) {
            bye.accept();
            removeSession(inviter);
          },
          onAck(ack) {
            console.warn("ACK çalıştı", ack);
          },
          onCancel(cancel) {
            removeSession(inviter);
          },
        };

        inviter
          .invite({
            requestDelegate: {
              onReject: (response) => {
                removeSession(inviter);
              },
            },
          })
          .then(() => {})
          .catch((error: Error) => {
            console.error("inviter.invite() hata:", error);
          });
        sessions?.forEach(async (s) => {
          if (s.sessionState !== CustomSessionState.Held) {
            await toggleHold(s);
          }
        });
        await generateSession(inviter);
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
        toggleHold();
        setInvitation(null);
      } catch (error) {
        return { message: "Arama kabul edilemedi" };
      }
    } else {
      console.log("Gelen çağrı bulunamadı!");
    }
  };

  const reject = async () => {
    if (!invitation?.session) {
      console.log("terminate Session bulunamadı!!");
      return;
    }

    if (invitation?.session instanceof Invitation) {
      await invitation?.session
        .reject()
        .then(() => {
          console.log(`terminate Invitation rejected (sent 480)`);
          setInvitation(null);
        })
        .catch((err) => console.log("Reject Hata:", err));
    }
  };

  return {
    sessionState: currentSession?.sessionState,
    incomingCall: invitation,
    registererState,
    mediaStats,
    currentSession,
    sessions,
    changeMicrophone,
    changeSpeaker,
    startStatsMonitoring,
    stopStatsMonitoring,
    toggleHold,
    toggleMute,
    call,
    terminate,
    reject,
    answer,
    register,
    sendDtmf,
    isMute,
    unRegister,
  };
}

export default sipService;
