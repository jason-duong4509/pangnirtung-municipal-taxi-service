"use client";

import {
  Checkbox,
  Flex,
  Group,
  Input,
  Pagination,
  Paper,
  Select,
  Table,
  Text,
  TextInput,
} from "@mantine/core";
import { useDisclosure, useMediaQuery } from "@mantine/hooks";
import {
  type Dispatch,
  type JSX,
  type SetStateAction,
  useEffect,
  useState,
} from "react";
import { IMaskInput } from "react-imask";
import { showNotifications } from "~/lib/mantine-notifications-system";
import { api, type RouterOutputs } from "~/trpc/react";
import { UserRoles } from "~/types/types";
import TripLoading from "../../common/trips/trip-loading";
import EditUsersDrawer from "./edit-users-drawer";

enum TableColumnNames {
  ACCOUNT_NAME = "Name On Account",
  PHONE_NUM = "Primary Phone Number",
  RESIDENT = "Resident?",
  USER_ROLE = "User Role",
}

type usersData = RouterOutputs["users"]["getAll"]["data"][0];

export default function EditUsersTable({
  isSelecting,
  selectedRows,
  setSelectedRows,
}: {
  isSelecting: boolean;
  selectedRows: string[];
  setSelectedRows: Dispatch<SetStateAction<string[]>>;
}) {
  const [drawerOpened, { open: openDrawer, close: closeDrawer }] =
    useDisclosure(false);
  const [drawerContents, setDrawerContents] = useState<usersData | undefined>(
    undefined,
  );
  const [columnFilter, setColumnFilter] = useState<string | null>(null);
  const [filterKeyword, setFilterKeyword] = useState<string>("");
  const isTablet = useMediaQuery("(max-width: 690px)");
  const isPhone = useMediaQuery("(max-width: 480px)");
  const isSuperSmall = useMediaQuery("(max-width: 400px)");
  const [page, setPage] = useState(1);
  const [numberOfRows, setNumberOfRows] = useState(0);
  const [pageSize, setPageSize] = useState(0);

  const getUsersQuery = api.users.getAll.useQuery({
    pageNumber: page < 1 ? 1 : page,
    filter: { filter: columnFilter, filterKeyword: filterKeyword },
  });
  if (
    getUsersQuery.data?.total !== undefined &&
    getUsersQuery.data.total !== numberOfRows
  ) {
    setNumberOfRows(getUsersQuery.data.total);
  }
  if (
    getUsersQuery.data?.pageSize !== undefined &&
    getUsersQuery.data.pageSize !== pageSize
  ) {
    setPageSize(getUsersQuery.data.pageSize);
  }

  useEffect(() => {
    page;
    if (page > 0) {
      getUsersQuery.refetch();
    } else {
      setPage(1);
    }
  }, [getUsersQuery.refetch, page]);

  useEffect(() => {
    columnFilter;
    filterKeyword;
    setPage(0);
  }, [columnFilter, filterKeyword]);

  let usersList = [] as JSX.Element[];

  useEffect(() => {
    if (!getUsersQuery.isLoading && getUsersQuery.error) {
      showNotifications.error(
        getUsersQuery.error.message ??
          "An error occurred while fetching user data",
      );
    }
  }, [getUsersQuery.error, getUsersQuery.isLoading]);

  if (!getUsersQuery.isLoading && getUsersQuery.data) {
    for (const entry of getUsersQuery.data.data) {
      const user = entry["user"];
      const profile = entry["profile"];

      const row = (
        <Table.Tr
          bg={selectedRows.includes(user.id) ? "buttonColor" : undefined}
          key={user.id}
          onClick={() => {
            //Disable drawer open function if multi-select is enabled
            if (isSelecting) {
              //If row is clicked while multi-select is enabled, extend check
              //box onClick behavior
              if (selectedRows.includes(user.id)) {
                //Row has been checked
                //Uncheck the row
                setSelectedRows(
                  selectedRows.filter((position) => position !== user.id),
                );
              } else if (!selectedRows.includes(user.id)) {
                //Row has not been checked
                //Check the row
                setSelectedRows([...selectedRows, user.id]);
              }
              return;
            }
            setDrawerContents(entry);
            openDrawer();
          }}
          style={{ cursor: "pointer" }}
        >
          {isSelecting && (
            <Table.Td>
              <Checkbox
                aria-label="Select row"
                checked={selectedRows.includes(user.id)}
                color="black"
                onChange={(event) =>
                  setSelectedRows(
                    event.currentTarget.checked
                      ? [...selectedRows, user.id]
                      : selectedRows.filter((position) => position !== user.id),
                  )
                }
              />
            </Table.Td>
          )}
          <Table.Td>
            {user.name === "no-name-given.pang"
              ? ""
              : isTablet && user.name.length > 15
                ? `${user.name.slice(0, 12)}...`
                : user.name}
          </Table.Td>
          <Table.Td>{user.phoneNumber}</Table.Td>
          {!isSuperSmall && (
            <Table.Td>{profile.isResident ? "Yes" : "No"}</Table.Td>
          )}
          {!isPhone && <Table.Td>{user.role}</Table.Td>}
        </Table.Tr>
      );

      usersList = [...usersList, row];
    }
  }

  return (
    <Paper bg={"primaryColor"} h={"80%"} p={"sm"} radius="lg" w={"90%"}>
      <EditUsersDrawer
        closeDrawer={closeDrawer}
        drawerContents={drawerContents}
        drawerOpened={drawerOpened}
      />
      <Flex direction={"column"} h={"100%"}>
        <section>
          <Group grow>
            <Select
              aria-label="Column Filter"
              data={[
                TableColumnNames.ACCOUNT_NAME,
                TableColumnNames.PHONE_NUM,
                TableColumnNames.RESIDENT,
                TableColumnNames.USER_ROLE,
              ]}
              onChange={(value) => {
                setColumnFilter(value);
                setFilterKeyword("");
              }}
              placeholder="Select Column Filters"
              value={columnFilter}
            />
            {columnFilter === TableColumnNames.ACCOUNT_NAME && (
              <TextInput
                aria-label="Keyword filter"
                onChange={(event) =>
                  setFilterKeyword(event.currentTarget.value)
                }
                placeholder="Filter Keyword"
                value={filterKeyword}
              />
            )}
            {columnFilter === TableColumnNames.PHONE_NUM && (
              <Input
                component={IMaskInput}
                mask="(000) 000-0000"
                onChange={(event) =>
                  setFilterKeyword(event.currentTarget.value)
                }
                placeholder="Filter Keyword"
                value={filterKeyword}
              />
            )}
            {columnFilter === TableColumnNames.RESIDENT && (
              <Select
                aria-label="Is Resident Selection Menu"
                data={["Yes", "No"]}
                onChange={(value) => {
                  if (value) {
                    setFilterKeyword(value);
                  }
                }}
                placeholder="Yes/No"
                value={filterKeyword}
              />
            )}
            {columnFilter === TableColumnNames.USER_ROLE && (
              <Select
                aria-label="User Role Selection Menu"
                data={[UserRoles.ADMIN, UserRoles.DRIVER, UserRoles.MEMBER]}
                onChange={(value) => {
                  if (value) {
                    setFilterKeyword(value);
                  }
                }}
                placeholder="Role Selection"
                value={filterKeyword}
              />
            )}
          </Group>
        </section>
        <Table.ScrollContainer minWidth={0} style={{ flex: 1, minHeight: 0 }}>
          <Table highlightOnHover stickyHeader>
            <Table.Thead>
              <Table.Tr>
                {isSelecting && <Table.Th></Table.Th>}
                <Table.Th>Name On Account</Table.Th>
                <Table.Th>Primary Phone Number</Table.Th>
                {!isSuperSmall && <Table.Th>Resident?</Table.Th>}
                {!isPhone && <Table.Th>User Role</Table.Th>}
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>{usersList}</Table.Tbody>
          </Table>
          {getUsersQuery.isLoading && <TripLoading />}
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
      </Flex>
    </Paper>
  );
}
