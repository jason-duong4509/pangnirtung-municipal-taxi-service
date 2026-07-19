"use client";
import { Loader, Stack, Title } from "@mantine/core";

export default function LoadingScreen() {
  return (
    <Stack align="center" h={"100vh"} justify="center">
      <Title order={2}>Loading...</Title>
      <Loader color="black" />
    </Stack>
  );
}
