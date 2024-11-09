import { useEffect, useState } from "react";
import {
  Invitation,
  Inviter,
  InviterInviteOptions,
  InviterOptions,
  Session,
  SessionState,
  UserAgent,
} from "sip.js";
import { URI } from "sip.js/lib/core";
import { holdModifier, stripVideo } from "sip.js/lib/platform/web";

const wsServer = "liwewireelectrical.site";
const initialStatsValues = {
  packetsSent: 0,
  bytesSent: 0,
  packetsReceived: 0,
  bytesReceived: 0,
};

function handleSession(
  session: Session | null,
  speaker: HTMLAudioElement | null
) {
  const [sessionState, setSessionState] = useState<SessionState>(
    SessionState.Initial
  );
  const [mediaStats, setMediaStats] = useState(initialStatsValues);
  const [statsIsActive, setStatsIsActive] = useState<number | null>(null);
  const [isOnHold, setIsOnHold] = useState<boolean>(false);

  const sessionDescriptionHandler: any = session?.sessionDescriptionHandler;
  const peerConnection: RTCPeerConnection =
    sessionDescriptionHandler?.peerConnection;

  useEffect(() => {
    if (statsIsActive === null || !session) {
      setMediaStats(initialStatsValues);
      return;
    }

    const updateMediaStats = async () => {
      const stats = await monitorMediaStats(); // Değerleri al
      setMediaStats(stats); // State'i güncelle
    };

    const intervalId = setInterval(
      async () => await updateMediaStats(),
      statsIsActive
    );

    return () => clearInterval(intervalId);
  }, [session, statsIsActive]);

  useEffect(() => {
    if (!session) {
      setSessionState(SessionState.Terminated);
      return;
    }

    session.delegate = {
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
      setSessionState(newState);
    };

    session.stateChange.addListener(handleStateChange);

    return () => {
      session.stateChange.removeListener(handleStateChange);
    };
  }, [session]);

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

  // const mute = () => {
  //   enableSenderTracks(false);
  // };
  // const unMute = () => {
  //   enableSenderTracks(true);
  // };

  const changeMicrophone = async (deviceId: string) => {
    if (session) {
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
    if (!session) {
      console.log("terminate Session bulunamadı!!");
      return;
    }
    switch (sessionState) {
      case SessionState.Initial:
        if (session instanceof Inviter) {
          await session.cancel().then(() => {
            console.log(`terminate Inviter never sent INVITE (canceled)`);
          });
        } else if (session instanceof Invitation) {
          await session.reject().then(() => {
            console.log(`terminate Invitation rejected (sent 480)`);
          });
        } else {
          throw new Error("terminate Unknown session type.");
        }
        break;
      case SessionState.Establishing:
        if (session instanceof Inviter) {
          await session.cancel().then(() => {
            console.log(`terminate Inviter canceled (sent CANCEL)`);
          });
        } else if (session instanceof Invitation) {
          await session.reject().then(() => {
            console.log(`terminate Invitation rejected (sent 480)`);
          });
        } else {
          throw new Error("terminate Unknown session type.");
        }
        break;
      case SessionState.Established:
        await session.bye().then(() => {
          console.log(`terminate Session ended (sent BYE in Established)`);
        });
        break;
      case SessionState.Terminating:
        console.log("terminate", sessionState);
        break;
      case SessionState.Terminated:
        console.log("terminated", sessionState);
        break;
      default:
        throw new Error("Unknown state");
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

  // const setHold = () => {
  //   enableReceiverTracks(!isOnHold);
  //   enableSenderTracks(!isOnHold);
  //   setIsOnHold((prev) => !prev);
  // };

  const setHold = async (): Promise<{
    message: string;
    success: boolean;
  }> => {
    setIsOnHold((prev) => !prev);
    try {
      if (!session || !session.sessionDescriptionHandler) {
        return { message: "Geçerli bir oturum bulunamadı.", success: false };
      }
      if (peerConnection.localDescription) {
        // SDP Güncellemesi
        const modifiers = !isOnHold
          ? [holdModifier] // Beklemeye almak için
          : []; // Beklemeden çıkarmak için

        // Re-INVITE gönderimi
        await session.invite({
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

  return {
    sessionState,
    mediaStats,
    changeMicrophone,
    terminate,
    changeSpeaker,
    startStatsMonitoring,
    stopStatsMonitoring,
    setHold,
  };
}

export default handleSession;

export const call = async (
  userAgent: UserAgent | null,
  registered: boolean,
  target: string
): Promise<Inviter | void> => {
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
        // requestDelegate: {
        //   onAccept: (): void => {
        //     this.held = hold;
        //     enableReceiverTracks(true);
        //     this.enableSenderTracks(!this.held && !this.muted);
        //     if (this.delegate && this.delegate.onCallHold) {
        //       this.delegate.onCallHold(this.held);
        //     }
        //   },
        //   onReject: (): void => {
        //     this.logger.warn(`[${this.id}] re-invite request was rejected`);
        //     this.enableReceiverTracks(!this.held);
        //     this.enableSenderTracks(!this.held && !this.muted);
        //     if (this.delegate && this.delegate.onCallHold) {
        //       this.delegate.onCallHold(this.held);
        //     }
        //   }
        // }
      };
      inviter
        .invite()
        .then(() => {})
        .catch((error: Error) => {
          console.error("inviter.invite() hata:", error);
        });
      return inviter;
    } catch (error) {
      console.error("inviter.invite() Media akışı alma hatası:", error);
    }
  } else {
    console.error("inviter.invite() UserAgent ya da kayıtlı değil!");
  }
};
