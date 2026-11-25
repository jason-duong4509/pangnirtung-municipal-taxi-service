"use client";
import { AppShell, Stack } from "@mantine/core";
import { useDisclosure, useMediaQuery } from "@mantine/hooks";
import { useRouter } from "next/navigation";
import { type SetStateAction, useEffect, useState } from "react";
import { authClient } from "~/server/better-auth/client";
import { BookingStatus, RideCodeStatus, UserRoles } from "~/types/types";
import AddAppIssueTagModal from "../_components/adminComponents/add-app-issue-tag/add-app-issue-tag-modal";
import AddRideCodeModal from "../_components/adminComponents/add-ride-code/add-ride-code-modal";
import AddUsersModal from "../_components/adminComponents/add-users/add-users-modal";
import EditTripsAsideBar from "../_components/adminComponents/edit-trips/edit-trips-aside-bar";
import EditTripsTable from "../_components/adminComponents/edit-trips/edit-trips-table";
import EditUsersAsideBar from "../_components/adminComponents/edit-users/edit-users-aside-bar";
import EditUsersTable from "../_components/adminComponents/edit-users/edit-users-table";
import RideCodesAsideBar from "../_components/adminComponents/ride-codes/ride-codes-aside-bar";
import ViewRideCodesTable from "../_components/adminComponents/ride-codes/view-ride-codes-table";
import ViewAppIssuesAsideBar from "../_components/adminComponents/view-app-issues/view-app-issues-aside-bar";
import ViewAppIssuesTable from "../_components/adminComponents/view-app-issues/view-app-issues-table";
import CustomAppShell from "../_components/common/appShell/app-shell";
import NavbarHeader from "../_components/common/appShell/navbar-header";
import NavbarOption from "../_components/common/appShell/navbar-option";
import InstallPwaPrompt from "../_components/common/installPwaPrompt/install-pwa-prompt";
import LoadingScreen from "../_components/common/loadingScreen/loading-screen";
import ManageAccountModal from "../_components/common/manageAccount/manage-account-modal";
import ReportAppIssueModal from "../_components/common/reportAppIssue/report-app-issue";
import LogOutModal from "../_components/logout/logout";

enum PageView { //Enum string values double as app shell header text
  Trips = "- Trips",
  EditUsers = "- Edit Users",
  ViewAppIssues = "- App Issues",
  ViewRideCodes = "- Ride Codes",
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
  const [
    addUserModalOpened,
    { open: openAddUserModal, close: closeAddUserModal },
  ] = useDisclosure(false);
  const [
    manageAccountModalOpened,
    { open: openManageAccountModal, close: closeManageAccountModal },
  ] = useDisclosure(false);
  const [
    logoutModalOpened,
    { open: openLogoutModal, close: closeLogoutModal },
  ] = useDisclosure(false);
  const [installPwaModalOpened, { open: openPwaModal, close: closePwaModal }] =
    useDisclosure(false);
  const [
    addRideCodeModalOpened,
    { open: openAddRideCodeModal, close: closeAddRideCodeModal },
  ] = useDisclosure(false);
  const [
    addAppIssueTagModalOpened,
    { open: openAppIssueTagModal, close: closeAppIssueTagModal },
  ] = useDisclosure(false);
  const [issuesTableFilters, setIssuesTableFilters] = useState<string[]>([]);
  const { data: session, isPending } = authClient.useSession();
  const [showLoadingUI, setShowLoadingUI] = useState(true);
  const router = useRouter();
  const isMobile = useMediaQuery("(max-width: 500px)");
  const [tripTable, setTripTable] = useState<BookingStatus>(
    BookingStatus.PENDING,
  );
  const [rideCodeTable, setRideCodeTable] = useState<RideCodeStatus>(
    RideCodeStatus.ACTIVE,
  );

  if (
    pageView === PageView.Trips &&
    isSelecting &&
    (tripTable === BookingStatus.CANCELLED ||
      tripTable === BookingStatus.COMPLETED)
  ) {
    setIsSelecting(false);
  }

  useEffect(() => {
    if (session && session.user.role === UserRoles.ADMIN && showLoadingUI) {
      setShowLoadingUI(false);
    } else if (
      (session && session.user.role !== UserRoles.ADMIN) ||
      (!isPending && !session)
    ) {
      router.replace("/");
    }
  }, [session, showLoadingUI, router, isPending]);

  if (showLoadingUI) {
    return <LoadingScreen />;
  }

  return (
    <CustomAppShell
      asideComponent={
        <>
          {pageView === PageView.Trips &&
            (tripTable === BookingStatus.PENDING ||
              tripTable === BookingStatus.IN_PROGRESS) && (
              <EditTripsAsideBar
                expandAside={expandAside}
                isSelecting={isSelecting}
                selectedRows={selectedRows}
                setIsSelecting={setIsSelecting}
                setSelectedRows={setSelectedRows}
                table={tripTable}
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
          {pageView === PageView.ViewRideCodes && (
            <RideCodesAsideBar
              expandAside={expandAside}
              isSelecting={isSelecting}
              selectedRows={selectedRowsString}
              setIsSelecting={setIsSelecting}
              setSelectedRows={setSelectedRowsString}
              table={rideCodeTable}
            />
          )}
        </>
      }
      expandAside={expandAside}
      headerText={
        isMobile ? `${pageView.slice(1)}` : `Municipal Taxi Service ${pageView}`
      }
      mainComponent={
        <>
          <LogOutModal onClose={closeLogoutModal} opened={logoutModalOpened} />
          <ReportAppIssueModal
            closeModal={closeReportAppModal}
            modalOpened={reportAppModalOpened}
          />
          <AddUsersModal
            closeModal={closeAddUserModal}
            modalOpened={addUserModalOpened}
          />
          <ManageAccountModal
            closeModal={closeManageAccountModal}
            modalOpened={manageAccountModalOpened}
          />
          <AddRideCodeModal
            closeModal={closeAddRideCodeModal}
            modalOpened={addRideCodeModalOpened}
          />
          <AddAppIssueTagModal
            closeModal={closeAppIssueTagModal}
            modalOpened={addAppIssueTagModalOpened}
          />
          {pageView === PageView.Trips && (
            <EditTripsTable
              isSelecting={isSelecting}
              selectedRows={selectedRows}
              setSelectedRows={setSelectedRows}
              setTable={setTripTable}
              table={tripTable}
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
          {pageView === PageView.ViewRideCodes && (
            <ViewRideCodesTable
              isSelecting={isSelecting}
              selectedRows={selectedRowsString}
              setSelectedRows={setSelectedRowsString}
              setTable={setRideCodeTable}
              table={rideCodeTable}
            />
          )}
          <InstallPwaPrompt
            closeModal={closePwaModal}
            modalOpened={installPwaModalOpened}
          />
        </>
      }
      navbarComponent={
        <Stack>
          <AppShell.Section>
            <NavbarHeader text={"Trips"} />
            <NavbarOption
              onClick={() => {
                setPageView(PageView.Trips);
                setSelectedRows([]);
                setSelectedRowsString([]);
                setIsSelecting(false);
              }}
              text={"Edit Trips"}
            />
          </AppShell.Section>
          <AppShell.Section>
            <NavbarHeader text={"Users"} />
            <NavbarOption
              onClick={() => openAddUserModal()}
              text={"Add Users"}
            />
            <NavbarOption
              onClick={() => {
                setPageView(PageView.EditUsers);
                setSelectedRows([]);
                setSelectedRowsString([]);
                setIsSelecting(false);
              }}
              text={"Edit Users"}
            />
          </AppShell.Section>
          <AppShell.Section>
            <NavbarHeader text={"Ride Codes"} />
            <NavbarOption
              onClick={() => openAddRideCodeModal()}
              text={"Add Ride Code"}
            />
            <NavbarOption
              onClick={() => {
                setPageView(PageView.ViewRideCodes);
                setSelectedRows([]);
                setSelectedRowsString([]);
                setIsSelecting(false);
              }}
              text={"Edit Codes"}
            />
          </AppShell.Section>
          <AppShell.Section>
            <NavbarHeader text={"User Feedback"} />
            <NavbarOption
              onClick={() => openAppIssueTagModal()}
              text={"Add Issue Tag"}
            />
            <NavbarOption
              onClick={() => {
                setPageView(PageView.ViewAppIssues);
                setSelectedRows([]);
                setSelectedRowsString([]);
                setIsSelecting(false);
              }}
              text={"View App Issues"}
            />
          </AppShell.Section>
          <AppShell.Section>
            <NavbarHeader text={"Account"} />
            <NavbarOption
              onClick={() => openManageAccountModal()}
              text={"Manage Account"}
            />
            <NavbarOption onClick={() => openLogoutModal()} text={"Log Out"} />
          </AppShell.Section>
          <AppShell.Section>
            <NavbarHeader text={"Miscellaneous"} />
            <NavbarOption
              onClick={() => openReportAppModal()}
              text={"Report App Issue"}
            />
            <NavbarOption
              onClick={() => openPwaModal()}
              text={"Download PWA App"}
            />
          </AppShell.Section>
        </Stack>
      }
      setExpandAside={setExpandAside}
    />
  );
}
