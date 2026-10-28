"use client";

import {
  Center,
  Checkbox,
  Flex,
  Group,
  Paper,
  SegmentedControl,
  Select,
  Stack,
  Table,
  Text,
  TextInput,
} from "@mantine/core";
import { DateInput, DateTimePicker } from "@mantine/dates";
import { useDisclosure, useMediaQuery } from "@mantine/hooks";
import {
  CarProfileIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
} from "@phosphor-icons/react";
import dayjs from "dayjs";
import {
  type Dispatch,
  type JSX,
  type SetStateAction,
  useEffect,
  useState,
} from "react";
import { dbTimeToPrettyString, formatString } from "~/lib/helpers";
import { showNotifications } from "~/lib/mantine-notifications-system";
import type { RouterOutputs } from "~/server/api/root";
import { api } from "~/trpc/react";
import { BookingStatus, PaymentMethods } from "~/types/types";
import PickupTimeInput from "../../bookingForm/booking-form-components/pick-up-time-field";
import TripLoading from "../../common/trips/trip-loading";
import EditTripsDrawer from "./edit-trips-drawer";

type bookingsData = RouterOutputs["bookings"]["get"][0];
enum TableColumnNames {
  PICK_UP_TIME = "Pick-up Time",
  PICK_UP_ADDRESS = "Pick-up Address",
  REQUESTED_VERIFICATION = "Requested Verification?",
  DESTINATION_ADDRESS = "Destination Address",
  PAYMENT_METHOD = "Payment Method",
  REASON_FOR_TRIP = "Reason For Trip",
}

export default function EditTripsTable({
  isSelecting,
  selectedRows,
  setSelectedRows,
  setTable,
  table,
}: {
  isSelecting: boolean;
  selectedRows: number[];
  setSelectedRows: Dispatch<SetStateAction<number[]>>;
  setTable: Dispatch<SetStateAction<string>>;
  table: string;
}) {
  const isSuperSmall = useMediaQuery("(max-width: 520px)");
  const isMobile = useMediaQuery("(max-width: 635px)");
  const isTablet = useMediaQuery("(max-width: 1400px)");
  const [drawerOpened, { open: openDrawer, close: closeDrawer }] =
    useDisclosure(false);
  const [drawerContents, setDrawerContents] = useState<
    bookingsData | undefined
  >(undefined);
  const [columnFilter, setColumnFilter] = useState<string | null>(null);
  const [filterKeyword, setFilterKeyword] = useState<string>("");

  const getBookingsQuery = api.bookings.get.useQuery();

  //--Holds all bookings, separated into 4 tables--
  let pendingBookings = [] as JSX.Element[];
  let inProgressBookings = [] as JSX.Element[];
  let cancelledBookings = [] as JSX.Element[];
  let completedBookings = [] as JSX.Element[];
  //-----------------------------------------------

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
            //Disable drawer open function if multi-select trip is enabled
            if (isSelecting) {
              //If row is clicked while multi-select is enabled, extend check
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
            setDrawerContents(booking);
            openDrawer();
          }}
          style={{ cursor: "pointer" }}
        >
          {isSelecting && (
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
            <>
              <Table.Td>
                {booking.pickupAddr.length > 15
                  ? `${booking.pickupAddr.slice(0, 12)}...`
                  : booking.pickupAddr}
              </Table.Td>
              <Table.Td>{booking.requestVerification ? "Yes" : "No"}</Table.Td>
            </>
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

      //--Filters--
      const noFilterSet = columnFilter === null;
      const pickUpAddrMatch =
        columnFilter === TableColumnNames.PICK_UP_ADDRESS &&
        booking.pickupAddr.toLowerCase().includes(filterKeyword.toLowerCase());
      const destAddrMatch =
        columnFilter === TableColumnNames.DESTINATION_ADDRESS &&
        booking.destAddr.toLowerCase().includes(filterKeyword.toLowerCase());
      const tripReasonMatch =
        columnFilter === TableColumnNames.REASON_FOR_TRIP &&
        booking.tripReason.toLowerCase().includes(filterKeyword.toLowerCase());
      const requestedVerificationMatch =
        columnFilter === TableColumnNames.REQUESTED_VERIFICATION &&
        (filterKeyword === "" ||
          (filterKeyword === "Yes" && booking.requestVerification) ||
          (filterKeyword === "No" && !booking.requestVerification));
      const paymentMethodMatch =
        columnFilter === TableColumnNames.PAYMENT_METHOD &&
        (filterKeyword === "" || filterKeyword === booking.paymentMethod);
      const pickUpTimeMatch =
        columnFilter === TableColumnNames.PICK_UP_TIME &&
        (filterKeyword === "" ||
          dayjs(filterKeyword).isSame(dayjs(booking.pickupTime), "day"));

      const includeRow =
        noFilterSet ||
        pickUpAddrMatch ||
        destAddrMatch ||
        tripReasonMatch ||
        requestedVerificationMatch ||
        paymentMethodMatch ||
        pickUpTimeMatch;
      //--Filters--

      //Put the row in one of four tables
      if (booking.status === BookingStatus.PENDING && includeRow) {
        pendingBookings = [...pendingBookings, row];
      } else if (booking.status === BookingStatus.IN_PROGRESS && includeRow) {
        inProgressBookings = [...inProgressBookings, row];
      } else if (booking.status === BookingStatus.COMPLETED && includeRow) {
        completedBookings = [...completedBookings, row];
      } else if (booking.status === BookingStatus.CANCELLED && includeRow) {
        cancelledBookings = [...cancelledBookings, row];
      }
    }
  }

  return (
    <Paper bg={"primaryColor"} h={"80%"} p={"sm"} radius="lg" w={"90%"}>
      <EditTripsDrawer
        closeDrawer={closeDrawer}
        drawerContents={drawerContents}
        drawerOpened={drawerOpened}
        openDrawer={openDrawer}
      />
      <Stack h={"100%"}>
        <section>
          <Flex direction={isMobile ? "column" : "row"} gap={"md"}>
            <Group flex={1} grow>
              <Select
                aria-label="Column Filter"
                data={[
                  TableColumnNames.DESTINATION_ADDRESS,
                  TableColumnNames.PAYMENT_METHOD,
                  TableColumnNames.PICK_UP_ADDRESS,
                  TableColumnNames.PICK_UP_TIME,
                  TableColumnNames.REASON_FOR_TRIP,
                  TableColumnNames.REQUESTED_VERIFICATION,
                ]}
                onChange={(value) => {
                  setColumnFilter(value);
                  setFilterKeyword("");
                }}
                placeholder="Select Column Filters"
                value={columnFilter}
              />
              {(columnFilter === TableColumnNames.DESTINATION_ADDRESS ||
                columnFilter === TableColumnNames.PICK_UP_ADDRESS ||
                columnFilter === TableColumnNames.REASON_FOR_TRIP) && (
                <TextInput
                  aria-label="Keyword filter"
                  onChange={(event) =>
                    setFilterKeyword(event.currentTarget.value)
                  }
                  placeholder="Filter Keyword"
                  value={filterKeyword}
                />
              )}
              {columnFilter === TableColumnNames.REQUESTED_VERIFICATION && (
                <Select
                  aria-label="Keyword filter"
                  data={["Yes", "No"]}
                  onChange={(value) => {
                    if (value) {
                      setFilterKeyword(value);
                    }
                  }}
                  placeholder="Yes/No"
                  value={filterKeyword}
                />
              )}
              {columnFilter === TableColumnNames.PAYMENT_METHOD && (
                <Select
                  aria-label="Keyword Filter"
                  data={[
                    PaymentMethods.CASH,
                    PaymentMethods.CREDIT_CARD,
                    PaymentMethods.RIDES,
                  ]}
                  onChange={(value) => {
                    if (value) {
                      setFilterKeyword(value);
                    }
                  }}
                  placeholder="Payment Method"
                  value={filterKeyword}
                />
              )}
              {columnFilter === TableColumnNames.PICK_UP_TIME && (
                <DateInput
                  aria-label="Keyword filter"
                  clearable
                  dateParser={(input) => {
                    return dayjs(input, "DD/MM/YYYY").format("YYYY-MM-DD");
                  }}
                  onChange={(value) => {
                    if (!value) {
                      setFilterKeyword("");
                    } else {
                      setFilterKeyword(value);
                    }
                  }}
                  placeholder="Select Date and Time"
                  valueFormat="DD/MM/YYYY"
                />
              )}
            </Group>
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
                },
                {
                  value: "cancelled",
                  label: (
                    <Center style={{ gap: 10 }}>
                      <XCircleIcon size={19} />
                      {!isTablet && <Text>Cancelled</Text>}
                    </Center>
                  ),
                },
                {
                  value: "complete",
                  label: (
                    <Center style={{ gap: 10 }}>
                      <CheckCircleIcon size={19} />
                      {!isTablet && <Text>Completed</Text>}
                    </Center>
                  ),
                },
              ]}
              fullWidth
              onChange={(value) => {
                setTable(value);
                setSelectedRows([]);
              }}
              value={table}
            />
          </Flex>
        </section>
        <Table.ScrollContainer minWidth={0} style={{ flex: 1, minHeight: 0 }}>
          <Table highlightOnHover stickyHeader>
            <Table.Thead>
              <Table.Tr>
                {isSelecting && <Table.Th></Table.Th>}
                <Table.Th>Pick-up Time</Table.Th>
                {!isSuperSmall && <Table.Th>Pick-up Address</Table.Th>}
                {!isSuperSmall && <Table.Th>Requested Verification</Table.Th>}
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
          {getBookingsQuery.isLoading && <TripLoading />}
        </Table.ScrollContainer>
      </Stack>
    </Paper>
  );
}
