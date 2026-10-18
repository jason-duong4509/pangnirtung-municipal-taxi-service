"use client";

import {
  Button,
  CloseButton,
  Group,
  Modal,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { showNotifications } from "~/lib/mantine-notifications-system";
import { usePWA } from "../../providers/pwa-provider/pwa-provider";

export default function InstallPwaPrompt({
  modalOpened,
  closeModal,
}: {
  modalOpened: boolean;
  closeModal: () => void;
}) {
  const { isIOS, installApp } = usePWA();

  const handleInstall = async () => {
    const result = await installApp();

    const currentlyUsingPWA =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone ===
        true;
    if (currentlyUsingPWA) {
      showNotifications.error("App already installed");
      return;
    } else if (result === "unavailable") {
      showNotifications.error(
        "Browser unable to create app. Try again or switch to a supported browser",
      );
      return;
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
            <Title order={4}>Install the App</Title>
            <CloseButton onClick={closeModal} />
          </Group>
        </header>
        <main>
          <Stack gap={"xs"}>
            {!isIOS && (
              <Text>Install this app for a faster, app-like experience.</Text>
            )}
            {isIOS && (
              <Text>
                Install this app by navigating to "Share", then pressing "Add to
                Home Screen"
              </Text>
            )}
          </Stack>
        </main>
        {!isIOS && (
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
                onClick={handleInstall}
                p={0}
                size="compact-sm"
                type="button"
                variant="filled"
              >
                Install
              </Button>
            </Group>
          </footer>
        )}
      </Stack>
    </Modal>
  );
}
