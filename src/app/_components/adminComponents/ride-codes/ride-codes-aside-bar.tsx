"use client";
import { Text } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  CheckCircleIcon,
  CheckIcon,
  XCircleIcon,
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
    onSuccess: () => {
      showNotifications.success("Codes updated");
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
          updateRideCodeMutation.mutate({
            codes: selectedRows,
            deactivate: table === RideCodeStatus.ACTIVE,
          });
        }}
        titleText={`${table === RideCodeStatus.ACTIVE ? "Deactivate" : "Activate"} codes`}
      />
      <AsideButton
        buttonIcon={
          isSelecting ? (
            table === RideCodeStatus.ACTIVE ? (
              <XCircleIcon size={20} />
            ) : (
              <CheckCircleIcon size={20} />
            )
          ) : table === RideCodeStatus.ACTIVE ? (
            <XIcon size={20} />
          ) : (
            <CheckIcon size={20} />
          )
        }
        buttonText={
          isSelecting
            ? "Confirm"
            : `${table === RideCodeStatus.ACTIVE ? "Deactivate" : "Activate"} codes`
        }
        expandButton={expandAside}
        onClick={() => {
          if (!isSelecting || selectedRows.length === 0) {
            setIsSelecting(!isSelecting);
          } else {
            //Is selecting and rows have been selected
            openAlertModal();
          }
        }}
      />
    </>
  );
}
