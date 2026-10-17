"use client";

import {
  ActionIcon,
  Button,
  CloseButton,
  Divider,
  Group,
  Input,
  Loader,
  Modal,
  ScrollArea,
  Stack,
  Text,
  Textarea,
  TextInput,
  Title,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import { PhoneIcon } from "@phosphor-icons/react";
import * as Ably from "ably";
import {
  type Dispatch,
  type JSX,
  type RefObject,
  type SetStateAction,
  useEffect,
  useRef,
  useState,
} from "react";
import { dbTimeToPrettyString } from "~/lib/helpers";
import { showNotifications } from "~/lib/mantine-notifications-system";
import type { RouterOutputs } from "~/server/api/root";
import { api } from "~/trpc/react";
import AlertPopup from "../common/alert/alert";
import BookingContentsDriver from "./booking-contents";
import RequestAdjustmentModal from "./request-adjustment-modal";

type bookingData = RouterOutputs["bookings"]["getOne"];
type notificationEvent = { bookingId: number };

const BookingDetails = ({
  modalOpened,
  closeModal,
  openModal,
  bookingData,
  isLoading,
  setIsLoading,
  isLoadingRef,
}: {
  modalOpened: boolean;
  closeModal: () => void;
  openModal: () => void;
  bookingData: bookingData | undefined;
  isLoading: boolean;
  setIsLoading: Dispatch<SetStateAction<boolean>>;
  isLoadingRef: RefObject<boolean>;
}) => {
  const [
    requestAdjustmentModalOpened,
    { open: openRequestAdjustmentModal, close: closeRequestAdjustmentModal },
  ] = useDisclosure(false);

  const getBookingsQuery = api.bookings.get.useQuery(undefined, {
    enabled: false,
  });

  const acceptBookingMutation = api.bookings.accept.useMutation({
    onSuccess: () => {
      notifications.clean();
      showNotifications.success("Accepted successfully");
      setIsLoading(false);
      isLoadingRef.current = false;
      getBookingsQuery.refetch();
      closeModal();
    },
    onError: (error) => {
      showNotifications.error(error.message);
      setIsLoading(false);
      isLoadingRef.current = false;
    },
  });

  if (!bookingData) {
    return;
  }

  return (
    <>
      <RequestAdjustmentModal
        bookingId={bookingData.id}
        closeModal={() => {
          closeRequestAdjustmentModal();
          openModal();
        }}
        currentBookingType={bookingData.bookingType}
        modalOpened={requestAdjustmentModalOpened}
      />
      <Modal
        centered
        onClose={closeModal}
        opened={modalOpened}
        radius={"lg"}
        size={"sm"}
        withCloseButton={false}
        zIndex={400}
      >
        <Stack gap={"lg"} p={"md"}>
          <Group justify="space-between">
            <Title order={4}>Booking Details</Title>
            <CloseButton onClick={closeModal} />
          </Group>
          <ScrollArea.Autosize mah={"50dvh"}>
            <BookingContentsDriver bookingData={bookingData} />
          </ScrollArea.Autosize>
          <Group grow>
            <Button
              c={"black"}
              color="buttonColor"
              onClick={() => {
                openRequestAdjustmentModal();
                notifications.clean();
                closeModal();
              }}
              p={0}
              size="compact-sm"
              type="button"
              variant="outline"
            >
              Request Adjustment
            </Button>
            <Button
              c={"black"}
              color="buttonColor"
              onClick={() => {
                if (!isLoading) {
                  setIsLoading(true);
                  isLoadingRef.current = true;
                  acceptBookingMutation.mutate({
                    bookingIds: [bookingData.id],
                  });
                }
              }}
              p={0}
              size="compact-sm"
              type="button"
              variant="filled"
            >
              {!isLoading && "Accept Trip"}
              {isLoading && <Loader color="black" size={20} />}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
};

export default function DriverNotificationBar() {
  const [events, setEvents] = useState<notificationEvent[]>([]);
  const [bookingData, setBookingData] = useState<bookingData>();
  const [
    bookingDetailsModalOpened,
    { open: openBookingDetailsModal, close: closeBookingDetailsModal },
  ] = useDisclosure(false);
  const [alertModalOpened, { open: openAlertModal, close: closeAlertModal }] =
    useDisclosure(false);
  const [isLoading, setIsLoading] = useState(false);
  const isLoadingRef = useRef(false);
  const [notificationBody, setNotificationBody] = useState<
    JSX.Element | undefined
  >();
  const [alertOnClose, setAlertOnClose] = useState<() => void>(() =>
    closeAlertModal(),
  );

  const getBookingQuery = api.bookings.getOne.useQuery(
    { bookingId: events[0]?.bookingId ?? 0 },
    { enabled: false },
  );
  const getBookingsQuery = api.bookings.get.useQuery(undefined, {
    enabled: false,
  });

  const acceptBookingMutation = api.bookings.accept.useMutation({
    onSuccess: () => {
      showNotifications.success("Accepted successfully");
      setIsLoading(false);
      isLoadingRef.current = false;
      getBookingsQuery.refetch();
      closeBookingDetailsModal();
      closeAlertModal();
    },
    onError: (error) => {
      showNotifications.error(error.message);
      setIsLoading(false);
      isLoadingRef.current = false;
    },
  });

  useEffect(() => {
    const client = new Ably.Realtime({
      authUrl: "/api/ably/token",
      authMethod: "POST",
    });

    const channel = client.channels.get("driver-events");

    const onNotification = (msg: Ably.Message) => {
      setEvents((current) => [
        {
          ...(msg.data as notificationEvent),
        },
        ...current,
      ]);
    };

    channel.subscribe("notification", onNotification);

    return () => {
      channel.unsubscribe("notification", onNotification);
      client.close();
    };
  }, []);

  useEffect(() => {
    if (events.length > 0) {
      getBookingQuery.refetch();
    }
  }, [events, getBookingQuery.refetch]);

  useEffect(() => {
    if (!getBookingQuery.isLoading && getBookingQuery.data) {
      setBookingData(getBookingQuery.data);
      notifications.clean();
      const body = (
        <>
          <Text>
            Pick-up:{" "}
            {getBookingQuery.data.pickupAddr.length > 15
              ? `${getBookingQuery.data.pickupAddr.slice(0, 12)}...`
              : getBookingQuery.data.pickupAddr}{" "}
            at {dbTimeToPrettyString(getBookingQuery.data.pickupTime)}
          </Text>
          <Text>
            Drop-off:{" "}
            {getBookingQuery.data.destAddr.length > 15
              ? `${getBookingQuery.data.destAddr.slice(0, 12)}...`
              : getBookingQuery.data.destAddr}
          </Text>
          <Text>
            Name:{" "}
            {getBookingQuery.data.name.length > 10
              ? `${getBookingQuery.data.name.slice(0, 7)}...`
              : getBookingQuery.data.name}
          </Text>
          {getBookingQuery.data.tripReason.length > 0 && (
            <Text>
              Trip reason:{" "}
              {getBookingQuery.data.tripReason.length > 10
                ? `${getBookingQuery.data.tripReason.slice(0, 7)}...`
                : getBookingQuery.data.tripReason}
            </Text>
          )}
        </>
      );
      setNotificationBody(body);
    }
  }, [getBookingQuery.isLoading, getBookingQuery.data]);

  useEffect(() => {
    if (notificationBody) {
      notifications.show({
        title: (
          <Group justify="space-between">
            <Text>New Booking!</Text>
            {bookingData && (
              <ActionIcon
                aria-label="Call user"
                color="black"
                onClick={() =>
                  (window.location.href = `tel:${bookingData.contactPhone}`)
                }
                variant="transparent"
              >
                <PhoneIcon size={19} />
              </ActionIcon>
            )}
          </Group>
        ),
        message: (
          <Stack gap={"sm"}>
            <ScrollArea.Autosize mah={"100px"}>
              {notificationBody}
            </ScrollArea.Autosize>

            <Group grow>
              <Button
                c={"black"}
                color="buttonColor"
                onClick={() => openBookingDetailsModal()}
                p={0}
                size="compact-sm"
                type="button"
                variant="outline"
              >
                Expand
              </Button>
              <Button
                c={"black"}
                color="buttonColor"
                onClick={() => {
                  if (!isLoadingRef.current) {
                    openAlertModal();
                    notifications.clean();

                    setAlertOnClose(() => () => {
                      closeAlertModal();
                      setNotificationBody(notificationBody);
                    });

                    setNotificationBody(undefined);
                  }
                }}
                p={0}
                size="compact-sm"
                type="button"
                variant="filled"
              >
                Accept Trip
              </Button>
            </Group>
          </Stack>
        ),
        position: "bottom-center",
        autoClose: 30000, //30 seconds
      });
    }
  }, [
    notificationBody,
    openBookingDetailsModal,
    openAlertModal,
    closeAlertModal,
    bookingData,
  ]);

  return (
    <>
      <AlertPopup
        abortButtonText={"Back"}
        body={<Text>Are you sure?</Text>}
        closeModal={() => alertOnClose()}
        confirmButtonText={"Confirm"}
        isLoading={isLoading}
        modalOpened={alertModalOpened}
        onConfirm={() => {
          if (bookingData) {
            acceptBookingMutation.mutate({ bookingIds: [bookingData.id] });
            setIsLoading(true);
            isLoadingRef.current = true;
            setNotificationBody(undefined);
          } else {
            showNotifications.error("Unable to retrieve booking information");
          }
        }}
        titleText={"Accept Trip"}
      />
      <BookingDetails
        bookingData={bookingData}
        closeModal={closeBookingDetailsModal}
        isLoading={isLoading}
        isLoadingRef={isLoadingRef}
        modalOpened={bookingDetailsModalOpened}
        openModal={openBookingDetailsModal}
        setIsLoading={setIsLoading}
      />
    </>
  );
}
