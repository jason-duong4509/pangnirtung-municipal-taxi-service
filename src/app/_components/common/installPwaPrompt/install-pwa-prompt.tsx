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
import { useEffect, useState } from "react";
import { showNotifications } from "~/lib/mantine-notifications-system";

export default function InstallPwaPrompt({
  modalOpened,
  closeModal,
}: {
  modalOpened: boolean;
  closeModal: () => void;
}) {
  const [installPrompt, setInstallPrompt] = useState<Event | null>(null);
  const isIOS =
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

  useEffect(() => {
    const handler = (event: Event) => {
      event.preventDefault();

      setInstallPrompt(event);
    };

    window.addEventListener("beforeinstallprompt", handler);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

  const handleInstall = async () => {
    const currentlyUsingPWA =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone ===
        true;
    if (currentlyUsingPWA) {
      showNotifications.error("App already installed");
      return;
    } else if (!installPrompt) {
      showNotifications.error(
        "Browser unable to create app. Try again or switch to a supported browser",
      );
      return;
    }

    const event = installPrompt as Event & {
      prompt: () => Promise<void>;
      userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
    };

    await event.prompt();
    await event.userChoice;

    setInstallPrompt(null);
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
