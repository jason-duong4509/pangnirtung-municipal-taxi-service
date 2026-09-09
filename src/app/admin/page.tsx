"use client";
import { AppShell, Stack } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useState } from "react";
import EditTripsAsideBar from "../_components/adminComponents/edit-trips/edit-trips-aside-bar";
import EditTripsTable from "../_components/adminComponents/edit-trips/edit-trips-table";
import EditUsersAsideBar from "../_components/adminComponents/edit-users/edit-users-aside-bar";
import EditUsersTable from "../_components/adminComponents/edit-users/edit-users-table";
import ViewAppIssuesAsideBar from "../_components/adminComponents/view-app-issues/view-app-issues-aside-bar";
import ViewAppIssuesTable from "../_components/adminComponents/view-app-issues/view-app-issues-table";
import CustomAppShell from "../_components/common/appShell/app-shell";
import NavbarHeader from "../_components/common/appShell/navbar-header";
import NavbarOption from "../_components/common/appShell/navbar-option";
import ReportAppIssueModal from "../_components/common/reportAppIssue/report-app-issue";

enum PageView { //Enum string values double as app shell header text
  Trips = "- Trips",
  EditUsers = "- Edit Users",
  ViewAppIssues = "- App Issues",
}

export default function AdminPage() {
  const [pageView, setPageView] = useState<PageView>(PageView.Trips);
  const [expandAside, setExpandAside] = useState(false);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectedRows, setSelectedRows] = useState<number[]>([]);
  const [selectedRowsString, setSelectedRowsString] = useState<string[]>([]);
  const [
    reportAppModalOpened,
    { open: openReportAppModal, close: closeReportAppModal },
  ] = useDisclosure(false);
  const [issuesTableFilters, setIssuesTableFilters] = useState<string[]>([]);

  return (
    <CustomAppShell
      asideComponent={
        <>
          {pageView === PageView.Trips && (
            <EditTripsAsideBar
              expandAside={expandAside}
              isSelecting={isSelecting}
              selectedRows={selectedRows}
              setIsSelecting={setIsSelecting}
              setSelectedRows={setSelectedRows}
            />
          )}
          {pageView === PageView.ViewAppIssues && (
            <ViewAppIssuesAsideBar
              expandAside={expandAside}
              isSelecting={isSelecting}
              issueFilters={issuesTableFilters}
              selectedRows={selectedRows}
              setIsSelecting={setIsSelecting}
              setIssuesTableFilters={setIssuesTableFilters}
              setSelectedRows={setSelectedRows}
            />
          )}
          {pageView === PageView.EditUsers && (
            <EditUsersAsideBar
              expandAside={expandAside}
              isSelecting={isSelecting}
              selectedRows={selectedRowsString}
              setIsSelecting={setIsSelecting}
              setSelectedRows={setSelectedRowsString}
            />
          )}
        </>
      }
      expandAside={expandAside}
      headerText={`Municipal Taxi Service ${pageView}`}
      mainComponent={
        <>
          <ReportAppIssueModal
            closeModal={closeReportAppModal}
            modalOpened={reportAppModalOpened}
          />
          {pageView === PageView.Trips && (
            <EditTripsTable
              isSelecting={isSelecting}
              selectedRows={selectedRows}
              setSelectedRows={setSelectedRows}
            />
          )}
          {pageView === PageView.ViewAppIssues && (
            <ViewAppIssuesTable
              isSelecting={isSelecting}
              issueFilters={issuesTableFilters}
              selectedRows={selectedRows}
              setSelectedRows={setSelectedRows}
            />
          )}
          {pageView === PageView.EditUsers && (
            <EditUsersTable
              isSelecting={isSelecting}
              selectedRows={selectedRowsString}
              setSelectedRows={setSelectedRowsString}
            />
          )}
        </>
      }
      navbarComponent={
        <Stack>
          <AppShell.Section>
            <NavbarHeader text={"Trips"} />
            <NavbarOption
              onClick={() => setPageView(PageView.Trips)}
              text={"Edit Trips"}
            />
          </AppShell.Section>
          <AppShell.Section>
            <NavbarHeader text={"Users"} />
            <NavbarOption onClick={() => {}} text={"Add Users"} />
            <NavbarOption
              onClick={() => setPageView(PageView.EditUsers)}
              text={"Edit Users"}
            />
          </AppShell.Section>
          <AppShell.Section>
            <NavbarHeader text={"User Feedback"} />
            <NavbarOption
              onClick={() => setPageView(PageView.ViewAppIssues)}
              text={"View App Issues"}
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
              onClick={() => openReportAppModal()}
              text={"Report App Issue"}
            />
          </AppShell.Section>
        </Stack>
      }
      setExpandAside={setExpandAside}
    />
  );
}
