import React from "react";

interface InputBoxProps {
  children: React.ReactNode;
}

export function InputBox(
  props: InputBoxProps
): React.ReactElement<InputBoxProps> {
  return <div>{props.children}</div>;
}
