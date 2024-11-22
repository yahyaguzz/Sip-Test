import {
  Invitation,
  Inviter,
  Session,
  SessionState,
  UserAgentDelegate,
  UserAgentOptions,
} from "sip.js";
import { SimpleUserMedia } from "sip.js/lib/platform/web";

export interface User {
  username: string;
  password: string;
  wsServer: string;
  serverPath: string;
  wsPort: number;
  delegate?: UserAgentDelegate;
  media?: SimpleUserMedia;
  userAgentOptions?: UserAgentOptions;
  selectedMicrophone?: string;
}

export type SessionStateType = SessionState | CustomSessionState;

export enum CustomSessionState {
  Held = "Held",
  InConference = "In-Conference",
}

export interface SessionType {
  session: Session | Invitation | Inviter;
  sessionState: SessionStateType;
  displayName?: string;
  number?: string;
}

export interface SipServiceResponse {
  message: string;
  success: boolean;
  error?: unknown;
}
