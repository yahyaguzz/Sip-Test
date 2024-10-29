import { Invitation, Inviter, Session, SessionState } from "sip.js";

export const handleTerminate = async (
  session: Session | null,
  sessionState: SessionState
) => {
  if (!session) {
    console.error("Session bulunamadı!!");
    return;
  }
  switch (sessionState) {
    case SessionState.Initial:
      if (session instanceof Inviter) {
        await session.cancel().then(() => {
          console.log(`Inviter never sent INVITE (canceled)`);
        });
      } else if (session instanceof Invitation) {
        await session.reject().then(() => {
          console.log(`Invitation rejected (sent 480)`);
        });
      } else {
        throw new Error("Unknown session type.");
      }
    case SessionState.Establishing:
      if (session instanceof Inviter) {
        await session.cancel().then(() => {
          console.log(`Inviter canceled (sent CANCEL)`);
        });
      } else if (session instanceof Invitation) {
        session.reject().then(() => {
          console.log(` Invitation rejected (sent 480)`);
        });
      } else {
        throw new Error("Unknown session type.");
      }
    case SessionState.Established:
      await session.bye().then(() => {
        console.log(`Session ended (sent BYE)`);
      });

    case SessionState.Terminating:
      console.log("Functions", sessionState);

      break;
    case SessionState.Terminated:
      console.log("Functions", sessionState);

      break;
    default:
      throw new Error("Unknown state");
  }
};
