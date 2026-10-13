"use client";

import {
  Button,
  CloseButton,
  Flex,
  Group,
  Modal,
  Select,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useDisclosure } from "@mantine/hooks";
import { RoadHorizonIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { checkBookingType } from "~/lib/input-checkers";
import { showNotifications } from "~/lib/mantine-notifications-system";
import { api } from "~/trpc/react";
import { BookingTypes, type BookingValueTypes } from "~/types/types";
import AlertPopup from "../common/alert/alert";

export default function RequestAdjustmentModal({
  bookingId,
  modalOpened,
  closeModal,
  currentBookingType,
}: {
  bookingId: number;
  modalOpened: boolean;
  closeModal: () => void;
  currentBookingType: BookingValueTypes;
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [alertModalOpened, { open: openAlertModal, close: closeAlertModal }] =
    useDisclosure();

  const requestAdjustmentMutation =
    api.bookings.requestBookingDetailAdjustment.useMutation({
      onSuccess: () => {
        showNotifications.success("Request successful");
        setIsLoading(false);
        closeModal();
        closeAlertModal();
      },
      onError: (error) => {
        showNotifications.error(error.message);
        setIsLoading(false);
      },
    });

  const form = useForm<{
    newBookingType: BookingValueTypes;
  }>({
    mode: "uncontrolled",

    //Frontend field checks
    validate: {
      newBookingType: (value) => {
        const result = checkBookingType(value);

        if (result.isProper) {
          return null;
        } else {
          return result.errorMessage;
        }
      },
    },
  });

  const handleSubmit = async (values: typeof form.values) => {
    if (isLoading) {
      return;
    }
    setIsLoading(true);

    requestAdjustmentMutation.mutate({
      bookingType: values.newBookingType,
      bookingId: bookingId,
    });
  };

  return (
    <>
      <AlertPopup
        abortButtonText={"Cancel"}
        body={<Text>Are you sure?</Text>}
        closeModal={closeAlertModal}
        confirmButtonText={"Send to User"}
        hideCloseButton
        isLoading={isLoading}
        modalOpened={alertModalOpened}
        onConfirm={() => form.onSubmit(handleSubmit)()}
        titleText={"Request Adjustment"}
      />
      <Modal
        centered
        onClose={closeModal}
        opened={modalOpened}
        radius={"lg"}
        size={"lg"}
        withCloseButton={false}
      >
        <Stack gap={"lg"} p={"md"}>
          <header>
            <Group justify="space-between">
              <Title order={4}>Request Trip Detail Adjustment</Title>
              <CloseButton onClick={closeModal} />
            </Group>
          </header>
          <main>
            <Stack gap={"xs"}>
              <Text>
                Request the user change their booking details. The user can
                accept the changes or cancel the booking
              </Text>
              <Flex
                align="flex-start"
                direction="row"
                gap={"md"}
                justify="flex-start"
              >
                <Text flex={1}>Booking Type</Text>
                <Select
                  aria-label="Booking type selector"
                  data={BookingTypes.filter(
                    (json) => json.value !== currentBookingType,
                  )}
                  key={form.key("newBookingType")}
                  leftSection={<RoadHorizonIcon size={20} />}
                  placeholder="New booking type"
                  {...form.getInputProps("newBookingType")}
                  flex={1}
                  readOnly={isLoading}
                />
              </Flex>
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
                Back
              </Button>
              <Button
                c={"black"}
                color="buttonColor"
                onClick={openAlertModal}
                p={0}
                size="compact-sm"
                type="button"
                variant="filled"
              >
                Submit
              </Button>
            </Group>
          </footer>
        </Stack>
      </Modal>
    </>
  );
}
