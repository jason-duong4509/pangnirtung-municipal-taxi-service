"use client";
import { Text } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  CheckIcon,
  SelectionIcon,
  SelectionSlashIcon,
  XIcon,
} from "@phosphor-icons/react";
import { type Dispatch, type SetStateAction, useState } from "react";
import { showNotifications } from "~/lib/mantine-notifications-system";
import { api } from "~/trpc/react";
import { RideCodeStatus } from "~/types/types";
import AlertPopup from "../../common/alert/alert";
import AsideButton from "../../common/appShell/aside-button";

export default function RideCodesAsideBar({
  isSelecting,
  expandAside,
  setIsSelecting,
  selectedRows,
  setSelectedRows,
  table,
}: {
  isSelecting: boolean;
  expandAside: boolean;
  setIsSelecting: Dispatch<SetStateAction<boolean>>;
  selectedRows: string[];
  setSelectedRows: Dispatch<SetStateAction<string[]>>;
  table: RideCodeStatus;
}) {
  const [alertModalOpened, { open: openAlertModal, close: closeAlertModal }] =
    useDisclosure(false);
  const [isMutating, setIsMutating] = useState(false);
  const utils = api.useUtils();

  const updateRideCodeMutation = api.rideCodes.update.useMutation({
    onSuccess: (data) => {
      if (data && data.warning) {
        showNotifications.warning(data.warning);
      } else {
        showNotifications.success("Codes updated");
      }
      setIsMutating(false);
      void utils.rideCodes.getAll.invalidate();
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
      <AlertPopup
        abortButtonText={"Back"}
        body={
          <Text>
            All selected codes will be{" "}
            {table === RideCodeStatus.ACTIVE ? "deactivated" : "activated"}. Are
            you sure?
          </Text>
        }
        closeModal={closeAlertModal}
        confirmButtonText={"Confirm"}
        isLoading={isMutating}
        modalOpened={alertModalOpened}
        onConfirm={() => {
          setIsMutating(true);
          if (!isMutating) {
            updateRideCodeMutation.mutate({
              codes: selectedRows,
              deactivate: table === RideCodeStatus.ACTIVE,
            });
          }
        }}
        titleText={`${table === RideCodeStatus.ACTIVE ? "Deactivate" : "Activate"} codes`}
      />
      <AsideButton
        buttonIcon={
          isSelecting ? (
            <SelectionSlashIcon size={20} />
          ) : (
            <SelectionIcon size={20} />
          )
        }
        buttonText={`${isSelecting ? "Deselect" : "Select"} Codes`}
        expandButton={expandAside}
        onClick={() => {
          setIsSelecting(!isSelecting);
          if (isSelecting) {
            setSelectedRows([]);
          }
        }}
      />
      {isSelecting && (
        <AsideButton
          buttonIcon={
            table === RideCodeStatus.ACTIVE ? (
              <XIcon size={20} />
            ) : (
              <CheckIcon size={20} />
            )
          }
          buttonText={`${table === RideCodeStatus.ACTIVE ? "Deactivate" : "Activate"} codes`}
          expandButton={expandAside}
          onClick={() => {
            if (selectedRows.length === 0) {
              showNotifications.error("No codes selected");
            } else {
              //Is selecting and rows have been selected
              openAlertModal();
            }
          }}
        />
      )}
    </>
  );
}
