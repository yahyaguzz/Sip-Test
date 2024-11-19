import React from "react";
import { MdCallReceived, MdOutlineCall } from "react-icons/md";

function IncomingCall({ incomingCall, answer, reject }) {
  return (
    <div
      style={{ zIndex: 80 }}
      className={`flex flex-col bg-base-200 shadow-lg p-4 min-w-64 rounded-lg relative items-center`}
    >
      {incomingCall?.displayName && (
        <span className={`text-md sm:text-xl text-center`}>
          {incomingCall?.displayName}
        </span>
      )}
      <span
        className={`text-sm sm:text-lg text-center ${
          !incomingCall?.displayName && "text-md sm:text-xl"
        }`}
      >
        {incomingCall?.number}
      </span>
      <div className="flex gap-1 items-center text-gray-500">
        <span className={`text-xs sm:text-lg text-center`}>Gelen Çağrı</span>
        <MdCallReceived size={12} />
      </div>

      {/* Buttons */}
      <div className="flex w-full justify-around rounded-lg p-6">
        <button
          className="btn btn-circle btn-success md:btn-lg btn-responsive"
          onClick={answer}
        >
          <MdOutlineCall className="fill-base-100" />
        </button>

        <button className="btn btn-circle btn-error md:btn-lg" onClick={reject}>
          <MdOutlineCall className="rotate-[135deg] fill-base-100" />
        </button>
      </div>
    </div>
  );
}

export default IncomingCall;
