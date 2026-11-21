"use client";

import {
  Center,
  Checkbox,
  Flex,
  Group,
  Pagination,
  Paper,
  SegmentedControl,
  Select,
  Table,
  Text,
  TextInput,
} from "@mantine/core";
import { useDisclosure, useMediaQuery } from "@mantine/hooks";
import { CheckCircleIcon, XCircleIcon } from "@phosphor-icons/react";
import {
  type Dispatch,
  type JSX,
  type SetStateAction,
  useEffect,
  useState,
} from "react";
import { dbTimeToPrettyString } from "~/lib/helpers";
import { showNotifications } from "~/lib/mantine-notifications-system";
import { api, type RouterOutputs } from "~/trpc/react";
import { RideCodeStatus } from "~/types/types";
import TripLoading from "../../common/trips/trip-loading";
import RideCodesModal from "./ride-codes-modal";

enum TableColumnNames {
  CODE = "Code",
  DISCOUNT = "Discount",
}

type rideCodesData = RouterOutputs["rideCodes"]["getAll"]["data"][0];

export default function ViewRideCodesTable({
  isSelecting,
  selectedRows,
  setSelectedRows,
  setTable,
  table,
}: {
  isSelecting: boolean;
  selectedRows: string[];
  setSelectedRows: Dispatch<SetStateAction<string[]>>;
  setTable: Dispatch<SetStateAction<RideCodeStatus>>;
  table: RideCodeStatus;
}) {
  const [modalOpened, { open: openDrawer, close: closeModal }] =
    useDisclosure(false);
  const [contents, setcontents] = useState<rideCodesData | undefined>(
    undefined,
  );
  const [columnFilter, setColumnFilter] = useState<string | null>(null);
  const [filterKeyword, setFilterKeyword] = useState<string>("");
  const removeHeaderText = useMediaQuery("(max-width: 700px)");
  const isTablet = useMediaQuery("(max-width: 480px)");
  const isPhone = useMediaQuery("(max-width: 400px)");
  const [page, setPage] = useState(1);
  const [numberOfRows, setNumberOfRows] = useState(0);
  const [pageSize, setPageSize] = useState(0);

  const getRideCodesQuery = api.rideCodes.getAll.useQuery({
    pageNumber: page < 1 ? 1 : page,
    filter: { filter: columnFilter, filterKeyword: filterKeyword },
    status: table,
  });
  if (
    getRideCodesQuery.data?.total !== undefined &&
    getRideCodesQuery.data.total !== numberOfRows
  ) {
    setNumberOfRows(getRideCodesQuery.data.total);
  }
  if (
    getRideCodesQuery.data?.pageSize !== undefined &&
    getRideCodesQuery.data.pageSize !== pageSize
  ) {
    setPageSize(getRideCodesQuery.data.pageSize);
  }

  useEffect(() => {
    page;
    if (page > 0) {
      getRideCodesQuery.refetch();
    } else {
      setPage(1);
    }
  }, [getRideCodesQuery.refetch, page]);

  useEffect(() => {
    columnFilter;
    filterKeyword;
    setPage(0);
  }, [columnFilter, filterKeyword]);

  let codesList = [] as JSX.Element[];

  useEffect(() => {
    if (!getRideCodesQuery.isLoading && getRideCodesQuery.error) {
      showNotifications.error(
        getRideCodesQuery.error.message ??
          "An error occurred while fetching ride codes",
      );
    }
  }, [getRideCodesQuery.error, getRideCodesQuery.isLoading]);

  if (!getRideCodesQuery.isLoading && getRideCodesQuery.data) {
    for (const entry of getRideCodesQuery.data.data) {
      const row = (
        <Table.Tr
          bg={selectedRows.includes(entry.code) ? "buttonColor" : undefined}
          key={entry.code}
          onClick={() => {
            //Disable drawer open function if multi-select is enabled
            if (isSelecting) {
              //If row is clicked while multi-select is enabled, extend check
              //box onClick behavior
              if (selectedRows.includes(entry.code)) {
                //Row has been checked
                //Uncheck the row
                setSelectedRows(
                  selectedRows.filter((position) => position !== entry.code),
                );
              } else if (!selectedRows.includes(entry.code)) {
                //Row has not been checked
                //Check the row
                setSelectedRows([...selectedRows, entry.code]);
              }
              return;
            }
            setcontents(entry);
            openDrawer();
          }}
          style={{ cursor: "pointer" }}
        >
          {isSelecting && (
            <Table.Td>
              <Checkbox
                aria-label="Select row"
                checked={selectedRows.includes(entry.code)}
                color="black"
                onChange={(event) =>
                  setSelectedRows(
                    event.currentTarget.checked
                      ? [...selectedRows, entry.code]
                      : selectedRows.filter(
                          (position) => position !== entry.code,
                        ),
                  )
                }
              />
            </Table.Td>
          )}

          <Table.Td>
            {entry.code.length > 15
              ? `${entry.code.slice(0, 12)}...`
              : entry.code}
          </Table.Td>
          <Table.Td>{entry.discount}% off</Table.Td>
          {!isPhone && (
            <Table.Td>{dbTimeToPrettyString(entry.updatedAt)}</Table.Td>
          )}
          {!isTablet && (
            <Table.Td>{dbTimeToPrettyString(entry.createdAt)}</Table.Td>
          )}
        </Table.Tr>
      );

      codesList = [...codesList, row];
    }
  }

  return (
    <Paper bg={"primaryColor"} h={"80%"} p={"sm"} radius="lg" w={"90%"}>
      <RideCodesModal
        closeModal={closeModal}
        contents={contents}
        modalOpened={modalOpened}
      />
      <Flex direction={"column"} h={"100%"}>
        <section>
          <Flex direction={isTablet ? "column" : "row"} gap={"md"}>
            <Group flex={1} grow>
              <Select
                aria-label="Column Filter"
                data={[TableColumnNames.CODE, TableColumnNames.DISCOUNT]}
                onChange={(value) => {
                  setColumnFilter(value);
                  setFilterKeyword("");
                }}
                placeholder="Select Column Filters"
                value={columnFilter}
              />
              {(columnFilter === TableColumnNames.CODE ||
                columnFilter === TableColumnNames.DISCOUNT) && (
                <TextInput
                  aria-label="Keyword filter"
                  onChange={(event) =>
                    setFilterKeyword(event.currentTarget.value)
                  }
                  placeholder="Filter Keyword"
                  value={filterKeyword}
                />
              )}
            </Group>
            <SegmentedControl
              data={[
                {
                  value: RideCodeStatus.ACTIVE,
                  label: (
                    <Center style={{ gap: 10 }}>
                      <CheckCircleIcon size={19} />
                      {!removeHeaderText && <Text>Active</Text>}
                    </Center>
                  ),
                },
                {
                  value: RideCodeStatus.EXPIRED,
                  label: (
                    <Center style={{ gap: 10 }}>
                      <XCircleIcon size={19} />
                      {!removeHeaderText && <Text>Expired</Text>}
                    </Center>
                  ),
                },
              ]}
              fullWidth
              onChange={(value) => {
                setTable(value as RideCodeStatus);
                setSelectedRows([]);
                setPage(1);
              }}
              value={table}
            />
          </Flex>
        </section>
        <Table.ScrollContainer minWidth={0} style={{ flex: 1, minHeight: 0 }}>
          <Table highlightOnHover stickyHeader>
            <Table.Thead>
              <Table.Tr>
                {isSelecting && <Table.Th></Table.Th>}
                <Table.Th>Code</Table.Th>
                <Table.Th>Discount</Table.Th>
                {!isPhone && <Table.Th>Updated At</Table.Th>}
                {!isTablet && <Table.Th>Created At</Table.Th>}
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>{codesList}</Table.Tbody>
          </Table>
          {getRideCodesQuery.isLoading && <TripLoading />}
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
