import React from "react";
import Content from "./Content";
import CallBar from "./CallBar";

function App() {
  return (
    <div className="flex flex-1">
      <CallBar>
        <Content />
      </CallBar>
    </div>
  );
}

export default App;
