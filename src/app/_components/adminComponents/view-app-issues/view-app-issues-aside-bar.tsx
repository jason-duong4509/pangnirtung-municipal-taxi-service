"use client";
import { Button, Group, MultiSelect, Popover, Text } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { FunnelSimpleIcon, TrashIcon } from "@phosphor-icons/react";
import { type Dispatch, type SetStateAction, useState } from "react";
import { showNotifications } from "~/lib/mantine-notifications-system";
import { api } from "~/trpc/react";
import AlertPopup from "../../common/alert/alert";
import AsideButton from "../../common/appShell/aside-button";

export default function ViewAppIssuesAsideBar({
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
  const [alertModalOpened, { open: openAlertModal, close: closeAlertModal }] =
    useDisclosure(false);
  const [isMutating, setIsMutating] = useState(false);

  const getIssuesQuery = api.reportApp.get.useQuery(undefined, {
    //Forces manual fetching
    enabled: false,
  });

  const deleteIssuesMutation = api.reportApp.delete.useMutation({
    onSuccess: () => {
      showNotifications.success("Deleted successfully");
      setIsMutating(false);
      getIssuesQuery.refetch();
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
        body={<Text>All selected issues will be deleted. Are you sure?</Text>}
        closeModal={closeAlertModal}
        confirmButtonText={"Confirm"}
        isLoading={isMutating}
        modalOpened={alertModalOpened}
        onConfirm={() => {
          setIsMutating(true);
          deleteIssuesMutation.mutate({
            ids: selectedRows,
          });
        }}
        titleText={"Delete Issues"}
      />
      <Popover position="bottom" shadow="md" width={300} withArrow>
        <Popover.Target>
          <Button
            aria-label={"Filter Issues"}
            c="black"
            justify={expandAside ? "flex-start" : "center"}
            pb={0}
            pl={expandAside ? "xs" : 0}
            pr={0}
            pt={0}
            variant="white"
          >
            <Group gap={"xs"}>
              {<FunnelSimpleIcon size={20} />}
              {expandAside ? "Filter Issues" : undefined}
            </Group>
          </Button>
        </Popover.Target>
        <Popover.Dropdown>
          <MultiSelect
            comboboxProps={{ withinPortal: false }}
            data={["React", "Angular", "Vue", "Svelte"]}
            label="Your favorite libraries"
            placeholder="Pick values"
          />
        </Popover.Dropdown>
      </Popover>
      <AsideButton
        buttonIcon={
          isSelecting ? <TrashIcon size={20} /> : <TrashIcon size={20} />
        }
        buttonText={isSelecting ? "Confirm" : "Delete Issues"}
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
