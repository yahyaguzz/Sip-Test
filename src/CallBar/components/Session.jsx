import React from "react";
import { CustomSessionState } from "../../services/sip/type";
import { MdMerge, MdOutlineCall, MdPause, MdPlayArrow } from "react-icons/md";

function Session({ session, handleHold, handleTerminate, handleConference }) {
  return (
    <div className="dropdown dropdown-hover">
      <button tabIndex={0} className="btn btn-sm text-xs">
        <span className="truncate w-28">{session?.number}</span>
      </button>
      <div className="dropdown-content flex flex-col gap-1 bg-base-100 rounded-box z-[1] w-52 p-2 shadow">
        {session?.displayName && (
          <span className={`text-sm text-center self-center`}>
            {session?.displayName}
          </span>
        )}
        {session?.number && (
          <span
            className={`text-xs text-center self-center ${
              !session?.displayName && "text-sm"
            }`}
          >
            {session?.number}
          </span>
        )}
        <div className="flex justify-evenly">
          <label
            className={`btn btn-circle btn-sm swap swap-rotate ${
              session?.sessionState === CustomSessionState.Held &&
              "animate-pulse"
            }`}
          >
            <input
              type="checkbox"
              checked={session?.sessionState === CustomSessionState.Held}
              onClick={handleHold}
            />
            <MdPause className="swap-off" />
            <MdPlayArrow className="swap-on" />
          </label>
          {/* {session.sessionState !== CustomSessionState.InConference && (
            <button
              className="btn btn-circle btn-sm"
              onClick={handleConference}
            >
              <MdMerge />
            </button>
          )} */}
          <button
            className="btn btn-circle btn-error btn-sm"
            onClick={handleTerminate}
          >
            <MdOutlineCall className="rotate-[135deg] fill-base-100" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default Session;
