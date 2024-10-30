import {
  Invitation,
  Inviter,
  InviterOptions,
  Session,
  SessionState,
  UserAgent,
} from "sip.js";
import { OutgoingInviteRequest, URI } from "sip.js/lib/core";
const wsServer = "liwewireelectrical.site"; // SIP Server

function handleSession(
  session: Session | null,
  speaker: HTMLAudioElement | null
) {
  let sessionState = session?.state;
  const sessionDescriptionHandler: any = session?.sessionDescriptionHandler;
  const peerConnection: RTCPeerConnection =
    sessionDescriptionHandler?.peerConnection;

  if (session) {
    session.delegate = {
      async onBye(bye) {
        await bye.accept();
        console.log("onBye calisti");
        terminate();
      },
    };
  }

  session?.stateChange.addListener((newState) => {
    sessionState = newState;
    switch (newState) {
      case SessionState.Establishing:
        console.log("Çağrı başlatılıyor...");
        break;
      case SessionState.Established:
        console.log("Çağrı kuruldu!");
        break;
      case SessionState.Terminating:
        console.log("Çağrı sonlandırılıyor...");
        break;
      case SessionState.Terminated:
        console.log("Çağrı sonlandırıldı.");
        break;
      default:
        console.log("Bilinmeyen durum:", newState);
    }
  });

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
        receiver.track.enabled = true;
      }
    });
  };
  const changeMicrophone = async (deviceId: string) => {
    if (session) {
      try {
        // Yeni mikrofon cihazıyla medya akışını al
        const newStream = await navigator.mediaDevices.getUserMedia({
          audio: { deviceId: { exact: deviceId } },
        });

        const newTrack = newStream.getAudioTracks()[0];
        const sender = peerConnection
          .getSenders()
          .find((s: RTCRtpSender) => s.track?.kind === "audio");

        if (sender && newTrack) {
          await sender.replaceTrack(newTrack);
        }
      } catch (error) {
        console.error("Mikrofon değiştirme hatası:", error);
      }
    } else {
      console.error("handleMicrophoneChange: Session bulunamadı");
    }
  };

  const setSpeakerStream = () => {
    peerConnection?.addEventListener("track", (event) => {
      if (event.track.kind === "audio") {
        if (speaker) {
          speaker.srcObject = event.streams[0];
          speaker.play().catch((error) => console.log("Play hatası:", error));
        }
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
      case SessionState.Establishing:
        if (session instanceof Inviter) {
          await session.cancel().then(() => {
            console.log(`terminate Inviter canceled (sent CANCEL)`);
          });
        } else if (session instanceof Invitation) {
          session.reject().then(() => {
            console.log(`terminate Invitation rejected (sent 480)`);
          });
        } else {
          throw new Error("terminate Unknown session type.");
        }
      case SessionState.Established:
        await session.bye().then(() => {
          console.log(`terminate Session ended (sent BYE)`);
        });

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

  //Enable mic and speaker
  enableSenderTracks(true);
  enableReceiverTracks(true);
  setSpeakerStream();
  return {
    sessionState,
    changeMicrophone,
    terminate,
  };
}

export const call = async (
  userAgent: UserAgent | null,
  registered: boolean,
  target: string
): Promise<Inviter | void> => {
  if (userAgent && registered) {
    const targetURI = new URI("sip", target, wsServer); // Hedef URI burada oluşturuldu
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

      inviter
        .invite()
        .then(({ delegate }: OutgoingInviteRequest) => {
          console.log("inviter.invite() Başarılı");
        })
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

export default handleSession;
