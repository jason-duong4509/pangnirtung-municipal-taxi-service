"use client";

import {
  Checkbox,
  Flex,
  Group,
  Input,
  Paper,
  Select,
  Table,
  TextInput,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  type Dispatch,
  type JSX,
  type SetStateAction,
  useEffect,
  useState,
} from "react";
import { IMaskInput } from "react-imask";
import { showNotifications } from "~/lib/mantine-notifications-system";
import { api } from "~/trpc/react";
import { UserRoles } from "~/types/types";
import TripLoading from "../../common/trips/trip-loading";
import EditUsersDrawer from "./edit-users-drawer";

enum TableColumnNames {
  ACCOUNT_NAME = "Name On Account",
  PHONE_NUM = "Primary Phone Number",
  RESIDENT = "Resident?",
  USER_ROLE = "User Role",
}

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
  const [drawerContents, setDrawerContents] = useState<any>(undefined);
  const [columnFilter, setColumnFilter] = useState<string | null>(null);
  const [filterKeyword, setFilterKeyword] = useState<string>("");

  const getUsersQuery = api.users.getAll.useQuery();

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
    for (const user of getUsersQuery.data) {
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
            setDrawerContents(user);
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
          <Table.Td>{user.name}</Table.Td>
          <Table.Td>{user.phoneNumber}</Table.Td>
          <Table.Td>USER RESIDENCY STATUS NOT ADDED</Table.Td>
          <Table.Td>{user.role}</Table.Td>
        </Table.Tr>
      );

      const noFilterSet = columnFilter === null;
      const nameMatch =
        columnFilter === TableColumnNames.ACCOUNT_NAME &&
        user.name.toLowerCase().includes(filterKeyword.toLowerCase());
      const phoneNumMatch =
        columnFilter === TableColumnNames.PHONE_NUM &&
        user.phoneNumber?.toLowerCase().includes(filterKeyword.toLowerCase());
      const residentMatch = columnFilter === TableColumnNames.RESIDENT && true; //todo: add residency status
      const userRoleMatch =
        columnFilter === TableColumnNames.USER_ROLE &&
        user.role.toLowerCase().includes(filterKeyword.toLowerCase());
      if (
        noFilterSet ||
        nameMatch ||
        phoneNumMatch ||
        residentMatch ||
        userRoleMatch
      ) {
        usersList = [...usersList, row];
      }
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
                <Table.Th>Resident?</Table.Th>
                <Table.Th>User Role</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>{usersList}</Table.Tbody>
          </Table>
          {getUsersQuery.isLoading && <TripLoading />}
        </Table.ScrollContainer>
      </Flex>
    </Paper>
  );
}
