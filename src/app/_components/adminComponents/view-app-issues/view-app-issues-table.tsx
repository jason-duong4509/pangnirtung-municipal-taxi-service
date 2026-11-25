"use client";

import {
  Badge,
  Box,
  Checkbox,
  Group,
  Pagination,
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
  const [page, setPage] = useState(1);
  const [numberOfRows, setNumberOfRows] = useState(0);
  const [pageSize, setPageSize] = useState(0);

  let issuesList = [] as JSX.Element[];
  let tags = [] as { name: string; color: string }[];

  const getTagsQuery = api.issueTag.getList.useQuery();

  const getIssuesQuery = api.reportApp.get.useQuery({
    pageNumber: page < 1 ? 1 : page,
    filters: issueFilters,
  });
  if (
    getIssuesQuery.data?.total !== undefined &&
    getIssuesQuery.data.total !== numberOfRows
  ) {
    setNumberOfRows(getIssuesQuery.data.total);
  }
  if (
    getIssuesQuery.data?.pageSize !== undefined &&
    getIssuesQuery.data.pageSize !== pageSize
  ) {
    setPageSize(getIssuesQuery.data.pageSize);
  }

  useEffect(() => {
    page;
    if (page > 0) {
      getIssuesQuery.refetch();
    } else {
      setPage(1);
    }
  }, [getIssuesQuery.refetch, page]);

  useEffect(() => {
    issueFilters;
    setPage(0);
  }, [issueFilters]);

  useEffect(() => {
    if (!getIssuesQuery.isLoading && getIssuesQuery.error) {
      showNotifications.error(
        getIssuesQuery.error.message ??
          "An error occurred while fetching issues",
      );
    }
  }, [getIssuesQuery.error, getIssuesQuery.isLoading]);

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

  if (!getIssuesQuery.isLoading && getIssuesQuery.data) {
    //For each issue, make a jsx element for it
    for (const issue of getIssuesQuery.data.data) {
      const tagsList = issue.appIssuesHasTags;
      let badges = [] as JSX.Element[];
      for (const tag of tagsList) {
        const tagInfo = tags.filter(
          (tagType) => tagType.name === tag.appIssuesTags.name,
        );
        if (tagInfo.length !== 1) {
          //Should only have one returned tag
          continue; //Skip this one if otherwise
        }
        badges = [
          ...badges,
          <Badge color={tagInfo[0]?.color} key={tagInfo[0]?.name}>
            {tagInfo[0]?.name}
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

      issuesList = [...issuesList, row];
    }
  }

  return (
    <Paper bg={"primaryColor"} h={"80%"} p={"sm"} radius="lg" w={"90%"}>
      <ViewAppIssuesDrawer
        closeDrawer={closeDrawer}
        drawerContents={drawerContents}
        drawerOpened={drawerOpened}
      />
      <Stack gap={0} h={"100%"}>
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
        <Group justify="flex-end">
          <Text size="sm">{`Showing ${numberOfRows === 0 ? 0 : pageSize * (page - 1) + 1} – ${Math.min(numberOfRows, pageSize * page)} of ${numberOfRows}`}</Text>
          <Pagination
            onChange={setPage}
            total={pageSize > 0 ? Math.ceil(numberOfRows / pageSize) : 1}
            value={page}
            withPages={false}
          />
        </Group>
      </Stack>
    </Paper>
  );
}
