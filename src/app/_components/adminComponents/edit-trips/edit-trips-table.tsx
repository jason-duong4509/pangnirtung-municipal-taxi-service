"use client";

import {
  Center,
  Checkbox,
  Paper,
  SegmentedControl,
  Stack,
  Table,
  Text,
} from "@mantine/core";
import { useDisclosure, useMediaQuery } from "@mantine/hooks";
import {
  CarProfileIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
} from "@phosphor-icons/react";
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
import { BookingStatus } from "~/types/types";
import TripLoading from "../../common/trips/trip-loading";
import EditTripsDrawer from "./edit-trips-drawer";

type bookingsData = RouterOutputs["bookings"]["get"][0];

export default function EditTripsTable({
  isSelecting,
  selectedRows,
  setSelectedRows,
}: {
  isSelecting: boolean;
  selectedRows: number[];
  setSelectedRows: Dispatch<SetStateAction<number[]>>;
}) {
  const isSuperSmall = useMediaQuery("(max-width: 520px)");
  const isMobile = useMediaQuery("(max-width: 635px)");
  const isTablet = useMediaQuery("(max-width: 925px)");
  const [drawerOpened, { open: openDrawer, close: closeDrawer }] =
    useDisclosure(false);
  const [drawerContents, setDrawerContents] = useState<
    bookingsData | undefined
  >(undefined);
  const [table, setTable] = useState("pending");

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
              <Table.Td>{booking.pickupAddr}</Table.Td>
              <Table.Td>{booking.requestVerification ? "Yes" : "No"}</Table.Td>
            </>
          )}
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

  return (
    <Paper bg={"primaryColor"} h={"80%"} p={"sm"} radius="lg" w={"90%"}>
      <EditTripsDrawer
        closeDrawer={closeDrawer}
        drawerContents={drawerContents}
        drawerOpened={drawerOpened}
      />
      <Stack h={"100%"}>
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
          onChange={setTable}
          value={table}
        />
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
