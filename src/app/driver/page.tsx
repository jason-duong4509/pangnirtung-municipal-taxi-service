"use client";
import {
  AppShell,
  Button,
  Checkbox,
  Drawer,
  Group,
  Paper,
  Skeleton,
  Stack,
  Table,
  Text,
  TextInput,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useDisclosure, useMediaQuery } from "@mantine/hooks";
import {
  CheckSquareIcon,
  SelectionIcon,
  SelectionSlashIcon,
  XSquareIcon,
} from "@phosphor-icons/react";
import { type JSX, useEffect, useState } from "react";
import { dbTimeToPrettyString, formatString } from "~/lib/helpers";
import { showNotifications } from "~/lib/mantine-notifications-system";
import type { RouterOutputs } from "~/server/api/root";
import { api } from "~/trpc/react";
import { BookingStatus } from "~/types/types";
import AlertPopup from "../_components/common/alert/alert";
import CustomAppShell from "../_components/common/appShell/app-shell";
import AsideButton from "../_components/common/appShell/aside-button";
import NavbarHeader from "../_components/common/appShell/navbar-header";
import NavbarOption from "../_components/common/appShell/navbar-option";
import ReportAppIssueModal from "../_components/common/reportAppIssue/report-app-issue";
import ConfirmResidencyModal from "../_components/driverComponents/confirm-residency-modal";

type verifiedResidents = RouterOutputs["bookings"]["complete"];

export default function DriverPage() {
  const [viewPendingTrips, setViewPendingTrips] = useState(false);
  const [viewAcceptedTrips, setViewAcceptedTrips] = useState(true);
  const [reportAppOpened, { open: openReportApp, close: closeReportApp }] =
    useDisclosure();
  const [
    ConfirmResidencyModalOpened,
    { open: openConfirmResidencyModal, close: closeConfirmResidencyModal },
  ] = useDisclosure();
  const [expandAside, setExpandAside] = useState(false);
  const [selectedRows, setSelectedRows] = useState<number[]>([]); //Each element is a booking's ID
  const [drawerOpened, { open: openDrawer, close: closeDrawer }] =
    useDisclosure(false);
  const [alertModalOpened, { open: openAlertModal, close: closeAlertModal }] =
    useDisclosure(false);
  const [isSelecting, setIsSelecting] = useState(false);
  const [isMutating, setIsMutating] = useState(false);
  const [onModalSubmit, setOnModalSubmit] = useState<() => void>(() => {});
  const isTablet = useMediaQuery("(max-width: 750px)");
  const isMobile = useMediaQuery("(max-width: 620px)");
  const isPhone = useMediaQuery("(max-width: 550px)");
  const [alertTitleText, setAlertTitleText] = useState("Confirm Action");
  const [alertBodyComponent, setAlertBodyComponent] = useState(
    <Text>Are you sure?</Text>,
  );
  const [confirmResidencyData, setConfirmResidencyData] =
    useState<verifiedResidents>([]);

  //--Holds all bookings, separated into 4 tables--
  let pendingBookings = [] as JSX.Element[];
  let acceptedBookings = [] as JSX.Element[];
  //-----------------------------------------------

  //Configure form
  const form = useForm<{
    pickupTime: Date;
    pickupAddr: string;
    destAddr: string;
    name: string;
    reasonForTrip: string;
    paymentMethod: string;
    id: number;
    createdAt: Date;
    updatedAt: Date;
    verificationRequested: boolean;
  }>({
    mode: "uncontrolled",
  });

  const getBookingsQuery = api.bookings.get.useQuery(undefined, {
    //Ensure that the query automatically runs but does so exactly once
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const acceptBookingMutation = api.bookings.accept.useMutation({
    onSuccess: () => {
      showNotifications.success("Accepted successfully");
      setIsMutating(false);
      getBookingsQuery.refetch();
      closeDrawer();
      closeAlertModal();
      setIsSelecting(false);
      setSelectedRows([]);
    },
    onError: (error) => {
      showNotifications.error(error.message);
      setIsMutating(false);
    },
  });

  const completeBookingMutation = api.bookings.complete.useMutation({
    onSuccess: (requestedVerification) => {
      showNotifications.success("Completed successfully");
      setIsMutating(false);
      getBookingsQuery.refetch();
      closeDrawer();
      setIsSelecting(false);
      setSelectedRows([]);
      closeAlertModal();
      if (requestedVerification.length !== 0) {
        //Someone requested verification
        setConfirmResidencyData(requestedVerification);
        openConfirmResidencyModal();
      }
    },
    onError: (error) => {
      showNotifications.error(error.message);
      setIsMutating(false);
    },
  });

  const cancelBookingMutation = api.bookings.cancel.useMutation({
    onSuccess: () => {
      showNotifications.success("Cancelled successfully");
      setIsMutating(false);
      getBookingsQuery.refetch();
      closeDrawer();
      closeAlertModal();
      setIsSelecting(false);
      setSelectedRows([]);
    },
    onError: (error) => {
      showNotifications.error(error.message);
      setIsMutating(false);
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
            //Disable drawer open function if driver is selecting trips
            if (isSelecting) {
              //If row is clicked while select function is enabled, extend check-
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

            //Put the bookings data in the mantine form
            form.setValues({
              pickupTime: booking.pickupTime,
              pickupAddr: booking.pickupAddr,
              destAddr: booking.destAddr,
              name: booking.name,
              reasonForTrip: booking.tripReason,
              paymentMethod: formatString(booking.payment),
              id: booking.id,
              createdAt: booking.createdAt,
              updatedAt: booking.updatedAt,
              verificationRequested: booking.requestVerification,
            });

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
          <Table.Td>{booking.pickupAddr}</Table.Td>
          <Table.Td>{booking.destAddr}</Table.Td>
          {!isPhone && <Table.Td>{formatString(booking.payment)}</Table.Td>}
          {!isMobile && (
            <Table.Td>{booking.requestVerification ? "Yes" : "No"}</Table.Td>
          )}
          {!isTablet && <Table.Td>{booking.tripReason}</Table.Td>}
        </Table.Tr>
      );

      //Put the row in pending or accepted tables
      if (booking.status === BookingStatus.PENDING) {
        pendingBookings = [...pendingBookings, row];
      } else if (booking.status === BookingStatus.IN_PROGRESS) {
        acceptedBookings = [...acceptedBookings, row];
      }
    }
  }

  return (
    <>
      <aside>
        <ConfirmResidencyModal
          closeModal={closeConfirmResidencyModal}
          modalOpened={ConfirmResidencyModalOpened}
          trips={confirmResidencyData}
        />
        <ReportAppIssueModal
          closeModal={closeReportApp}
          modalOpened={reportAppOpened}
        />
        <AlertPopup
          abortButtonText={"Back"}
          body={alertBodyComponent}
          closeModal={closeAlertModal}
          confirmButtonText={"Confirm"}
          isLoading={isMutating}
          modalOpened={alertModalOpened}
          onConfirm={() => onModalSubmit()}
          titleText={alertTitleText}
        />
        <Drawer
          offset={8}
          onClose={closeDrawer}
          opened={drawerOpened}
          radius="md"
          styles={{ body: { paddingBottom: 0 } }}
          title={"View Trip"}
        >
          <Stack h={"calc(100dvh - 90px)"}>
            <TextInput
              defaultValue={form.values.id}
              label="Booking ID"
              readOnly
              variant="unstyled"
            />
            <TextInput
              defaultValue={form.values.name}
              label="Name"
              readOnly
              variant="unstyled"
            />
            <TextInput
              defaultValue={dbTimeToPrettyString(form.values.pickupTime)}
              label="Pick-up Time"
              readOnly
              variant="unstyled"
            />
            <TextInput
              defaultValue={form.values.pickupAddr}
              label="Pick-up Address"
              readOnly
              variant="unstyled"
            />
            <TextInput
              defaultValue={form.values.destAddr}
              label="Destination Address"
              readOnly
              variant="unstyled"
            />
            <TextInput
              defaultValue={form.values.verificationRequested ? "Yes" : "No"}
              label="Resident Verification Requested?"
              readOnly
              variant="unstyled"
            />
            <TextInput
              defaultValue={form.values.reasonForTrip}
              label="Reason for Trip"
              readOnly
              variant="unstyled"
            />
            <TextInput
              defaultValue={form.values.paymentMethod}
              label="Payment Method"
              readOnly
              variant="unstyled"
            />
            <TextInput
              defaultValue={dbTimeToPrettyString(form.values.createdAt)}
              label="Created At"
              readOnly
              variant="unstyled"
            />
            <TextInput
              defaultValue={dbTimeToPrettyString(form.values.updatedAt)}
              label="Updated At"
              readOnly
              variant="unstyled"
            />
            <Stack bottom={"0%"} flex={1} justify="flex-end" pos={"sticky"}>
              <Group bg={"primaryColor"} grow py={"md"}>
                {viewAcceptedTrips && (
                  <Button
                    c={"black"}
                    color="buttonColor"
                    onClick={() => {
                      openAlertModal();
                      setAlertTitleText("Cancel trip");
                      setAlertBodyComponent(<Text>Are you sure?</Text>);
                      setOnModalSubmit(() => () => {
                        setIsMutating(true);
                        cancelBookingMutation.mutate({
                          bookingIds: [form.values.id],
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
                )}
                <Button
                  c={"black"}
                  color="buttonColor"
                  onClick={() => {
                    openAlertModal();
                    setAlertBodyComponent(<Text>Are you sure?</Text>);
                    if (viewAcceptedTrips) {
                      setAlertTitleText("Complete trip");
                      setOnModalSubmit(() => () => {
                        setIsMutating(true);
                        completeBookingMutation.mutate({
                          bookingIds: [form.values.id],
                        });
                      });
                    } else {
                      setAlertTitleText("Accept trip");
                      setOnModalSubmit(() => () => {
                        setIsMutating(true);
                        acceptBookingMutation.mutate({
                          bookingIds: [form.values.id],
                        });
                      });
                    }
                  }}
                  p={0}
                  size="compact-sm"
                  type="button"
                  variant="filled"
                >
                  {viewAcceptedTrips ? "Complete Trip" : "Accept Trip"}
                </Button>
              </Group>
            </Stack>
          </Stack>
        </Drawer>
      </aside>
      <main>
        <CustomAppShell
          asideComponent={
            <>
              <AsideButton
                buttonIcon={
                  isSelecting ? (
                    <SelectionSlashIcon size={20} />
                  ) : (
                    <SelectionIcon size={20} />
                  )
                }
                buttonText={isSelecting ? "Deselect Trips" : "Select Trips"}
                expandButton={expandAside}
                onClick={() => {
                  setIsSelecting(!isSelecting);
                  if (isSelecting) {
                    setSelectedRows([]);
                  }
                }}
              />
              {viewAcceptedTrips && isSelecting && (
                <>
                  <AsideButton
                    buttonIcon={<CheckSquareIcon size={20} />}
                    buttonText={"Complete Trips"}
                    expandButton={expandAside}
                    onClick={() => {
                      if (selectedRows.length === 0) {
                        showNotifications.error("No trips selected");
                        return;
                      }
                      openAlertModal();
                      setAlertTitleText("Complete trips");
                      setAlertBodyComponent(
                        <Text>
                          All selected trips will be marked as completed. Are
                          you sure?
                        </Text>,
                      );
                      setOnModalSubmit(() => () => {
                        setIsMutating(true);
                        completeBookingMutation.mutate({
                          bookingIds: selectedRows,
                        });
                      });
                    }}
                  />
                  <AsideButton
                    buttonIcon={<XSquareIcon size={20} />}
                    buttonText={"Cancel Trips"}
                    expandButton={expandAside}
                    onClick={() => {
                      if (selectedRows.length === 0) {
                        showNotifications.error("No trips selected");
                        return;
                      }
                      openAlertModal();
                      setAlertTitleText("Cancel trips");
                      setAlertBodyComponent(
                        <Text>
                          All selected trips will be cancelled. Are you sure?
                        </Text>,
                      );
                      setOnModalSubmit(() => () => {
                        setIsMutating(true);
                        cancelBookingMutation.mutate({
                          bookingIds: selectedRows,
                        });
                      });
                    }}
                  />
                </>
              )}
              {viewPendingTrips && isSelecting && (
                <AsideButton
                  buttonIcon={<CheckSquareIcon size={20} />}
                  buttonText={"Accept Trips"}
                  expandButton={expandAside}
                  onClick={() => {
                    if (selectedRows.length === 0) {
                      showNotifications.error("No trips selected");
                      return;
                    }
                    openAlertModal();
                    setAlertTitleText("Accept trips");
                    setAlertBodyComponent(
                      <Text>
                        All selected trips will be accepted. Are you sure?
                      </Text>,
                    );
                    setOnModalSubmit(() => () => {
                      setIsMutating(true);
                      acceptBookingMutation.mutate({
                        bookingIds: selectedRows,
                      });
                    });
                  }}
                />
              )}
            </>
          }
          expandAside={expandAside}
          headerText={
            isMobile
              ? `${viewAcceptedTrips ? "Accepted Trips" : "Pending Trips"}`
              : `Municipal Taxi Service ${viewAcceptedTrips ? "- Accepted Trips" : "- Pending Trips"}`
          }
          mainComponent={
            <Paper bg={"primaryColor"} h={"80%"} p={"sm"} radius="lg" w={"90%"}>
              <Stack h={"100%"}>
                <Table.ScrollContainer
                  minWidth={0}
                  style={{ flex: 1, minHeight: 0 }}
                >
                  <Table highlightOnHover stickyHeader>
                    <Table.Thead>
                      <Table.Tr>
                        {isSelecting && <Table.Th>Select?</Table.Th>}
                        <Table.Th>Pick-up Time</Table.Th>
                        <Table.Th>Pick-up Address</Table.Th>
                        <Table.Th>Destination</Table.Th>
                        {!isPhone && <Table.Th>Payment Method</Table.Th>}
                        {!isMobile && (
                          <Table.Th>Requested Verification?</Table.Th>
                        )}
                        {!isTablet && <Table.Th>Reason for Trip</Table.Th>}
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {viewAcceptedTrips && acceptedBookings}
                      {viewPendingTrips && pendingBookings}
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
          }
          navbarComponent={
            <Stack>
              <AppShell.Section>
                <NavbarHeader text={"Trips"} />
                <NavbarOption
                  onClick={() => {
                    setViewAcceptedTrips(true);
                    setViewPendingTrips(false);
                    setSelectedRows([]);
                  }}
                  text={"Accepted Trips"}
                />
                <NavbarOption
                  onClick={() => {
                    setViewAcceptedTrips(false);
                    setViewPendingTrips(true);
                    setSelectedRows([]);
                  }}
                  text={"Pending Trips"}
                />
              </AppShell.Section>
              <AppShell.Section>
                <NavbarHeader text={"Account"} />
                <NavbarOption onClick={() => {}} text={"Manage Account"} />
                <NavbarOption onClick={() => {}} text={"Log Out"} />
              </AppShell.Section>
              <AppShell.Section>
                <NavbarHeader text={"Miscellaneous"} />
                <NavbarOption
                  onClick={openReportApp}
                  text={"Report App Issue"}
                />
              </AppShell.Section>
            </Stack>
          }
          setExpandAside={setExpandAside}
        />
      </main>
    </>
  );
}
