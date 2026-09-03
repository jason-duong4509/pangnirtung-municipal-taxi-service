"use client";
import { Text } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  CheckSquareIcon,
  ListChecksIcon,
  SelectionIcon,
  SelectionSlashIcon,
  XSquareIcon,
} from "@phosphor-icons/react";
import { type Dispatch, type SetStateAction, useState } from "react";
import { showNotifications } from "~/lib/mantine-notifications-system";
import { api, type RouterOutputs } from "~/trpc/react";
import AlertPopup from "../../common/alert/alert";
import AsideButton from "../../common/appShell/aside-button";
import ConfirmResidencyModal from "../../driverComponents/confirm-residency-modal";

type verifiedResidents = RouterOutputs["bookings"]["complete"];

export default function EditTripsAsideBar({
  isSelecting,
  expandAside,
  setIsSelecting,
  selectedRows,
  setSelectedRows,
}: {
  isSelecting: boolean;
  expandAside: boolean;
  setIsSelecting: Dispatch<SetStateAction<boolean>>;
  selectedRows: number[];
  setSelectedRows: Dispatch<SetStateAction<number[]>>;
}) {
  const [alertBodyComponent, setAlertBodyComponent] = useState(
    <Text>Are you sure?</Text>,
  );
  const [alertModalOpened, { open: openAlertModal, close: closeAlertModal }] =
    useDisclosure(false);
  const [isMutating, setIsMutating] = useState(false);
  const [onModalSubmit, setOnModalSubmit] = useState<() => void>(() => {});
  const [alertTitleText, setAlertTitleText] = useState("Confirm Action");
  const [
    ConfirmResidencyModalOpened,
    { open: openConfirmResidencyModal, close: closeConfirmResidencyModal },
  ] = useDisclosure();
  const [confirmResidencyData, setConfirmResidencyData] =
    useState<verifiedResidents>([]);

  const getBookingsQuery = api.bookings.get.useQuery(undefined, {
    //Forces manual fetching
    enabled: false,
  });

  const completeBookingMutation = api.bookings.complete.useMutation({
    onSuccess: (requestedVerification) => {
      showNotifications.success("Completed successfully");
      setIsMutating(false);
      getBookingsQuery.refetch();
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

  const acceptBookingMutation = api.bookings.accept.useMutation({
    onSuccess: () => {
      showNotifications.success("Accepted successfully");
      setIsMutating(false);
      getBookingsQuery.refetch();
      closeAlertModal();
      setIsSelecting(false);
      setSelectedRows([]);
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
      closeAlertModal();
      setIsSelecting(false);
      setSelectedRows([]);
    },
    onError: (error) => {
      showNotifications.error(error.message);
      setIsMutating(false);
    },
  });

  return (
    <>
      <ConfirmResidencyModal
        closeModal={closeConfirmResidencyModal}
        modalOpened={ConfirmResidencyModalOpened}
        trips={confirmResidencyData}
      />
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
      {isSelecting && (
        <>
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
                  All selected trips will be accepted and marked as in progress.
                  Are you sure?
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
          <AsideButton
            buttonIcon={<ListChecksIcon size={20} />}
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
                  All selected trips will be marked as completed. Are you sure?
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
        </>
      )}
    </>
  );
}
