"use client";

import {
  Button,
  CloseButton,
  Group,
  Modal,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useState } from "react";
import { dbTimeToPrettyString } from "~/lib/helpers";
import { showNotifications } from "~/lib/mantine-notifications-system";
import { api, type RouterOutputs } from "~/trpc/react";
import AlertPopup from "../../common/alert/alert";

type rideCodesData = RouterOutputs["rideCodes"]["getAll"]["data"][0];

export default function RideCodesModal({
  modalOpened,
  closeModal,
  contents,
}: {
  modalOpened: boolean;
  closeModal: () => void;
  contents: rideCodesData | undefined;
}) {
  const [isMutating, setIsMutating] = useState(false);
  const [alertOpened, { open: openAlert, close: closeAlert }] =
    useDisclosure(false);
  const utils = api.useUtils();

  const updateRideCodeMutation = api.rideCodes.update.useMutation({
    onSuccess: () => {
      showNotifications.success("Code updated");
      setIsMutating(false);
      void utils.rideCodes.getAll.invalidate();
      closeModal();
      closeAlert();
    },
    onError: (error) => {
      showNotifications.error(error.message);
      setIsMutating(false);
    },
  });

  const handleOnSubmit = async (deactivate: boolean) => {
    if (isMutating || !contents) {
      //If form is already submitting
      return;
    }
    setIsMutating(true);

    updateRideCodeMutation.mutate({
      codes: [contents.code],
      deactivate: deactivate,
    });
  };

  if (!contents) {
    return;
  }

  return (
    <>
      <AlertPopup
        abortButtonText={"Back"}
        body={
          <Text>
            {contents.active ? "Deactivating" : "Activating"} code. Are you
            sure?
          </Text>
        }
        closeModal={closeAlert}
        confirmButtonText={"Confirm"}
        isLoading={isMutating}
        modalOpened={alertOpened}
        onConfirm={() => handleOnSubmit(contents.active)}
        titleText={"Confirm Action"}
      />
      <Modal
        centered
        onClose={closeModal}
        opened={modalOpened}
        radius={"lg"}
        size={"sm"}
        withCloseButton={false}
        zIndex={299}
      >
        <Stack gap={"lg"} p={"md"}>
          <Group justify="space-between">
            <Title order={4}>View Ride Code</Title>
            <CloseButton onClick={closeModal} />
          </Group>
          <Stack>
            <TextInput
              label="Code"
              readOnly
              value={contents.code}
              variant="unstyled"
            />
            <TextInput
              label="Discount"
              readOnly
              value={`${contents.discount}% off`}
              variant="unstyled"
            />
            <TextInput
              label="Status"
              readOnly
              value={contents.active ? "Active" : "Expired"}
              variant="unstyled"
            />
            <TextInput
              label="Created On"
              readOnly
              value={
                contents
                  ? dbTimeToPrettyString(contents.createdAt)
                  : "Unable to fetch data"
              }
              variant="unstyled"
            />
            <TextInput
              label="Last Updated"
              readOnly
              value={
                contents
                  ? dbTimeToPrettyString(contents.updatedAt)
                  : "Unable to fetch data"
              }
              variant="unstyled"
            />
          </Stack>
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
              Close
            </Button>
            <Button
              c={"black"}
              color="buttonColor"
              onClick={() => openAlert()}
              p={0}
              size="compact-sm"
              type="button"
              variant="filled"
            >
              {contents.active ? "Deactivate" : "Activate"} Code
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}
