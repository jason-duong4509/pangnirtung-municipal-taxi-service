"use client";
import { Button, useMantineTheme } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";

export default function Login() {
  const mantineTheme = useMantineTheme();
  const isMobile = useMediaQuery(
    `(max-width: ${mantineTheme.breakpoints.smMd})`,
  );

  return (
    <Button
      c={"black"}
      color={isMobile ? "buttonColor" : "customWhite"}
      radius={"lg"}
      size="xs"
      type="button"
    >
      Log in
    </Button>
  );
}
