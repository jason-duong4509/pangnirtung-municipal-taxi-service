"use client";

import {
  Badge,
  Box,
  Checkbox,
  Paper,
  Rating,
  Stack,
  Table,
  Text,
} from "@mantine/core";
import { useDisclosure, useMediaQuery } from "@mantine/hooks";
import {
  type Dispatch,
  type JSX,
  type SetStateAction,
  useEffect,
  useState,
} from "react";
import { dbTimeToPrettyString } from "~/lib/helpers";
import { showNotifications } from "~/lib/mantine-notifications-system";
import { api } from "~/trpc/react";
import {
  PriorityRatingTypesString,
  ReportAppIssueChipTypes,
} from "~/types/types";
import TripLoading from "../../common/trips/trip-loading";
import ViewAppIssuesDrawer from "./view-app-issues-drawer";

export default function ViewAppIssuesTable({
  isSelecting,
  selectedRows,
  setSelectedRows,
  issueFilters,
}: {
  isSelecting: boolean;
  selectedRows: number[];
  setSelectedRows: Dispatch<SetStateAction<number[]>>;
  issueFilters: string[];
}) {
  const [drawerOpened, { open: openDrawer, close: closeDrawer }] =
    useDisclosure(false);
  const [drawerContents, setDrawerContents] = useState<any>(undefined);
  const isSuperSmall = useMediaQuery("(max-width: 450px)");
  const isMobile = useMediaQuery("(max-width: 500px)");
  const isTablet = useMediaQuery("(max-width: 650px)");

  let issuesList = [] as JSX.Element[];

  const getIssuesQuery = api.reportApp.get.useQuery();

  useEffect(() => {
    if (!getIssuesQuery.isLoading && getIssuesQuery.error) {
      showNotifications.error(
        getIssuesQuery.error.message ??
          "An error occurred while fetching issues",
      );
    }
  }, [getIssuesQuery.error, getIssuesQuery.isLoading]);

  if (!getIssuesQuery.isLoading && getIssuesQuery.data) {
    //Split filter array into priority ratings and tags
    let priorityFilters = [] as string[];
    let tagFilters = [] as string[];
    for (const filter of issueFilters) {
      if (PriorityRatingTypesString.includes(filter)) {
        //Priority rating
        priorityFilters = [...priorityFilters, filter];
      } else {
        tagFilters = [...tagFilters, filter];
      }
    }
    //For each issue, make a jsx element for it
    for (const issue of getIssuesQuery.data) {
      let matchedNoTag = true;
      const tagsList = issue.appIssuesHasTags;
      let badges = [] as JSX.Element[];
      for (const tag of tagsList) {
        if (tagFilters.includes(tag.appIssuesTags.name)) {
          matchedNoTag = false;
        }
        const tagInfo = ReportAppIssueChipTypes.filter(
          (tagType) => tagType.label === tag.appIssuesTags.name,
        );
        if (tagInfo.length !== 1) {
          //Should only have one returned tag
          showNotifications.error(
            `Could not generate tag ${tag.appIssuesTags.name} for issue ${issue.id}`,
          );
          continue; //Skip this one if otherwise
        }
        badges = [
          ...badges,
          <Badge color={tagInfo[0]!.chip_color} key={tagInfo[0]!.label}>
            {tagInfo[0]!.label}
          </Badge>,
        ];
      }

      //Put the issue in its own jsx element
      const row = (
        <Table.Tr
          bg={selectedRows.includes(issue.id) ? "buttonColor" : undefined}
          key={issue.id}
          onClick={() => {
            //Disable drawer open function if multi-delete is enabled
            if (isSelecting) {
              //If row is clicked while multi-delete is enabled, extend check
              //box onClick behavior
              if (selectedRows.includes(issue.id)) {
                //Row has been checked
                //Uncheck the row
                setSelectedRows(
                  selectedRows.filter((position) => position !== issue.id),
                );
              } else if (!selectedRows.includes(issue.id)) {
                //Row has not been checked
                //Check the row
                setSelectedRows([...selectedRows, issue.id]);
              }
              return;
            }
            setDrawerContents(issue);
            openDrawer();
          }}
          style={{ cursor: "pointer" }}
        >
          {isSelecting && (
            <Table.Td>
              <Checkbox
                aria-label="Select row"
                checked={selectedRows.includes(issue.id)}
                color="black"
                onChange={(event) =>
                  setSelectedRows(
                    event.currentTarget.checked
                      ? [...selectedRows, issue.id]
                      : selectedRows.filter(
                          (position) => position !== issue.id,
                        ),
                  )
                }
              />
            </Table.Td>
          )}

          <Table.Td>
            <Box
              maw={
                isSuperSmall
                  ? "35vw"
                  : isMobile
                    ? "30vw"
                    : isTablet
                      ? "20vw"
                      : "30vw"
              }
            >
              <Text truncate="end">
                {issue.title !== "" ? issue.title : issue.comments}
              </Text>
            </Box>
          </Table.Td>
          {!isMobile && (
            <Table.Td>{dbTimeToPrettyString(issue.createdAt)}</Table.Td>
          )}
          {!isSuperSmall && (
            <Table.Td>
              <Rating readOnly value={issue.priority} />
            </Table.Td>
          )}
          <Table.Td>{badges}</Table.Td>
        </Table.Tr>
      );

      const noFiltersSelected = issueFilters.length === 0;
      const matchesPriorityFilters = priorityFilters.includes(
        `${issue.priority}`,
      );
      const priorityFiltersEmpty = priorityFilters.length === 0;
      const matchesTagFilters = !matchedNoTag;
      const tagFiltersEmpty = tagFilters.length === 0;
      if (
        noFiltersSelected ||
        (tagFiltersEmpty && matchesPriorityFilters) ||
        (priorityFiltersEmpty && matchesTagFilters) ||
        (matchesPriorityFilters && matchesTagFilters)
      ) {
        issuesList = [...issuesList, row];
      }
    }
  }

  return (
    <Paper bg={"primaryColor"} h={"80%"} p={"sm"} radius="lg" w={"90%"}>
      <ViewAppIssuesDrawer
        closeDrawer={closeDrawer}
        drawerContents={drawerContents}
        drawerOpened={drawerOpened}
      />
      <Stack h={"100%"}>
        <Table.ScrollContainer minWidth={0} style={{ flex: 1, minHeight: 0 }}>
          <Table highlightOnHover stickyHeader>
            <Table.Thead>
              <Table.Tr>
                {isSelecting && <Table.Th></Table.Th>}
                <Table.Th>Title</Table.Th>
                {!isMobile && <Table.Th>Created On</Table.Th>}
                {!isSuperSmall && <Table.Th>Priority</Table.Th>}
                <Table.Th>Tags</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>{issuesList}</Table.Tbody>
          </Table>
          {getIssuesQuery.isLoading && <TripLoading />}
        </Table.ScrollContainer>
      </Stack>
    </Paper>
  );
}
