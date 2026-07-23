"use client";
import {
  Box,
  Burger,
  Button,
  Collapse,
  Stack,
  useMantineTheme,
} from "@mantine/core";
import { useDisclosure, useMediaQuery } from "@mantine/hooks";

export default function MenuButton() {
  const [opened, { toggle }] = useDisclosure();
  const mantineTheme = useMantineTheme();
  const isMobile = useMediaQuery(
    `(max-width: ${mantineTheme.breakpoints.smMd})`,
  );

  return (
    <Box pos={"relative"}>
      <Burger
        aria-label="Toggle menu options"
        onClick={toggle}
        opened={opened}
      />

      <Collapse
        bottom={isMobile ? "150%" : undefined}
        in={opened}
        pos={"absolute"}
        right={"0%"}
        top={!isMobile ? "150%" : undefined}
      >
        <Stack>
          <Button c={"black"} color="customWhite" radius="lg" size="xs">
            Manage Account
          </Button>
          <Button c={"black"} color="customWhite" radius="lg" size="xs">
            Report App Issue
          </Button>
        </Stack>
      </Collapse>
    </Box>
  );
}
