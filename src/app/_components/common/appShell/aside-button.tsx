"use client";
import { Button, Group } from "@mantine/core";
import type { JSX } from "react";

export default function AsideButton({
  expandButton,
  onClick,
  buttonText,
  buttonIcon,
}: {
  expandButton: boolean;
  onClick: () => void;
  buttonText: string;
  buttonIcon: JSX.Element;
}) {
  return (
    <Button
      aria-label={buttonText}
      c="black"
      justify={expandButton ? "flex-start" : "center"}
      onClick={onClick}
      pb={0}
      pl={expandButton ? "xs" : 0}
      pr={0}
      pt={0}
      variant="white"
    >
      <Group gap={"xs"}>
        {buttonIcon}
        {expandButton ? buttonText : undefined}
      </Group>
    </Button>
  );
}
