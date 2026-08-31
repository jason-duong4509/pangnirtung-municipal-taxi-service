"use client";
import { Checkbox, Stack, Table, Text } from "@mantine/core";
import { type JSX, useState } from "react";
import { showNotifications } from "~/lib/mantine-notifications-system";
import type { RouterOutputs } from "~/server/api/root";
import { api } from "~/trpc/react";
import AlertPopup from "../common/alert/alert";

type verifiedResidents = RouterOutputs["bookings"]["complete"];

export default function ConfirmResidencyModal({
  trips,
  modalOpened,
  closeModal,
}: {
  trips: verifiedResidents;
  modalOpened: boolean;
  closeModal: () => void;
}) {
  const [selectedRows, setSelectedRows] = useState<number[]>([]); //Each element is a booking's ID
  const [isMutating, setIsMutating] = useState(false);

  const verifyResidentMutation = api.profile.verifyResident.useMutation({
    onSuccess: () => {
      showNotifications.success("Verification successful");
      setIsMutating(false);
      closeModal();
      setSelectedRows([]);
    },
    onError: (error) => {
      showNotifications.error(error.message);
      setIsMutating(false);
    },
  });

  if (trips.length === 0) {
    return;
  }

  let table = [] as JSX.Element[];

  for (const booking of trips) {
    const row = (
      <Table.Tr
        bg={selectedRows.includes(booking.id) ? "buttonColor" : undefined}
        key={booking.id}
        onClick={() => {
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
        }}
        style={{ cursor: "pointer" }}
      >
        <Table.Td>
          <Checkbox
            aria-label="Select row"
            checked={selectedRows.includes(booking.id)}
            color="black"
            onChange={(event) =>
              setSelectedRows(
                event.currentTarget.checked
                  ? [...selectedRows, booking.id]
                  : selectedRows.filter((position) => position !== booking.id),
              )
            }
          />
        </Table.Td>
        <Table.Td>{booking.name}</Table.Td>
        <Table.Td>{booking.pickupAddr}</Table.Td>
      </Table.Tr>
    );
    table = [...table, row];
  }

  const handleVerifyMutation = () => {
    if (selectedRows.length === 0) {
      showNotifications.error("No trips selected");
      return;
    }
    setIsMutating(true);
    verifyResidentMutation.mutate({
      bookingIds: selectedRows,
    });
  };
  return (
    <AlertPopup
      abortButtonText={"Skip All Users"}
      body={
        <Stack h={"60dvh"}>
          <Text>
            The following trips marked for completion also requested resident
            verification. Select which users to verify below
          </Text>
          <Table.ScrollContainer minWidth={0} style={{ flex: 1, minHeight: 0 }}>
            <Table highlightOnHover stickyHeader>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th></Table.Th>
                  <Table.Th>Name</Table.Th>
                  <Table.Th>Pick-up Address</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>{table}</Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        </Stack>
      }
      closeModal={closeModal}
      confirmButtonText={"Verify Selected Users"}
      hideCloseButton
      isLoading={isMutating}
      modalOpened={modalOpened}
      onConfirm={() => handleVerifyMutation()}
      titleText={"Confirm Residency"}
    />
  );
}
