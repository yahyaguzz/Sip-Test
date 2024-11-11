import { useEffect, useState } from "react";
import {
  Invitation,
  Inviter,
  InviterInviteOptions,
  InviterOptions,
  Registerer,
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
  const [registered, setRegistered] = useState<boolean>(false);
  const [invitation, setInvitation] = useState<SessionType | null>(null);
  const [sessions, setSessions] = useState<Array<SessionType>>([]);

  const sessionsLastIndex = sessions.length > 0 ? sessions.length - 1 : 0;
  const currentSession: SessionType | null =
    sessions.length > 0 ? sessions?.[sessionsLastIndex] : null;

  const transportOptions: TransportOptions = {
    server: `wss://${wsServer}:${user.wsPort}${user.serverPath}`,
    traceSip: true,
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
            setInvitation(null);
          },
          onCancel(cancel) {
            console.log("onBye çalıştı", cancel);
            setInvitation(null);
          },
          onSessionDescriptionHandler(sessionDescriptionHandler, provisional) {
            const newInvitation: SessionType = {
              session: invitation,
              sessionState: invitation.state,
            };

            setInvitation(newInvitation);
            setSessions((prevState) => [...prevState, newInvitation]);
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

    console.log("UserAgent oluşturuldu:", ua);

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
        setRegistered(true);
        setUserAgent(ua);
        console.log("Kullanıcı kayıt oldu!");
      })
      .catch((error: Error) => {
        console.error("Register hata:", error);
      });
  };

  //Session Management//
  const sessionDescriptionHandler: any =
    currentSession?.session?.sessionDescriptionHandler;
  const peerConnection: RTCPeerConnection =
    sessionDescriptionHandler?.peerConnection;

  //SessionState Control
  useEffect(() => {
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
          prevState.filter((s) => s.session.id !== currentSession?.session.id)
        );
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

    currentSession.session.delegate = {
      async onBye(bye) {
        await bye.accept();
        console.log("onBye calisti");
        terminate();
      },
      onSessionDescriptionHandler(sessionDescriptionHandler, provisional) {},
    };

    //Enable mic and speaker
    enableSenderTracks(true);
    enableReceiverTracks(true);
    startSpeakerStream();

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

  const enableSenderTracks = (enable: boolean) => {
    peerConnection?.getSenders().forEach((sender: RTCRtpSender) => {
      if (sender.track) {
        sender.track.enabled = enable;
      }
    });
  };

  const enableReceiverTracks = (enable: boolean) => {
    peerConnection?.getReceivers().forEach((receiver: RTCRtpReceiver) => {
      if (receiver.track) {
        receiver.track.enabled = enable;
      }
    });
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

  const startSpeakerStream = () => {
    peerConnection?.addEventListener("track", (event) => {
      if (event.track.kind === "audio" && speaker) {
        speaker.srcObject = event.streams[0];
        speaker.addEventListener("loadedmetadata", () => {
          speaker.play().catch((error) => console.log("Play hatası:", error));
        });
      }
    });
  };

  const terminate = async () => {
    if (!currentSession?.session) {
      console.log("terminate Session bulunamadı!!");
      return;
    }

    switch (sessionState) {
      case SessionState.Initial:
        if (currentSession?.session instanceof Inviter) {
          await currentSession?.session.cancel().then(() => {
            console.log(`terminate Inviter never sent INVITE (canceled)`);
          });
        }
        break;
      case SessionState.Establishing:
        if (currentSession?.session instanceof Inviter) {
          await currentSession?.session.cancel().then(() => {
            console.log(`terminate Inviter canceled (sent CANCEL)`);
          });
        }
        break;
      case SessionState.Established:
        await currentSession?.session.bye().then(() => {
          console.log(`terminate Session ended (sent BYE in Established)`);
        });
        break;
      case CustomSessionState.Held:
        await currentSession?.session.bye().then(() => {
          console.log(`terminate Session ended (sent BYE in Established)`);
        });
        break;
      case CustomSessionState.InConferance:
        await currentSession?.session.bye().then(() => {
          console.log(`terminate Session ended (sent BYE in Established)`);
        });
        break;
      case SessionState.Terminating:
        break;
      case SessionState.Terminated:
        break;
      default:
        throw new Error(`terminate Unknown state: ${sessionState}`);
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

  const setHold = async (): Promise<{
    message: string;
    success: boolean;
  }> => {
    try {
      if (
        !currentSession?.session ||
        !currentSession?.session.sessionDescriptionHandler
      ) {
        return { message: "Geçerli bir oturum bulunamadı.", success: false };
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
      };
    }
  };

  const call = async (target: string) => {
    if (userAgent && registered) {
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

        inviter
          .invite()
          .then(() => {})
          .catch((error: Error) => {
            console.error("inviter.invite() hata:", error);
          });
        setSessions((prevState) => [
          ...prevState,
          { session: inviter, sessionState: inviter.state },
        ]);
      } catch (error) {
        console.error("inviter.invite() Media akışı alma hatası:", error);
      }
    } else {
      console.error("inviter.invite() UserAgent ya da kayıtlı değil!");
    }
  };

  const answer = async () => {
    if (invitation?.session instanceof Invitation && invitation?.session) {
      await invitation.session
        .accept()
        .then(() => {
          console.log("Arama kabul edildi:", invitation);
          setHold();
          setInvitation(null);
        })
        .catch((error) => {
          console.error("Arama kabul edilemedi:", error);
        });
    } else {
      console.log("Gelen çağrı bulunamadı!");
    }
  };

  return {
    sessionState,
    incomingCall: invitation,
    registered,
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
  };
}

export default sipService;
