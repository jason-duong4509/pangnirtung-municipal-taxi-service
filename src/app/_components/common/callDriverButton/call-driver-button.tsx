"use client";
import { Button, Text } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { PhoneIcon } from "@phosphor-icons/react";
import { showNotifications } from "~/lib/mantine-notifications-system";
import { authClient } from "~/server/better-auth/client";
import { api } from "~/trpc/react";
import AlertPopup from "../alert/alert";

export default function CallDriverButton({
  isMobile,
  openLoginModal,
}: {
  isMobile: boolean;
  openLoginModal: () => void;
}) {
  const { data: session } = authClient.useSession();
  const [alertModalOpened, { open: openAlertModal, close: closeAlertModal }] =
    useDisclosure(false);

  const getDriverPhoneQuery = api.users.getDriverPhone.useQuery(undefined, {
    enabled: session !== null,
  });

  return (
    <>
      <AlertPopup
        abortButtonText={"Cancel"}
        body={
          <Text>
            Confirming will navigate outside to your phone app. Are you sure?
          </Text>
        }
        closeModal={closeAlertModal}
        confirmButtonText={"Confirm"}
        isLoading={false}
        modalOpened={alertModalOpened}
        onConfirm={() => {
          if (getDriverPhoneQuery.data && getDriverPhoneQuery.data[0]) {
            window.location.href = `tel:${getDriverPhoneQuery.data[0].phoneNumber}`;
            closeAlertModal();
          } else {
            showNotifications.error(
              "Could not retrieve a driver's phone number. Please try again",
            );
          }
        }}
        titleText={"Call the Driver"}
      />
      <Button
        aria-label="Call driver button"
        c={"black"}
        color={isMobile ? "buttonColor" : "customWhite"}
        onClick={() => {
          if (!session) {
            openLoginModal();
          } else {
            openAlertModal();
          }
        }}
        radius={"lg"}
        rightSection={!isMobile ? <PhoneIcon size={20} /> : undefined}
        size="xs"
        type="button"
      >
        {!isMobile && "Call the Driver"}
        {isMobile && <PhoneIcon size={20} />}
      </Button>
    </>
  );
}
