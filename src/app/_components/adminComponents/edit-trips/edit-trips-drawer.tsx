"use client";

import { Button, Drawer, Group, Stack, Text } from "@mantine/core";
import { useForm } from "@mantine/form";
import { useDisclosure } from "@mantine/hooks";
import { useEffect, useState } from "react";
import { dbTimeToLocalTime } from "~/lib/helpers";
import {
  checkAddress,
  checkName,
  checkPhoneNumber,
  checkPickUpTime,
  checkTripReason,
} from "~/lib/input-checkers";
import { showNotifications } from "~/lib/mantine-notifications-system";
import type { RouterOutputs } from "~/server/api/root";
import { api } from "~/trpc/react";
import AlertPopup from "../../common/alert/alert";
import BookingContents from "../../common/bookingContents/booking-contents";

type bookingsData = RouterOutputs["bookings"]["get"][0];

export default function EditTripsDrawer({
  closeDrawer,
  drawerOpened,
  drawerContents,
}: {
  closeDrawer: () => void;
  drawerOpened: boolean;
  drawerContents: bookingsData | undefined;
}) {
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [modalOpened, { open: openModal, close: closeModal }] =
    useDisclosure(false);

  const getBookingsQuery = api.bookings.get.useQuery(undefined, {
    //Forces manual fetching
    enabled: false,
  });

  const updateBookingMutation = api.bookings.update.useMutation({
    onSuccess: () => {
      showNotifications.success("Booking updated");
      setFormSubmitting(false);
      getBookingsQuery.refetch();
      closeDrawer();
      closeModal();
    },
    onError: (error) => {
      showNotifications.error(error.message);
      setFormSubmitting(false);
    },
  });

  const bookingForm = useForm<{
    pickupTime: string | null;
    pickupAddr: string;
    destAddr: string;
    name: string;
    reasonForTrip: string;
    phoneNumber: string;
  }>({
    mode: "uncontrolled",

    //Frontend field checks
    validate: {
      pickupTime: (value) => {
        const result = checkPickUpTime(value as string | null);

        if (result.isProper) {
          return null;
        } else {
          return result.errorMessage;
        }
      },
      pickupAddr: (value) => {
        const result = checkAddress(value);

        if (result.isProper) {
          return null;
        } else {
          return result.errorMessage;
        }
      },
      phoneNumber: (value) => {
        const result = checkPhoneNumber(value);

        if (result.isProper) {
          return null;
        } else {
          return result.errorMessage;
        }
      },
      destAddr: (value) => {
        const result = checkAddress(value);

        if (result.isProper) {
          return null;
        } else {
          return result.errorMessage;
        }
      },
      name: (value) => {
        const result = checkName(value);

        if (result.isProper) {
          return null;
        } else {
          return result.errorMessage;
        }
      },
      reasonForTrip: (value) => {
        const result = checkTripReason(value);

        if (result.isProper) {
          return null;
        } else {
          return result.errorMessage;
        }
      },
    },
  });

  useEffect(() => {
    if (!drawerContents) {
      return;
    }

    //--Prefill mantine form with booking data--
    bookingForm.setInitialValues({
      pickupTime: dbTimeToLocalTime(drawerContents.pickupTime),
      pickupAddr: drawerContents.pickupAddr,
      destAddr: drawerContents.destAddr,
      name: drawerContents.name,
      reasonForTrip: drawerContents.tripReason,
      phoneNumber: drawerContents.contactPhone,
    });
    bookingForm.setValues({
      pickupTime: dbTimeToLocalTime(drawerContents.pickupTime),
      pickupAddr: drawerContents.pickupAddr,
      destAddr: drawerContents.destAddr,
      name: drawerContents.name,
      reasonForTrip: drawerContents.tripReason,
      phoneNumber: drawerContents.contactPhone,
    });
    //------------------------------------------

    bookingForm.resetDirty();
  }, [
    drawerContents,
    bookingForm.setValues,
    bookingForm.setInitialValues,
    bookingForm.resetDirty,
  ]);

  const handleFormOnSubmit = async (values: typeof bookingForm.values) => {
    if (formSubmitting || !drawerContents) {
      //If form is already submitting
      return;
    }
    setFormSubmitting(true);

    updateBookingMutation.mutate({
      pickupAddr: values.pickupAddr,
      destAddr: values.destAddr,
      name: values.name,
      pickupTime: values.pickupTime as string | null,
      bookingId: drawerContents.id,
      tripReason: values.reasonForTrip,
      contactPhone: values.phoneNumber,
    });
  };

  return (
    <>
      <AlertPopup
        abortButtonText={"Back"}
        body={<Text>Trip information will be changed. Are you sure?</Text>}
        closeModal={closeModal}
        confirmButtonText={"Confirm"}
        isLoading={formSubmitting}
        modalOpened={modalOpened}
        onConfirm={() => bookingForm.onSubmit(handleFormOnSubmit)()}
        titleText={"Confirm Action"}
      />
      <Drawer
        offset={8}
        onClose={closeDrawer}
        opened={drawerOpened}
        radius="md"
        styles={{ body: { paddingBottom: 0 } }}
        title={"Edit Trip"}
      >
        <form
          id="booking-form"
          onSubmit={bookingForm.onSubmit(handleFormOnSubmit)}
        >
          <Stack h={"calc(100dvh - 75px)"}>
            {drawerContents && (
              <BookingContents
                bookingData={drawerContents}
                form={bookingForm}
                readOnly={false}
              />
            )}
            <Stack bottom={"0%"} flex={1} justify="flex-end" pos={"sticky"}>
              <Group bg={"primaryColor"} grow py={"md"}>
                <Button
                  c={bookingForm.isDirty() ? "black" : undefined}
                  color="buttonColor"
                  disabled={!bookingForm.isDirty()}
                  form="booking-form"
                  onClick={() => {
                    bookingForm.validate();
                    if (bookingForm.isValid()) {
                      openModal();
                    }
                  }}
                  p={0}
                  size="compact-sm"
                  type="button"
                  variant="filled"
                >
                  Update Trip
                </Button>
              </Group>
            </Stack>
          </Stack>
        </form>
      </Drawer>
    </>
  );
}
