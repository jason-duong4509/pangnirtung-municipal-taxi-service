"use client";
import { Button } from "@mantine/core";

export default function NavbarOption({
  text,
  onClick,
}: {
  text: string;
  onClick: () => void;
}) {
  return (
    <Button
      c={"black"}
      justify="flex-start"
      onClick={onClick}
      p={0}
      variant="white"
      w={"100%"}
    >
      {text}
    </Button>
  );
}
