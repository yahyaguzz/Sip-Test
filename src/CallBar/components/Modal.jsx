import React, { useEffect, useState } from "react";
import { MdCallReceived, MdClose, MdOutlineCall } from "react-icons/md";

function Modal({ children, visible, onClose, disableBgClose }) {
  const handleClose = () => {
    onClose && onClose();
  };

  return (
    <div
      className={`absolute inset-0 opacity-0 bg-base-content/30 shadow-2xl backdrop-blur-[2px] flex justify-center items-center transition-all duration-300 ${
        !!visible && "opacity-100 z-50"
      } ${visible === null && "hidden"}`}
    >
      <div
        onClick={!disableBgClose && handleClose}
        className="absolute inset-0 w-screen h-screen"
      />
      <div
        className={`flex flex-col -translate-y-5 bg-base-200 shadow-lg rounded-lg relative transition-transform duration-300 ${
          visible ? "translate-y-0" : "-translate-y-5"
        }`}
      >
        <button
          onClick={handleClose}
          className="btn btn-ghost btn-circle btn-xs absolute top-2 right-2 z-[90]"
        >
          <div className="w-2 border-b-2 border-base-content" />
        </button>
        {children}
      </div>
    </div>
  );
}

export default Modal;
