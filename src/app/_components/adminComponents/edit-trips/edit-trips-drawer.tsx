"use client";

import {
  Button,
  Drawer,
  Group,
  Stack,
  Text,
  Textarea,
  TextInput,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useDisclosure } from "@mantine/hooks";
import {
  MapPinLineIcon,
  PathIcon,
  QuestionIcon,
  UserIcon,
} from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import {
  dbTimeToLocalTime,
  dbTimeToPrettyString,
  formatString,
} from "~/lib/helpers";
import {
  checkAddress,
  checkName,
  checkPickUpTime,
  checkTripReason,
} from "~/lib/input-checkers";
import { showNotifications } from "~/lib/mantine-notifications-system";
import type { RouterOutputs } from "~/server/api/root";
import { api } from "~/trpc/react";
import { BookingStatus } from "~/types/types";
import AddressDropdown from "../../bookingForm/booking-form-components/address-drop-down-field";
import PickupTimeInput from "../../bookingForm/booking-form-components/pick-up-time-field";
import AlertPopup from "../../common/alert/alert";

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
  const [pickupAddr, setPickupAddr] = useState("");
  const [destAddr, setDestAddr] = useState("");
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
    pickupTime: string | null | Date;
    pickupAddr: string;
    destAddr: string;
    name: string;
    reasonForTrip: string;
    paymentMethod: string;
    paymentCode: string | null;
    id: number;
    status: string;
    createdAt: Date;
    updatedAt: Date;
    requestedVerification: boolean;
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

    //Prefill mantine controlled fields with booking data
    setPickupAddr(drawerContents.pickupAddr);
    setDestAddr(drawerContents.destAddr);

    //--Prefill mantine form with booking data--
    bookingForm.setInitialValues({
      pickupTime:
        drawerContents.status === BookingStatus.PENDING
          ? dbTimeToLocalTime(drawerContents.pickupTime)
          : drawerContents.pickupTime,
      pickupAddr: drawerContents.pickupAddr,
      destAddr: drawerContents.destAddr,
      name: drawerContents.name,
      reasonForTrip: drawerContents.tripReason,
      paymentMethod: formatString(drawerContents.payment),
      paymentCode: null, //TODO: add feature for this
      id: drawerContents.id,
      status: formatString(drawerContents.status),
      createdAt: drawerContents.createdAt,
      updatedAt: drawerContents.updatedAt,
      requestedVerification: drawerContents.requestVerification,
    });
    bookingForm.setValues({
      pickupTime:
        drawerContents.status === BookingStatus.PENDING
          ? dbTimeToLocalTime(drawerContents.pickupTime)
          : drawerContents.pickupTime,
      pickupAddr: drawerContents.pickupAddr,
      destAddr: drawerContents.destAddr,
      name: drawerContents.name,
      reasonForTrip: drawerContents.tripReason,
      paymentMethod: formatString(drawerContents.payment),
      paymentCode: null, //TODO: add feature for this
      id: drawerContents.id,
      status: formatString(drawerContents.status),
      createdAt: drawerContents.createdAt,
      updatedAt: drawerContents.updatedAt,
      requestedVerification: drawerContents.requestVerification,
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
    if (formSubmitting) {
      //If form is already submitting
      return;
    }
    setFormSubmitting(true);

    updateBookingMutation.mutate({
      pickupAddr: values.pickupAddr,
      destAddr: values.destAddr,
      name: values.name,
      pickupTime: values.pickupTime as string | null,
      bookingId: values.id,
      tripReason: values.reasonForTrip,
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
        onConfirm={() => handleFormOnSubmit(bookingForm.values)}
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
          <Stack h={"calc(100dvh - 90px)"}>
            <TextInput
              defaultValue={bookingForm.values.status}
              label="Trip Status"
              readOnly
              variant="unstyled"
            />
            <TextInput
              defaultValue={bookingForm.values.id}
              label="Booking ID"
              readOnly
              variant="unstyled"
            />
            <TextInput
              aria-label="Name"
              label={"Name"}
              leftSection={<UserIcon size={20} />}
              placeholder="Your Name"
              {...bookingForm.getInputProps("name")}
              readOnly={bookingForm.values.status !== "Pending"}
              withAsterisk
            />
            <PickupTimeInput
              form={bookingForm}
              formField={"pickupTime"}
              useLabel
              withAsterisk
            />
            <AddressDropdown
              ariaLabel="Pick-up address field"
              changeValue={setPickupAddr}
              fieldName="pickupAddr"
              fieldValue={pickupAddr}
              form={bookingForm}
              icon={<MapPinLineIcon size={20} />}
              label="Pick-up Address"
              placeholder="Pick-up Address"
              withAsterisk
            />
            <AddressDropdown
              ariaLabel="Destination address field"
              changeValue={setDestAddr}
              fieldName="destAddr"
              fieldValue={destAddr}
              form={bookingForm}
              icon={<PathIcon size={20} />}
              label="Destination Address"
              placeholder="Destination Address"
              withAsterisk
            />
            <TextInput
              defaultValue={
                bookingForm.values.requestedVerification ? "Yes" : "No"
              }
              label="Resident Verification Requested?"
              readOnly
              variant="unstyled"
            />
            <Textarea
              aria-label="Reason for trip"
              key={bookingForm.key("reasonForTrip")}
              leftSection={<QuestionIcon size={20} />}
              {...bookingForm.getInputProps("reasonForTrip")}
              autosize
              label="Reason for Trip"
              maxRows={4}
              minRows={1}
              placeholder="Optional"
              readOnly={bookingForm.values.status !== "Pending"}
            />
            <TextInput
              aria-label="Payment method"
              defaultValue={
                bookingForm.values.paymentMethod === "Redeem Code"
                  ? `Code (${bookingForm.values.paymentCode ?? "unable to retrieve code"})`
                  : bookingForm.values.paymentMethod
              }
              label="Payment Method"
              readOnly
              variant="unstyled"
            />
            <TextInput
              defaultValue={dbTimeToPrettyString(bookingForm.values.createdAt)}
              label="Created On"
              readOnly
              variant="unstyled"
            />
            <TextInput
              defaultValue={dbTimeToPrettyString(bookingForm.values.updatedAt)}
              label="Last Updated"
              readOnly
              variant="unstyled"
            />
            <Stack bottom={"0%"} flex={1} justify="flex-end" pos={"sticky"}>
              <Group bg={"primaryColor"} grow py={"md"}>
                <Button
                  c={bookingForm.isDirty() ? "black" : undefined}
                  color="buttonColor"
                  disabled={!bookingForm.isDirty()}
                  form="booking-form"
                  onClick={() => openModal()}
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
