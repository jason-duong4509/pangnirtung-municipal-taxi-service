"use client";
import { AppShell, Paper, Stack, Table } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  CheckSquareIcon,
  SelectionIcon,
  XSquareIcon,
} from "@phosphor-icons/react";
import { useState } from "react";
import CustomAppShell from "../_components/common/appShell/app-shell";
import AsideButton from "../_components/common/appShell/aside-button";
import NavbarHeader from "../_components/common/appShell/navbar-header";
import NavbarOption from "../_components/common/appShell/navbar-option";
import ReportAppIssueModal from "../_components/common/reportAppIssue/report-app-issue";

export default function DriverPage() {
  const [viewPendingTrips, setViewPendingTrips] = useState(false);
  const [viewAcceptedTrips, setViewAcceptedTrips] = useState(true);
  const [reportAppOpened, { open: openReportApp, close: closeReportApp }] =
    useDisclosure();
  const [expandAside, setExpandAside] = useState(false);

  return (
    <>
      <aside>
        <ReportAppIssueModal
          closeModal={closeReportApp}
          modalOpened={reportAppOpened}
        />
      </aside>
      <main>
        <CustomAppShell
          asideComponent={
            <>
              <AsideButton
                buttonIcon={<SelectionIcon size={20} />}
                buttonText={"Select Trips"}
                expandButton={expandAside}
                onClick={() => {}}
              />
              {viewAcceptedTrips && (
                <>
                  <AsideButton
                    buttonIcon={<CheckSquareIcon size={20} />}
                    buttonText={"Complete Trips"}
                    expandButton={expandAside}
                    onClick={() => {}}
                  />
                  <AsideButton
                    buttonIcon={<XSquareIcon size={20} />}
                    buttonText={"Cancel Trips"}
                    expandButton={expandAside}
                    onClick={() => {}}
                  />
                </>
              )}
              {viewPendingTrips && (
                <AsideButton
                  buttonIcon={<CheckSquareIcon size={20} />}
                  buttonText={"Accept Trips"}
                  expandButton={expandAside}
                  onClick={() => {}}
                />
              )}
            </>
          }
          expandAside={expandAside}
          headerText={`Municipal Taxi Service ${viewAcceptedTrips ? "- Accepted Trips" : "- Pending Trips"}`}
          mainComponent={
            <Paper bg={"primaryColor"} h={"80%"} p={"sm"} radius="lg" w={"90%"}>
              <Table.ScrollContainer
                minWidth={0}
                style={{ flex: 1, minHeight: 0 }}
              >
                <Table highlightOnHover stickyHeader>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Pick-up Time</Table.Th>
                      <Table.Th>Pick-up Address</Table.Th>
                      <Table.Th>Destination</Table.Th>
                      <Table.Th>Payment Method</Table.Th>
                      <Table.Th>Requested Verification?</Table.Th>
                      <Table.Th>Reason for Trip</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    <Table.Tr
                      key={undefined}
                      onClick={() => {}}
                      style={{ cursor: "pointer" }}
                    >
                      <Table.Td>entry</Table.Td>
                      <Table.Td>another entry</Table.Td>
                    </Table.Tr>
                  </Table.Tbody>
                </Table>
              </Table.ScrollContainer>
            </Paper>
          }
          navbarComponent={
            <Stack>
              <AppShell.Section>
                <NavbarHeader text={"Trips"} />
                <NavbarOption
                  onClick={() => {
                    setViewAcceptedTrips(true);
                    setViewPendingTrips(false);
                  }}
                  text={"Accepted Trips"}
                />
                <NavbarOption
                  onClick={() => {
                    setViewAcceptedTrips(false);
                    setViewPendingTrips(true);
                  }}
                  text={"Pending Trips"}
                />
              </AppShell.Section>
              <AppShell.Section>
                <NavbarHeader text={"Account"} />
                <NavbarOption onClick={() => {}} text={"Manage Account"} />
                <NavbarOption onClick={() => {}} text={"Log Out"} />
              </AppShell.Section>
              <AppShell.Section>
                <NavbarHeader text={"Miscellaneous"} />
                <NavbarOption
                  onClick={openReportApp}
                  text={"Report App Issue"}
                />
              </AppShell.Section>
            </Stack>
          }
          setExpandAside={setExpandAside}
        />
      </main>
    </>
  );
}
