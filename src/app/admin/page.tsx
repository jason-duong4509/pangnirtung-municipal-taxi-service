"use client";
import { AppShell, Paper, Stack } from "@mantine/core";
import { useState } from "react";
import EditTripsAsideBar from "../_components/adminComponents/edit-trips/edit-trips-aside-bar";
import EditTripsTable from "../_components/adminComponents/edit-trips/edit-trips-table";
import CustomAppShell from "../_components/common/appShell/app-shell";
import NavbarHeader from "../_components/common/appShell/navbar-header";
import NavbarOption from "../_components/common/appShell/navbar-option";

enum PageView { //Enum string values double as app shell header text
  Trips,
  AddUsers,
  EditUsers,
  ViewAppIssues,
  ManageAccount,
  LogOut,
  ReportAppIssue,
}

export default function AdminPage() {
  const [pageView, setPageView] = useState<PageView>(PageView.Trips);
  const [expandAside, setExpandAside] = useState(false);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectedRows, setSelectedRows] = useState<number[]>([]);

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
          {pageView === PageView.AddUsers && <Paper></Paper>}
        </>
      }
      expandAside={expandAside}
      headerText={`Municipal Taxi Service ${pageView === PageView.Trips ? "- Trips" : pageView === PageView.EditUsers ? "- Edit Users" : pageView === PageView.ViewAppIssues ? "- App Issues" : ""}`}
      mainComponent={
        <>
          {pageView === PageView.Trips && (
            <EditTripsTable
              isSelecting={isSelecting}
              selectedRows={selectedRows}
              setSelectedRows={setSelectedRows}
            />
          )}
          {pageView === PageView.AddUsers && <Paper></Paper>}
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
            <NavbarOption
              onClick={() => setPageView(PageView.AddUsers)}
              text={"Add Users"}
            />
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
            <NavbarOption
              onClick={() => setPageView(PageView.ManageAccount)}
              text={"Manage Account"}
            />
            <NavbarOption
              onClick={() => setPageView(PageView.LogOut)}
              text={"Log Out"}
            />
          </AppShell.Section>
          <AppShell.Section>
            <NavbarHeader text={"Miscellaneous"} />
            <NavbarOption
              onClick={() => setPageView(PageView.ReportAppIssue)}
              text={"Report App Issue"}
            />
          </AppShell.Section>
        </Stack>
      }
      setExpandAside={setExpandAside}
    />
  );
}
