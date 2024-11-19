import React from "react";

const Drawer = ({ children, sideContent }) => {
  return (
    <div className="drawer drawer-end z-[2]">
      {/* Drawer Toggle */}
      <input id="settings-drawer" type="checkbox" className="drawer-toggle" />

      {/* Main Content Area */}
      <div className="drawer-content">
        {children}
        {/* Example: Add a drawer toggle button if needed */}
      </div>

      {/* Drawer Sidebar */}
      <div className="drawer-side">
        <label
          htmlFor="settings-drawer"
          aria-label="close sidebar"
          className="drawer-overlay"
        ></label>
        <div className="w-80 h-full bg-base-300 p-4">{sideContent}</div>
      </div>
    </div>
  );
};

export default Drawer;
