"use client";

import {
  Button,
  CloseButton,
  Group,
  Loader,
  Modal,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { useState } from "react";
import { getNotificationSubscription } from "~/lib/get-subscription";
import { showNotifications } from "~/lib/mantine-notifications-system";
import { api } from "~/trpc/react";

export default function NotificationSubscription({
  modalOpened,
  closeModal,
}: {
  modalOpened: boolean;
  closeModal: () => void;
}) {
  const [isLoading, setIsLoading] = useState(false);

  const subscribeMutation =
    api.notifications.subscribeToNotifications.useMutation({
      onSuccess: () => {
        showNotifications.success("Notifications enabled successfully");
        setIsLoading(false);
        closeModal();
      },
      onError: (error) => {
        showNotifications.error(error.message);
        setIsLoading(false);
      },
    });

  const handleEnableNotifications = async () => {
    if (isLoading) {
      return;
    }

    try {
      const subscription = await getNotificationSubscription();

      setIsLoading(true);

      subscribeMutation.mutate({
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.toJSON().keys?.p256dh ?? "",
          auth: subscription.toJSON().keys?.auth ?? "",
        },
      });
    } catch (error) {
      showNotifications.error(`${error}`);
    }
  };

  return (
    <Modal
      centered
      onClose={closeModal}
      opened={modalOpened}
      radius={"lg"}
      size={"md"}
      withCloseButton={false}
    >
      <Stack gap={"lg"} p={"md"}>
        <header>
          <Group justify="space-between">
            <Title order={4}>Enable Notifications</Title>
            <CloseButton onClick={closeModal} />
          </Group>
        </header>
        <main>
          <Stack gap={"xs"}>
            <Text>Are you sure?</Text>
          </Stack>
        </main>
        <footer>
          <Group grow>
            <Button
              c={"black"}
              color="buttonColor"
              onClick={closeModal}
              p={0}
              size="compact-sm"
              type="button"
              variant="outline"
            >
              Not Now
            </Button>
            <Button
              c={"black"}
              color="buttonColor"
              onClick={handleEnableNotifications}
              p={0}
              size="compact-sm"
              type="button"
              variant="filled"
            >
              {!isLoading && "Enable"}
              {isLoading && <Loader color="black" size={20} />}
            </Button>
          </Group>
        </footer>
      </Stack>
    </Modal>
  );
}
