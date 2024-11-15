import React from "react";

function CallBar({ children }) {
  return (
    <div className="flex flex-1 w-screen h-screen flex-col">
      <div className="bg-slate-400 w-full h-11"></div>
      <div className="flex flex-1 w-full h-full bg-slate-200">{children}</div>
    </div>
  );
}

export default CallBar;
