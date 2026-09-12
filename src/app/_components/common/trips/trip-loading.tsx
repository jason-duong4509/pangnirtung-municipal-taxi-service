"use client";

import { Skeleton, Stack } from "@mantine/core";

export default function TripLoading() {
  return (
    <Stack pt={"md"}>
      <Skeleton height={30} radius="xl" width={"100%"} />
      <Skeleton height={30} radius="xl" width={"100%"} />
      <Skeleton height={30} radius="xl" width={"100%"} />
      <Skeleton height={30} radius="xl" width={"100%"} />
    </Stack>
  );
}
