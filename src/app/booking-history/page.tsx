"use client";
import {
  ActionIcon,
  Button,
  Center,
  Checkbox,
  Drawer,
  Flex,
  Group,
  Paper,
  SegmentedControl,
  Skeleton,
  Stack,
  Table,
  Text,
  Title,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useDisclosure, useMediaQuery } from "@mantine/hooks";
import {
  CarProfileIcon,
  CheckCircleIcon,
  CheckFatIcon,
  ClockIcon,
  HouseIcon,
  TrashIcon,
  XCircleIcon,
} from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { type JSX, useEffect, useRef, useState } from "react";
import {
  dbTimeToLocalTime,
  dbTimeToPrettyString,
  formatString,
} from "~/lib/helpers";
import {
  checkAddress,
  checkName,
  checkPhoneNumber,
  checkPickUpTime,
  checkTripReason,
} from "~/lib/input-checkers";
import { showNotifications } from "~/lib/mantine-notifications-system";
import { authClient } from "~/server/better-auth/client";
import { api, type RouterOutputs } from "~/trpc/react";
import { BookingStatus, UserRoles } from "~/types/types";
import AlertPopup from "../_components/common/alert/alert";
import BookingContents from "../_components/common/bookingContents/booking-contents";
import LoadingScreen from "../_components/common/loadingScreen/loading-screen";

type bookingsData = RouterOutputs["bookings"]["get"][0];

export default function BookingHistoryPage() {
  const router = useRouter();
  const isSuperSmall = useMediaQuery("(max-width: 520px)");
  const isMobile = useMediaQuery("(max-width: 635px)");
  const isTablet = useMediaQuery("(max-width: 925px)");
  const [table, setTable] = useState("pending");
  const [drawerOpened, { open: openDrawer, close: closeDrawer }] =
    useDisclosure(false);
  const [alertModalOpened, { open: openAlertModal, close: closeAlertModal }] =
    useDisclosure(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedRows, setSelectedRows] = useState<number[]>([]); //Each element is a booking's ID
  const [isMutating, setIsMutating] = useState(false);
  const isMutatingRef = useRef(false);
  const [alertBodyComponent, setAlertBodyComponent] = useState(
    <Text>Are you sure?</Text>,
  );
  const [onModalSubmit, setOnModalSubmit] = useState<() => void>(() => {});
  const { data: session, isPending } = authClient.useSession();
  const [showLoadingUI, setShowLoadingUI] = useState(true);
  const [drawerContents, setDrawerContents] = useState<
    bookingsData | undefined
  >(undefined);

  //--Holds all bookings, separated into 4 tables--
  let pendingBookings = [] as JSX.Element[];
  let inProgressBookings = [] as JSX.Element[];
  let cancelledBookings = [] as JSX.Element[];
  let completedBookings = [] as JSX.Element[];
  //-----------------------------------------------

  useEffect(() => {
    if (session?.user.role === UserRoles.ADMIN) {
      router.replace("/admin");
    } else if (session?.user.role === UserRoles.DRIVER) {
      router.replace("/driver");
    } else if (session?.user.role === UserRoles.MEMBER) {
      setShowLoadingUI(false);
    } else if (!isPending && !session) {
      router.replace("/");
    }
  }, [session, router, isPending]);

  //Configure booking form
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
      phoneNumber: (value) => {
        const result = checkPhoneNumber(value);

        if (result.isProper) {
          return null;
        } else {
          return result.errorMessage;
        }
      },
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

  const getBookingsQuery = api.bookings.get.useQuery();

  //Update booking mutation
  const updateBookingMutation = api.bookings.update.useMutation({
    onSuccess: () => {
      showNotifications.success("Booking updated");
      setIsMutating(false);
      isMutatingRef.current = false;
      getBookingsQuery.refetch();
      closeDrawer();
      closeAlertModal();
    },
    onError: (error) => {
      showNotifications.error(error.message);
      setIsMutating(false);
      isMutatingRef.current = false;
    },
  });

  //Cancel booking mutation
  const cancelBookingMutation = api.bookings.cancel.useMutation({
    onSuccess: () => {
      showNotifications.success("Cancelled successfully");
      setIsMutating(false);
      isMutatingRef.current = false;
      getBookingsQuery.refetch();
      closeDrawer();
      closeAlertModal();
      setIsDeleting(false);
      setSelectedRows([]);
    },
    onError: (error) => {
      showNotifications.error(error.message);
      setIsMutating(false);
      isMutatingRef.current = false;
    },
  });

  useEffect(() => {
    if (!getBookingsQuery.isLoading && getBookingsQuery.error) {
      showNotifications.error(
        getBookingsQuery.error.message ??
          "An error occurred while fetching booking data",
      );
    }
  }, [getBookingsQuery.error, getBookingsQuery.isLoading]);

  if (!getBookingsQuery.isLoading && getBookingsQuery.data) {
    //For each booking, make a jsx element for it
    for (const booking of getBookingsQuery.data) {
      //Put the booking in its own jsx element
      const row = (
        <Table.Tr
          bg={selectedRows.includes(booking.id) ? "buttonColor" : undefined}
          key={booking.id}
          onClick={() => {
            //Disable drawer open function if delete function is enabled
            if (isDeleting) {
              //If row is clicked while delete function is enabled, extend check
              //box onClick behavior
              if (selectedRows.includes(booking.id)) {
                //Row has been checked
                //Uncheck the row
                setSelectedRows(
                  selectedRows.filter((position) => position !== booking.id),
                );
              } else if (!selectedRows.includes(booking.id)) {
                //Row has not been checked
                //Check the row
                setSelectedRows([...selectedRows, booking.id]);
              }
              return;
            }

            //--Prefill mantine form with booking data--
            bookingForm.setInitialValues({
              pickupTime: dbTimeToLocalTime(booking.pickupTime),
              pickupAddr: booking.pickupAddr,
              destAddr: booking.destAddr,
              name: booking.name,
              reasonForTrip: booking.tripReason,
              phoneNumber: booking.contactPhone,
            });
            bookingForm.setValues({
              pickupTime: dbTimeToLocalTime(booking.pickupTime),
              pickupAddr: booking.pickupAddr,
              destAddr: booking.destAddr,
              name: booking.name,
              reasonForTrip: booking.tripReason,
              phoneNumber: booking.contactPhone,
            });
            //------------------------------------------

            bookingForm.resetDirty();
            setDrawerContents(booking);
            openDrawer();
          }}
          style={{ cursor: "pointer" }}
        >
          {isDeleting && (
            <Table.Td>
              <Checkbox
                aria-label="Select row"
                checked={selectedRows.includes(booking.id)}
                color="black"
                onChange={(event) =>
                  setSelectedRows(
                    event.currentTarget.checked
                      ? [...selectedRows, booking.id]
                      : selectedRows.filter(
                          (position) => position !== booking.id,
                        ),
                  )
                }
              />
            </Table.Td>
          )}
          <Table.Td>{dbTimeToPrettyString(booking.pickupTime)}</Table.Td>
          {!isSuperSmall && (
            <Table.Td>
              {booking.pickupAddr.length > 15
                ? `${booking.pickupAddr.slice(0, 12)}...`
                : booking.pickupAddr}
            </Table.Td>
          )}
          <Table.Td>
            {booking.destAddr.length > 15
              ? `${booking.destAddr.slice(0, 12)}...`
              : booking.destAddr}
          </Table.Td>
          {!isMobile && (
            <>
              <Table.Td>{formatString(booking.paymentMethod)}</Table.Td>
              <Table.Td>
                {booking.tripReason.length > 30
                  ? `${booking.tripReason.slice(0, 27)}...`
                  : booking.tripReason}
              </Table.Td>
            </>
          )}
        </Table.Tr>
      );

      //Put the row in one of four tables
      if (booking.status === BookingStatus.PENDING) {
        pendingBookings = [...pendingBookings, row];
      } else if (booking.status === BookingStatus.IN_PROGRESS) {
        inProgressBookings = [...inProgressBookings, row];
      } else if (booking.status === BookingStatus.COMPLETED) {
        completedBookings = [...completedBookings, row];
      } else if (booking.status === BookingStatus.CANCELLED) {
        cancelledBookings = [...cancelledBookings, row];
      }
    }
  }

  //Handle booking edit/update behaviors
  const handleFormOnSubmit = async (values: typeof bookingForm.values) => {
    if (isMutatingRef.current || !drawerContents) {
      //If form is already submitting
      return;
    }
    setIsMutating(true);
    isMutatingRef.current = true;

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

  if (showLoadingUI) {
    return <LoadingScreen />;
  }

  return (
    <Flex
      align={"center"}
      bg={"backgroundColor"}
      direction={{ base: "column", smMd: "row" }}
      h={"100dvh"}
      justify={"center"}
    >
      <aside>
        <AlertPopup
          abortButtonText={"Back"}
          body={alertBodyComponent}
          closeModal={closeAlertModal}
          confirmButtonText={"Confirm"}
          isLoading={isMutating}
          modalOpened={alertModalOpened}
          onConfirm={() => onModalSubmit()}
          titleText={"Are you Sure?"}
        />
        <Drawer
          offset={8}
          onClose={closeDrawer}
          opened={drawerOpened}
          radius="md"
          styles={
            drawerContents && drawerContents.status === BookingStatus.PENDING
              ? { body: { paddingBottom: 0 } }
              : undefined
          }
          title={
            drawerContents && drawerContents.status === BookingStatus.PENDING
              ? "Edit Trip"
              : "View Trip"
          }
        >
          <Stack h={"calc(100dvh - 75px)"}>
            {drawerContents &&
              drawerContents.status === BookingStatus.PENDING && (
                <BookingContents
                  bookingData={drawerContents}
                  form={bookingForm}
                  readOnly={false}
                />
              )}
            {drawerContents &&
              drawerContents.status !== BookingStatus.PENDING && (
                <BookingContents bookingData={drawerContents} readOnly={true} />
              )}
            {drawerContents &&
              drawerContents.status === BookingStatus.PENDING && (
                <Stack bottom={"0%"} flex={1} justify="flex-end" pos={"sticky"}>
                  <Group bg={"primaryColor"} grow py={"md"}>
                    <Button
                      c={"black"}
                      color="buttonColor"
                      onClick={() => {
                        openAlertModal();
                        setAlertBodyComponent(
                          <>
                            <Text>
                              A refund will be provided to trips that are still
                              pending
                            </Text>
                            <Text>This action cannot be undone!</Text>
                          </>,
                        );
                        setOnModalSubmit(() => () => {
                          if (isMutatingRef.current) {
                            return;
                          }
                          setIsMutating(true);
                          isMutatingRef.current = true;
                          cancelBookingMutation.mutate({
                            bookingIds: [drawerContents.id],
                          });
                        });
                      }}
                      p={0}
                      size="compact-sm"
                      type="button"
                      variant="outline"
                    >
                      Cancel Trip
                    </Button>
                    <Button
                      c={bookingForm.isDirty() ? "black" : undefined}
                      color="buttonColor"
                      disabled={!bookingForm.isDirty()}
                      form="booking-form"
                      onClick={() => {
                        bookingForm.validate();
                        if (bookingForm.isValid()) {
                          openAlertModal();
                          setAlertBodyComponent(
                            <Text>
                              Trip information will be changed. Are you sure?
                            </Text>,
                          );
                          setOnModalSubmit(
                            () => () =>
                              bookingForm.onSubmit(handleFormOnSubmit)(),
                          );
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
              )}
          </Stack>
        </Drawer>
      </aside>
      <main>
        <Paper bg={"primaryColor"} h={"80vh"} p={"sm"} radius="lg" w={"80vw"}>
          <Stack h={"100%"}>
            <Group w={"100%"}>
              <ActionIcon
                aria-label="Go Home"
                color="black"
                onClick={() => router.push("/")}
                variant="transparent"
              >
                <HouseIcon size={19} />
              </ActionIcon>
              <Title
                order={3}
                style={{
                  borderBottom: "2px solid black",
                  width: "fit-content",
                }}
              >
                Trip History
              </Title>
              <Group
                flex={1}
                justify={isSuperSmall ? "flex-start" : "flex-end"}
                wrap="nowrap"
              >
                <SegmentedControl
                  data={[
                    {
                      value: "pending",
                      label: (
                        <Center style={{ gap: 10 }}>
                          <ClockIcon size={19} />
                          {!isTablet && <Text>Pending</Text>}
                        </Center>
                      ),
                    },
                    {
                      value: "in_progress",
                      label: (
                        <Center style={{ gap: 10 }}>
                          <CarProfileIcon size={19} />
                          {!isTablet && <Text>In Progress</Text>}
                        </Center>
                      ),
                      disabled: isDeleting,
                    },
                    {
                      value: "cancelled",
                      label: (
                        <Center style={{ gap: 10 }}>
                          <XCircleIcon size={19} />
                          {!isTablet && <Text>Cancelled</Text>}
                        </Center>
                      ),
                      disabled: isDeleting,
                    },
                    {
                      value: "complete",
                      label: (
                        <Center style={{ gap: 10 }}>
                          <CheckCircleIcon size={19} />
                          {!isTablet && <Text>Completed</Text>}
                        </Center>
                      ),
                      disabled: isDeleting,
                    },
                  ]}
                  onChange={setTable}
                  value={table}
                />
                <ActionIcon
                  aria-label="Delete Bookings"
                  color="black"
                  onClick={() => {
                    if (!isDeleting || selectedRows.length === 0) {
                      //default state or in delete mode with nothing selected
                      setTable("pending");
                      setIsDeleting(!isDeleting);
                    } else {
                      //already in delete mode
                      openAlertModal();
                      setAlertBodyComponent(
                        <>
                          <Text>
                            A refund will be provided to trips that are still
                            pending
                          </Text>
                          <Text>This action cannot be undone!</Text>
                        </>,
                      );
                      setOnModalSubmit(() => () => {
                        if (isMutatingRef.current) {
                          return;
                        }
                        setIsMutating(true);
                        isMutatingRef.current = true;
                        cancelBookingMutation.mutate({
                          bookingIds: selectedRows,
                        });
                      });
                    }
                  }}
                  variant="outline"
                >
                  {!isDeleting && <TrashIcon size={19} />}
                  {isDeleting && <CheckFatIcon size={19} />}
                </ActionIcon>
              </Group>
            </Group>
            <Table.ScrollContainer
              minWidth={0}
              style={{ flex: 1, minHeight: 0 }}
            >
              <Table highlightOnHover stickyHeader>
                <Table.Thead>
                  <Table.Tr>
                    {isDeleting && <Table.Th>Cancel?</Table.Th>}
                    <Table.Th>Pick-up Time</Table.Th>
                    {!isSuperSmall && <Table.Th>Pick-up Address</Table.Th>}
                    <Table.Th>Destination</Table.Th>
                    {!isMobile && (
                      <>
                        <Table.Th>Payment Method</Table.Th>
                        <Table.Th>Reason for Trip</Table.Th>
                      </>
                    )}
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {table === "pending" && pendingBookings}
                  {table === "in_progress" && inProgressBookings}
                  {table === "cancelled" && cancelledBookings}
                  {table === "complete" && completedBookings}
                </Table.Tbody>
              </Table>
              {getBookingsQuery.isLoading && (
                <Stack pt={"md"}>
                  <Skeleton height={30} radius="xl" width={"100%"} />
                  <Skeleton height={30} radius="xl" width={"100%"} />
                  <Skeleton height={30} radius="xl" width={"100%"} />
                  <Skeleton height={30} radius="xl" width={"100%"} />
                </Stack>
              )}
            </Table.ScrollContainer>
          </Stack>
        </Paper>
      </main>
    </Flex>
  );
}
