"use client";

import { Text } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  SelectionIcon,
  SelectionSlashIcon,
  TrashIcon,
} from "@phosphor-icons/react";
import { type Dispatch, type SetStateAction, useState } from "react";
import { showNotifications } from "~/lib/mantine-notifications-system";
import { api } from "~/trpc/react";
import AlertPopup from "../../common/alert/alert";
import AsideButton from "../../common/appShell/aside-button";

export default function EditUsersAsideBar({
  isSelecting,
  expandAside,
  setIsSelecting,
  selectedRows,
  setSelectedRows,
}: {
  isSelecting: boolean;
  expandAside: boolean;
  setIsSelecting: Dispatch<SetStateAction<boolean>>;
  selectedRows: string[];
  setSelectedRows: Dispatch<SetStateAction<string[]>>;
}) {
  const [alertModalOpened, { open: openAlertModal, close: closeAlertModal }] =
    useDisclosure(false);
  const [isMutating, setIsMutating] = useState(false);

  const getUsersQuery = api.users.getAll.useQuery(undefined, {
    //Forces manual fetching
    enabled: false,
  });

  const deleteUsersMutation = api.users.delete.useMutation({
    onSuccess: () => {
      showNotifications.success("Deleted successfully");
      setIsMutating(false);
      getUsersQuery.refetch();
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
        body={<Text>All selected users will be deleted. Are you sure?</Text>}
        closeModal={closeAlertModal}
        confirmButtonText={"Confirm"}
        isLoading={isMutating}
        modalOpened={alertModalOpened}
        onConfirm={() => {
          setIsMutating(true);
          deleteUsersMutation.mutate({
            ids: selectedRows,
          });
        }}
        titleText={"Delete Users"}
      />
      <AsideButton
        buttonIcon={
          isSelecting ? (
            <SelectionSlashIcon size={20} />
          ) : (
            <SelectionIcon size={20} />
          )
        }
        buttonText={isSelecting ? "Deselect Users" : "Select Users"}
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
          buttonIcon={<TrashIcon size={20} />}
          buttonText={"Delete Users"}
          expandButton={expandAside}
          onClick={() => {
            if (selectedRows.length === 0) {
              showNotifications.error("No users selected");
              return;
            } else {
              openAlertModal();
            }
          }}
        />
      )}
    </>
  );
}
