"use client";
import { Button, Group, Input, Popover, Stack, Text } from "@mantine/core";
import { CarProfileIcon } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { showNotifications } from "~/lib/mantine-notifications-system";
import { authClient } from "~/server/better-auth/client";
import { api } from "~/trpc/react";

export default function RideCreditCountPopover({
  isMobile,
}: {
  isMobile: boolean;
}) {
  const { data: session } = authClient.useSession();
  const router = useRouter();
  const getUserDataQuery = api.users.getSelf.useQuery(undefined, {
    enabled: session !== null,
  });
  const rideCredits = getUserDataQuery.data
    ? getUserDataQuery.data[0]?.profile.numberOfRides
    : undefined;
  const isResident = getUserDataQuery.data
    ? getUserDataQuery.data[0]?.profile.isResident
    : undefined;

  useEffect(() => {
    if (!getUserDataQuery.isLoading && getUserDataQuery.error) {
      showNotifications.error(
        getUserDataQuery.error.message ??
          "An error occurred while fetching user data",
      );
    }
  }, [getUserDataQuery.error, getUserDataQuery.isLoading]);

  return (
    <Popover position="bottom" shadow="md" width={300} withArrow>
      <Popover.Target>
        <Button
          aria-label="View Ride Credits Button"
          c={"black"}
          color={isMobile ? "buttonColor" : "customWhite"}
          disabled={session === null}
          radius={"lg"}
          rightSection={<CarProfileIcon size={20} />}
          size="xs"
          type="button"
        >
          {rideCredits && session
            ? rideCredits > 999
              ? "999+"
              : rideCredits
            : "..."}
        </Button>
      </Popover.Target>
      <Popover.Dropdown>
        <Stack>
          <Group justify="space-between">
            <Input.Label>Ride Credits:</Input.Label>
            <Text>{rideCredits && session ? rideCredits : "..."}</Text>
          </Group>
          <Button
            c={isResident ? "black" : undefined}
            color="buttonColor"
            disabled={!isResident}
            onClick={() => router.push("/buy-rides")}
            type="button"
          >
            Buy More{!isResident ? " (Residents only)" : ""}
          </Button>
        </Stack>
      </Popover.Dropdown>
    </Popover>
  );
}
