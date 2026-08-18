"use client";
import {
  Button,
  Flex,
  Group,
  Paper,
  Title,
  useMantineTheme,
} from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { useRouter } from "next/navigation";

export default function BookingHistoryPage() {
  const router = useRouter();
  const mantineTheme = useMantineTheme();
  const isMobile = useMediaQuery(
    `(max-width: ${mantineTheme.breakpoints.smMd})`,
  );

  return (
    <Flex
      bg={"backgroundColor"}
      direction={{ base: "column", smMd: "row" }}
      h={"100vh"}
    >
      <Paper></Paper>
    </Flex>
  );
}
