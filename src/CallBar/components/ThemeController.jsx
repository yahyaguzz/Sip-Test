import React from "react";
import { FiMoon, FiSun } from "react-icons/fi";

function ThemeController({ ...props }) {
  const { className = "", ...otherProps } = props || {};
  return (
    <label className={`swap swap-rotate ${className}`} {...otherProps}>
      <input
        id="theme-controller"
        type="checkbox"
        className="theme-controller"
        value="dark"
      />
      <FiSun className="swap-off" />
      <FiMoon className="swap-on" />
    </label>
  );
}

export default ThemeController;
