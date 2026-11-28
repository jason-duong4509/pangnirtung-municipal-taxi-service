"use client";
import {
  Badge,
  Button,
  Group,
  MultiSelect,
  Popover,
  Rating,
  Stack,
  Text,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  FunnelSimpleIcon,
  SelectionIcon,
  SelectionSlashIcon,
  TrashSimpleIcon,
} from "@phosphor-icons/react";
import { type Dispatch, type SetStateAction, useEffect, useState } from "react";
import { showNotifications } from "~/lib/mantine-notifications-system";
import { api } from "~/trpc/react";
import { PriorityRatingTypesString } from "~/types/types";
import AlertPopup from "../../common/alert/alert";
import AsideButton from "../../common/appShell/aside-button";

export default function ViewAppIssuesAsideBar({
  isSelecting,
  expandAside,
  setIsSelecting,
  selectedRows,
  setSelectedRows,
  setIssuesTableFilters,
  issueFilters,
}: {
  isSelecting: boolean;
  expandAside: boolean;
  setIsSelecting: Dispatch<SetStateAction<boolean>>;
  selectedRows: number[];
  setSelectedRows: Dispatch<SetStateAction<number[]>>;
  setIssuesTableFilters: Dispatch<SetStateAction<string[]>>;
  issueFilters: string[];
}) {
  const [alertModalOpened, { open: openAlertModal, close: closeAlertModal }] =
    useDisclosure(false);
  const [isMutating, setIsMutating] = useState(false);
  const [pickedFilters, setPickedFilters] = useState<string[]>([]);
  const [popoverOpened, setPopoverOpened] = useState(false);
  const utils = api.useUtils();

  let tags = [] as { name: string; color: string }[];

  const getTagsQuery = api.issueTag.getList.useQuery();

  useEffect(() => {
    if (!getTagsQuery.isLoading && getTagsQuery.error) {
      showNotifications.error(
        getTagsQuery.error.message ??
          "An error occurred while fetching issue tags",
      );
    }
  }, [getTagsQuery.error, getTagsQuery.isLoading]);

  if (!getTagsQuery.isLoading && getTagsQuery.data) {
    for (const tag of getTagsQuery.data) {
      tags = [
        ...tags,
        {
          name: tag.name,
          color: tag.colorHex,
        },
      ];
    }
  }

  const deleteIssuesMutation = api.reportApp.delete.useMutation({
    onSuccess: () => {
      showNotifications.success("Deleted successfully");
      setIsMutating(false);
      void utils.reportApp.get.invalidate();
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
      <Popover
        onChange={setPopoverOpened}
        onClose={() => setPickedFilters([])}
        onOpen={() => setPickedFilters(issueFilters)}
        opened={popoverOpened}
        position="bottom"
        shadow="md"
        width={300}
        withArrow
      >
        <Popover.Target>
          <Button
            aria-label={"Filter Issues"}
            c="black"
            justify={expandAside ? "flex-start" : "center"}
            onClick={() => setPopoverOpened(!popoverOpened)}
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
          <Stack>
            <MultiSelect
              clearable
              comboboxProps={{ withinPortal: false }}
              data={[
                { group: "Priority Ratings", items: PriorityRatingTypesString },
                {
                  group: "Tags",
                  items: tags.map((chipType) => chipType.name),
                },
              ]}
              label="Filter Issues by Tag or Priority"
              onChange={(values) => setPickedFilters(values)}
              placeholder="Pick Filters"
              renderOption={({ option }) => {
                if (PriorityRatingTypesString.includes(option.value)) {
                  //Render priority components
                  return (
                    <Rating
                      defaultValue={Number(option.value)}
                      key={option.value}
                      readOnly
                    />
                  );
                } else {
                  //Render tag components
                  let badgeColor = "blue";
                  for (const chipType of tags) {
                    if (chipType.name === option.value) {
                      badgeColor = chipType.color;
                    }
                  }
                  return (
                    <Badge color={badgeColor} key={option.value}>
                      {option.value}
                    </Badge>
                  );
                }
              }}
              value={pickedFilters}
            />
            <Button
              c={"black"}
              color="buttonColor"
              onClick={() => {
                setIssuesTableFilters(pickedFilters);
                setPopoverOpened(false);
              }}
              p={0}
              size="compact-sm"
              type="button"
              variant="filled"
            >
              Filter
            </Button>
          </Stack>
        </Popover.Dropdown>
      </Popover>
      <AsideButton
        buttonIcon={
          isSelecting ? (
            <SelectionSlashIcon size={20} />
          ) : (
            <SelectionIcon size={20} />
          )
        }
        buttonText={`${isSelecting ? "Deselect" : "Select"} Issues`}
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
          buttonIcon={<TrashSimpleIcon size={20} />}
          buttonText={"Delete Issues"}
          expandButton={expandAside}
          onClick={() => {
            if (selectedRows.length === 0) {
              showNotifications.error("No issues selected");
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
