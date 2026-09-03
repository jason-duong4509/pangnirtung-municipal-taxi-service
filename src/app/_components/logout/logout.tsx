"use client";
import {
  Button,
  Group,
  Loader,
  Modal,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { showNotifications } from "~/lib/mantine-notifications-system";
import { authClient } from "~/server/better-auth/client";

export default function LogOutModal({
  opened,
  onClose,
}: {
  opened: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [isMutating, setIsMutating] = useState(false);

  const logOut = async () => {
    setIsMutating(true);
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          showNotifications.success("Log out successful");
          onClose();
          setIsMutating(false);
          router.push("/");
        },
        onError: (ctx) => {
          showNotifications.error(ctx.error.message);
          setIsMutating(false);
        },
      },
    });
  };

  return (
    <Modal
      centered
      onClose={onClose}
      opened={opened}
      radius={"lg"}
      size={"sm"}
      withCloseButton={false}
    >
      <Stack gap={"lg"} p={"md"}>
        <Title order={4}>Log Out</Title>
        <Text>Are you sure?</Text>
        <Group grow>
          <Button
            c={"black"}
            color="buttonColor"
            onClick={() => onClose()}
            p={0}
            size="compact-sm"
            type="button"
            variant="outline"
          >
            Cancel
          </Button>
          <Button
            c={"black"}
            color="buttonColor"
            onClick={() => logOut()}
            p={0}
            size="compact-sm"
            type="button"
            variant="filled"
          >
            {isMutating && <Loader color="black" size={20} />}
            {!isMutating && "Log out"}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
