"use client";

import {
  Button,
  CloseButton,
  Divider,
  Group,
  Modal,
  Paper,
  Radio,
  ScrollArea,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useDisclosure, useMediaQuery } from "@mantine/hooks";
import { useRouter } from "next/navigation";
import { type JSX, useEffect, useState } from "react";
import { dbTimeToPrettyString, formatString } from "~/lib/helpers";
import { checkBookingTypeAndPaymentMethod } from "~/lib/input-checkers";
import { showNotifications } from "~/lib/mantine-notifications-system";
import type { RouterOutputs } from "~/server/api/root";
import { api } from "~/trpc/react";
import { PaymentMethods } from "~/types/types";
import AlertPopup from "../common/alert/alert";
import PaymentModal from "../common/payment/payment";
import TripLoading from "../common/trips/trip-loading";

type bookingsData = RouterOutputs["bookings"]["getOne"];

const GetPaymentDetailsModal = ({
  bookingDetails,
  modalOpened,
  closeModal,
}: {
  bookingDetails: bookingsData;
  modalOpened: boolean;
  closeModal: () => void;
}) => {
  const [
    paymentModalOpened,
    { open: openPaymentModal, close: closePaymentModal },
  ] = useDisclosure(false);
  const [isLoading, setIsLoading] = useState(false);
  const [discountCode, setDiscountCode] = useState<string | null>(null);
  const router = useRouter();
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const utils = api.useUtils();

  const acceptBookingMutation = api.bookings.accept.useMutation({
    onSuccess: async () => {
      showNotifications.success("Accepted successfully");
      setIsLoading(false);
      closeModal();
      await utils.bookings.getAdjustmentRequestedBooking.refetch();
      router.replace("/");
    },
    onError: (error) => {
      showNotifications.error(error.message);
      setIsLoading(false);
    },
  });

  const acceptBooking = (bookingId: number) => {
    if (isLoading) {
      return;
    }
    setIsLoading(true);

    acceptBookingMutation.mutate({
      bookingIds: [bookingId],
      newRideCode: discountCode ?? undefined,
      newPaymentMethod: form.getValues().paymentMethod,
      newStripePaymentId: form.getValues().stripePaymentMethodId,
    });
  };

  const form = useForm<{
    paymentMethod: PaymentMethods;
    stripePaymentMethodId: string;
  }>({
    mode: "uncontrolled",

    //Initial field values of form
    initialValues: {
      paymentMethod: PaymentMethods.CREDIT_CARD,
      stripePaymentMethodId: "",
    },

    //Frontend field checks
    validate: {
      paymentMethod: (value) => {
        const result = checkBookingTypeAndPaymentMethod(
          bookingDetails.bookingType,
          value,
        );

        if (result.isProper) {
          return null;
        } else {
          return result.errorMessage;
        }
      },
    },
  });

  if (paymentSuccess) {
    setPaymentSuccess(false);
    acceptBooking(bookingDetails.id);
  }

  return (
    <>
      <PaymentModal
        bookingType={bookingDetails.bookingType}
        closeModal={closePaymentModal}
        modalOpened={paymentModalOpened}
        modalSize="md"
        onPaymentSuccess={() => setPaymentSuccess(true)}
        paymentMethod={form.getValues().paymentMethod}
        setDiscountCode={setDiscountCode}
        setStripePaymentMethodId={(value: string) => {
          form.setFieldValue("stripePaymentMethodId", value);
        }}
      />
      <Modal
        centered
        onClose={closeModal}
        opened={modalOpened}
        radius={"lg"}
        size={"md"}
        withCloseButton={false}
      >
        <Stack gap={"lg"} p={"md"}>
          <Group justify="space-between">
            <Title order={4}>Payment</Title>
            <CloseButton onClick={closeModal} />
          </Group>
          <Radio.Group
            key={form.key("paymentMethod")}
            label="Select a new Payment Method"
            {...form.getInputProps("paymentMethod")}
          >
            <Group mt="xs">
              {Object.values(PaymentMethods).map((method) => (
                <Radio
                  color="backgroundColor"
                  iconColor="black"
                  key={method}
                  label={formatString(method)}
                  value={method}
                />
              ))}
            </Group>
          </Radio.Group>
          <Button
            c={"black"}
            color="buttonColor"
            disabled={isLoading}
            onClick={() => {
              const { hasErrors } = form.validate();
              if (!hasErrors) {
                closeModal();
                openPaymentModal();
              }
            }}
            p={0}
            size="compact-sm"
            type="button"
            variant="filled"
          >
            Confirm
          </Button>
        </Stack>
      </Modal>
    </>
  );
};

const ComponentContents = ({
  bookingDetails,
}: {
  bookingDetails: bookingsData | undefined;
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [alertBodyComponent, setAlertBodyComponent] = useState<JSX.Element>(
    <div />,
  );
  const [alertModalOpened, { open: openAlertModal, close: closeAlertModal }] =
    useDisclosure(false);
  const [onAlertSubmit, setOnAlertSubmit] = useState<() => void>(() => {});
  const [alertTitleText, setAlertTitleText] = useState<string>("");
  const router = useRouter();
  const [
    getPaymentDetailsModalOpened,
    { open: openGetPaymentDetailsModal, close: closeGetPaymentDetailsModal },
  ] = useDisclosure(false);
  const utils = api.useUtils();
  //TODO: finish populating with booking fields

  const cancelBookingMutation = api.bookings.cancel.useMutation({
    onSuccess: async () => {
      showNotifications.success("Cancelled successfully");
      setIsLoading(false);
      closeAlertModal();
      await utils.bookings.getAdjustmentRequestedBooking.refetch();
      router.replace("/");
    },
    onError: (error) => {
      showNotifications.error(error.message);
      setIsLoading(false);
    },
  });

  const cancelBooking = (bookingId: number) => {
    if (isLoading) {
      return;
    }
    setIsLoading(true);

    cancelBookingMutation.mutate({
      bookingIds: [bookingId],
    });
  };

  return (
    <>
      <AlertPopup
        abortButtonText={"Back"}
        body={alertBodyComponent}
        closeModal={closeAlertModal}
        confirmButtonText={"Confirm"}
        isLoading={isLoading}
        modalOpened={alertModalOpened}
        onConfirm={onAlertSubmit}
        titleText={alertTitleText}
      />
      {bookingDetails && (
        <GetPaymentDetailsModal
          bookingDetails={bookingDetails}
          closeModal={closeGetPaymentDetailsModal}
          modalOpened={getPaymentDetailsModalOpened}
        />
      )}
      <Stack gap={"lg"} h={"100%"}>
        <header>
          <Title order={4}>Confirm Booking</Title>
        </header>
        {!bookingDetails && <TripLoading />}
        {bookingDetails && (
          <>
            <Stack flex={1} gap={"xs"} mih={0}>
              <Text size="sm">
                A driver has reviewed the following booking details and has
                suggested changes. Please review and accept or decline the
                changes
              </Text>
              <Divider label="New Changes" labelPosition="center" my="xs" />
              <Group>
                <Text flex={1}>New Booking Type:</Text>
                <TextInput
                  flex={1}
                  readOnly
                  value={formatString(bookingDetails.bookingType)}
                />
              </Group>
              <Divider label="Booking Details" labelPosition="center" my="xs" />
              <ScrollArea>
                <Stack>
                  <Group>
                    <Text flex={1}>Booking ID:</Text>
                    <TextInput flex={1} readOnly value={bookingDetails.id} />
                  </Group>
                  <Group>
                    <Text flex={1}>Pick-up Time:</Text>
                    <TextInput
                      flex={1}
                      readOnly
                      value={dbTimeToPrettyString(bookingDetails.pickupTime)}
                    />
                  </Group>
                  <Group>
                    <Text flex={1}>Pick-up Location:</Text>
                    <TextInput
                      flex={1}
                      readOnly
                      value={bookingDetails.pickupAddr}
                    />
                  </Group>
                </Stack>
              </ScrollArea>
            </Stack>
            <footer>
              <Group grow>
                <Button
                  c={"black"}
                  color="buttonColor"
                  onClick={() => {
                    setAlertTitleText("Cancelling Trip");
                    setAlertBodyComponent(
                      <Text>
                        You will not be charged if you cancel this trip. Are you
                        sure?
                      </Text>,
                    );
                    setOnAlertSubmit(
                      () => () => cancelBooking(bookingDetails.id),
                    );
                    openAlertModal();
                  }}
                  p={0}
                  size="compact-sm"
                  type="button"
                  variant="outline"
                >
                  Decline and Cancel Trip
                </Button>
                <Button
                  c={"black"}
                  color="buttonColor"
                  onClick={() => {
                    setAlertTitleText("Finalizing Trip");
                    setAlertBodyComponent(<Text>Are you sure?</Text>);
                    setOnAlertSubmit(() => () => {
                      openGetPaymentDetailsModal();
                      closeAlertModal();
                    });
                    openAlertModal();
                  }}
                  p={0}
                  size="compact-sm"
                  type="button"
                  variant="filled"
                >
                  Accept and Finalize Trip
                </Button>
              </Group>
            </footer>
          </>
        )}
      </Stack>
    </>
  );
};

export default function ShowRevisedBookingModal({
  bookingIdString,
}: {
  bookingIdString: string;
}) {
  const router = useRouter();
  const [bookingDetails, setBookingDetails] = useState<
    bookingsData | undefined
  >(undefined);
  const deviceIsShort = useMediaQuery("(max-height: 550px)");
  const deviceIsTall = useMediaQuery("(max-height: 1000px)"); //TODO: change the value to a height just large enough to cover the entire form without scrolling

  const bookingId = Number(bookingIdString);
  const notANumber = Number.isNaN(bookingId);

  const getBookingQuery = api.bookings.getConfirmationBooking.useQuery(
    { bookingId: bookingId },
    {
      enabled: false,
    },
  );

  useEffect(() => {
    if (notANumber) {
      router.replace("/");
    } else {
      getBookingQuery.refetch();
    }
  }, [getBookingQuery.refetch, router.replace, notANumber]);

  useEffect(() => {
    if (!getBookingQuery.isFetching && getBookingQuery.error) {
      showNotifications.error(
        `Unable to fetch booking data: ${getBookingQuery.error.message ?? "an unknown error has occurred. Please Try again"}`,
      );
      router.replace("/");
    }
  }, [getBookingQuery.error, getBookingQuery.isFetching, router.replace]);

  useEffect(() => {
    if (!getBookingQuery.isFetching && getBookingQuery.data) {
      setBookingDetails(getBookingQuery.data);
    }
  }, [getBookingQuery.isFetching, getBookingQuery.data]);

  return (
    <Paper
      bg={"primaryColor"}
      h={deviceIsTall ? "90dvh" : undefined}
      maw={"90dvw"}
      p={"xl"}
      radius="lg"
      shadow="xl"
      w={"500px"}
    >
      {deviceIsShort && (
        <ScrollArea.Autosize mah={"100%"}>
          <ComponentContents bookingDetails={bookingDetails} />
        </ScrollArea.Autosize>
      )}
      {!deviceIsShort && <ComponentContents bookingDetails={bookingDetails} />}
    </Paper>
  );
}
