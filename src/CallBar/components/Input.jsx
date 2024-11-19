import React from "react";

function Input({
  leftIcon,
  rightIcon,
  placeholder,
  labelProps,
  inputProps,
  size,
}) {
  const { className: labelClassName = "", ...otherLabelProps } =
    labelProps || {};

  const { className: inputClassName = "", ...otherInputProps } =
    inputProps || {};
  return (
    <label
      className={`input input-bordered input-xs flex items-center gap-2 ${
        size === "md" || size === "lg" ? `sm:input-${size}` : "sm:input-sm"
      } ${labelClassName}`}
      {...otherLabelProps}
    >
      {leftIcon}
      <input
        type="text"
        className={`grow ${inputClassName}`}
        placeholder={placeholder}
        {...otherInputProps}
      />
      {rightIcon}
    </label>
  );
}

export default Input;
