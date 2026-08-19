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
import { type JSX, useState } from "react";
import { showNotifications } from "~/lib/mantine-notifications-system";
import { api } from "~/trpc/react";
import AddressDropdown from "../_components/bookingForm/booking-form-components/address-drop-down-field";
import PickupTimeInput from "../_components/bookingForm/booking-form-components/pick-up-time-field";
import AlertPopup from "../_components/common/alert/alert";

//Takes a Date object made by mantine and converts it into a readable string
const formatDate = (date: Date | string) =>
  `${new Date(date).toDateString()} at ${new Date(date).toLocaleTimeString()}`;

//Takes a string written as "a_b" and converts it into a string "A B"
const formatString = (text: string) =>
  text
    .split("_")
    .map((value, _) => `${value.at(0)?.toUpperCase()}${value.substring(1)}`)
    .join(" ");

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

  //--Holds all bookings, separated into 4 tables--
  let pendingBookings = [] as JSX.Element[];
  let inProgressBookings = [] as JSX.Element[];
  let cancelledBookings = [] as JSX.Element[];
  let completedBookings = [] as JSX.Element[];
  //-----------------------------------------------

  //Configure booking form
  const bookingForm = useForm<{
    pickupTime: string | null;
    pickupAddr: string;
    destAddr: string;
    name: string;
    reasonForTrip: string | null;
    paymentMethod: string;
    paymentCode: string | null;
    id: number;
    status: string;
    createdAt: Date;
    updatedAt: Date;
  }>({
    mode: "uncontrolled",

    //Frontend field checks
    /*
    validate: {
      pickupTime: (value) =>
        formState === BookingUIStates.Where_To ||
        formState === BookingUIStates.Confirm
          ? value !== null
            ? null
            : "Must select a pick-up time"
          : null,
      pickupAddr: (value) =>
        formState === BookingUIStates.Where_To ||
        formState === BookingUIStates.Confirm
          ? value.length !== 0
            ? null
            : "Must add a pick-up address"
          : null,
      destAddr: (value) =>
        formState === BookingUIStates.Where_To ||
        formState === BookingUIStates.Confirm
          ? value.length !== 0
            ? null
            : "Must add a destination address"
          : null,
      name: (value) =>
        formState === BookingUIStates.About_You ||
        formState === BookingUIStates.Confirm
          ? value.length !== 0
            ? null
            : "Field cannot be blank"
          : null,
    },
    */
  });

  const { data, isLoading, error } = api.bookings.get.useQuery(undefined, {
    //Ensure that the query automatically runs but does so exactly once
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  if (!isLoading && error) {
    showNotifications.error(
      error.message ?? "An error occurred while fetching booking data",
    );
  } else if (!isLoading && data) {
    //For each booking, make a jsx element for it
    for (const booking of data) {
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
              pickupTime: booking.pickupTime,
              pickupAddr: booking.pickupAddr,
              destAddr: booking.destAddr,
              name: booking.name,
              reasonForTrip: booking.tripReason,
              paymentMethod: booking.payment,
              paymentCode: null,
              id: booking.id,
              status: formatString(booking.status),
              createdAt: booking.createdAt,
              updatedAt: booking.updatedAt,
            });
            bookingForm.setValues({
              pickupTime: booking.pickupTime,
              pickupAddr: booking.pickupAddr,
              destAddr: booking.destAddr,
              name: booking.name,
              reasonForTrip: booking.tripReason,
              paymentMethod: booking.payment,
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
          <Table.Td>{formatDate(booking.pickupTime)}</Table.Td>
          {!isSuperSmall && <Table.Td>{booking.pickupAddr}</Table.Td>}
          <Table.Td>{booking.destAddr}</Table.Td>
          {!isMobile && (
            <>
              <Table.Td>{booking.payment}</Table.Td>
              <Table.Td>{booking.tripReason}</Table.Td>
            </>
          )}
        </Table.Tr>
      );

      //Put the row in one of four tables
      if (booking.status === "pending") {
        pendingBookings = [...pendingBookings, row];
      } else if (booking.status === "in_progress") {
        inProgressBookings = [...inProgressBookings, row];
      } else if (booking.status === "completed") {
        completedBookings = [...completedBookings, row];
      } else if (booking.status === "cancelled") {
        cancelledBookings = [...cancelledBookings, row];
      }
    }
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
          modalOpened={modalOpened}
          onConfirm={() => {}}
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
          <Stack h={"calc(100dvh - 90px)"}>
            <TextInput
              defaultValue={bookingForm.values.status}
              label="Trip Status"
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
                  defaultValue={formatDate(bookingForm.values.pickupTime ?? "")}
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
                bookingForm.values.paymentMethod === "Pay with Credit Card"
                  ? "Credit Card"
                  : bookingForm.values.paymentMethod === "Redeem Code"
                    ? `Code (${bookingForm.values.paymentCode ?? "unable to retrieve code"})`
                    : bookingForm.values.paymentMethod === "Pay with Rides"
                      ? "Rides"
                      : ""
              }
              label="Payment Method"
              readOnly
              variant="unstyled"
            />
            <TextInput
              defaultValue={formatDate(bookingForm.values.createdAt)}
              label="Created On"
              readOnly
              variant="unstyled"
            />
            <TextInput
              defaultValue={formatDate(bookingForm.values.updatedAt)}
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
                    onClick={openModal}
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
                    disabled={bookingForm.isDirty() ? false : true}
                    form="register-form"
                    onClick={() => {}}
                    p={0}
                    size="compact-sm"
                    type="submit"
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
                    setTable("pending");
                    setIsDeleting(!isDeleting);
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
                    {isDeleting && <Table.Th>Delete?</Table.Th>}
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
              {isLoading && (
                <>
                  <Skeleton height={50} radius="xl" width={400} />
                  <Skeleton height={50} radius="xl" width={400} />
                  <Skeleton height={50} radius="xl" width={400} />
                  <Skeleton height={50} radius="xl" width={400} />
                </>
              )}
            </Table.ScrollContainer>
          </Stack>
        </Paper>
      </main>
    </Flex>
  );
}
