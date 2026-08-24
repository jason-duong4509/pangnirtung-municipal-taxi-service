"use client";
import {
  ActionIcon,
  Button,
  Center,
  Checkbox,
  Drawer,
  Flex,
  Group,
  Loader,
  Paper,
  SegmentedControl,
  Skeleton,
  Stack,
  Table,
  Text,
  Textarea,
  TextInput,
  Title,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useDisclosure, useMediaQuery } from "@mantine/hooks";
import {
  CalendarBlankIcon,
  CarProfileIcon,
  CheckCircleIcon,
  CheckFatIcon,
  ClockIcon,
  HouseIcon,
  MapPinLineIcon,
  PathIcon,
  QuestionIcon,
  TrashIcon,
  UserIcon,
  XCircleIcon,
} from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { type JSX, useEffect, useState } from "react";
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
import { api } from "~/trpc/react";
import { BookingStatus } from "~/types/types";
import AddressDropdown from "../_components/bookingForm/booking-form-components/address-drop-down-field";
import PickupTimeInput from "../_components/bookingForm/booking-form-components/pick-up-time-field";
import AlertPopup from "../_components/common/alert/alert";

export default function BookingHistoryPage() {
  const router = useRouter();
  const isSuperSmall = useMediaQuery("(max-width: 520px)");
  const isMobile = useMediaQuery("(max-width: 635px)");
  const isTablet = useMediaQuery("(max-width: 925px)");
  const [table, setTable] = useState("pending");
  const [drawerOpened, { open: openDrawer, close: closeDrawer }] =
    useDisclosure(false);
  const [modalOpened, { open: openModal, close: closeModal }] =
    useDisclosure(false);
  const [pickupAddr, setPickupAddr] = useState("");
  const [destAddr, setDestAddr] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedRows, setSelectedRows] = useState<number[]>([]); //Each element is a booking's ID
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [cancellingBookings, setCancellingBookings] = useState(false);

  //--Holds all bookings, separated into 4 tables--
  let pendingBookings = [] as JSX.Element[];
  let inProgressBookings = [] as JSX.Element[];
  let cancelledBookings = [] as JSX.Element[];
  let completedBookings = [] as JSX.Element[];
  //-----------------------------------------------

  //Configure booking form
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

  const getBookingsQuery = api.bookings.get.useQuery(undefined, {
    //Ensure that the query automatically runs but does so exactly once
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  //Update booking mutation
  const updateBookingMutation = api.bookings.update.useMutation({
    onSuccess: () => {
      showNotifications.success("Booking updated");
      setFormSubmitting(false);
      getBookingsQuery.refetch();
      closeDrawer();
    },
    onError: (error) => {
      showNotifications.error(error.message);
      setFormSubmitting(false);
    },
  });

  //Cancel booking mutation
  const cancelBookingMutation = api.bookings.cancel.useMutation({
    onSuccess: () => {
      showNotifications.success("Cancelled successfully");
      setCancellingBookings(false);
      getBookingsQuery.refetch();
      closeDrawer();
      closeModal();
      setIsDeleting(false);
      setSelectedRows([]);
    },
    onError: (error) => {
      showNotifications.error(error.message);
      setFormSubmitting(false);
      setCancellingBookings(false);
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
            //Prefill mantine controlled fields with booking data
            setPickupAddr(booking.pickupAddr);
            setDestAddr(booking.destAddr);

            //--Prefill mantine form with booking data--
            bookingForm.setInitialValues({
              pickupTime:
                booking.status === BookingStatus.PENDING
                  ? dbTimeToLocalTime(booking.pickupTime)
                  : booking.pickupTime,
              pickupAddr: booking.pickupAddr,
              destAddr: booking.destAddr,
              name: booking.name,
              reasonForTrip: booking.tripReason,
              paymentMethod: formatString(booking.payment),
              paymentCode: null,
              id: booking.id,
              status: formatString(booking.status),
              createdAt: booking.createdAt,
              updatedAt: booking.updatedAt,
            });
            bookingForm.setValues({
              pickupTime:
                booking.status === BookingStatus.PENDING
                  ? dbTimeToLocalTime(booking.pickupTime)
                  : booking.pickupTime,
              pickupAddr: booking.pickupAddr,
              destAddr: booking.destAddr,
              name: booking.name,
              reasonForTrip: booking.tripReason,
              paymentMethod: formatString(booking.payment),
              paymentCode: null,
              id: booking.id,
              status: formatString(booking.status),
              createdAt: booking.createdAt,
              updatedAt: booking.updatedAt,
            });
            //------------------------------------------

            bookingForm.resetDirty();
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
          {!isSuperSmall && <Table.Td>{booking.pickupAddr}</Table.Td>}
          <Table.Td>{booking.destAddr}</Table.Td>
          {!isMobile && (
            <>
              <Table.Td>{formatString(booking.payment)}</Table.Td>
              <Table.Td>{booking.tripReason}</Table.Td>
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
          body={
            <>
              <Text>
                A refund will be provided to trips that are still pending
              </Text>
              <Text>This action cannot be undone!</Text>
            </>
          }
          closeModal={closeModal}
          confirmButtonText={"Confirm"}
          isLoading={cancellingBookings}
          modalOpened={modalOpened}
          onConfirm={() => {
            setCancellingBookings(true);
            cancelBookingMutation.mutate({
              bookingIds: selectedRows,
            });
          }}
          titleText={"Are you Sure?"}
        />
        <Drawer
          offset={8}
          onClose={closeDrawer}
          opened={drawerOpened}
          radius="md"
          styles={
            bookingForm.values.status === "Pending"
              ? { body: { paddingBottom: 0 } }
              : undefined
          }
          title={
            bookingForm.values.status === "Pending" ? "Edit Trip" : "View Trip"
          }
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
                required
              />
              {bookingForm.values.status === "Pending" && (
                <>
                  <PickupTimeInput
                    form={bookingForm}
                    formField={"pickupTime"}
                    required
                    useLabel
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
                    required
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
                    required
                  />
                </>
              )}
              {bookingForm.values.status !== "Pending" && (
                <>
                  <TextInput
                    defaultValue={dbTimeToPrettyString(
                      bookingForm.values.pickupTime as Date,
                    )}
                    label={"Pick-up Time"}
                    leftSection={<CalendarBlankIcon size={20} />}
                    readOnly
                  />
                  <TextInput
                    defaultValue={bookingForm.values.pickupAddr}
                    label={"Pick-up Address"}
                    leftSection={<MapPinLineIcon size={20} />}
                    readOnly
                  />
                  <TextInput
                    defaultValue={bookingForm.values.destAddr}
                    label={"Destination Address"}
                    leftSection={<PathIcon size={20} />}
                    readOnly
                  />
                </>
              )}
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
                defaultValue={dbTimeToPrettyString(
                  bookingForm.values.createdAt,
                )}
                label="Created On"
                readOnly
                variant="unstyled"
              />
              <TextInput
                defaultValue={dbTimeToPrettyString(
                  bookingForm.values.updatedAt,
                )}
                label="Last Updated"
                readOnly
                variant="unstyled"
              />
              {bookingForm.values.status === "Pending" && (
                <Stack bottom={"0%"} flex={1} justify="flex-end" pos={"sticky"}>
                  <Group bg={"primaryColor"} grow py={"md"}>
                    <Button
                      c={"black"}
                      color="buttonColor"
                      onClick={() => {
                        setSelectedRows([bookingForm.values.id]);
                        openModal();
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
                      p={0}
                      size="compact-sm"
                      type="submit"
                      variant="filled"
                    >
                      {!formSubmitting && "Update Trip"}
                      {formSubmitting && <Loader color="black" size={20} />}
                    </Button>
                  </Group>
                </Stack>
              )}
            </Stack>
          </form>
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
                      openModal();
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
