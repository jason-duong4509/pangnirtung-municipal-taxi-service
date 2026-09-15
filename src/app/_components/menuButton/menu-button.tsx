"use client";
import {
  Box,
  Burger,
  Button,
  Collapse,
  Stack,
  useMantineTheme,
} from "@mantine/core";
import { useDisclosure, useMediaQuery } from "@mantine/hooks";
import { authClient } from "~/server/better-auth/client";
import ManageAccountModal from "../common/manageAccount/manage-account-modal";
import ReportAppIssueModal from "../common/reportAppIssue/report-app-issue";

export default function MenuButton({
  openLoginModal,
}: {
  openLoginModal: () => void;
}) {
  const [burgerOpened, { toggle: toggleBurger }] = useDisclosure();
  const [reportAppOpened, { open: openReportApp, close: closeReportApp }] =
    useDisclosure();
  const mantineTheme = useMantineTheme();
  const isMobile = useMediaQuery(
    `(max-width: ${mantineTheme.breakpoints.smMd})`,
  );
  const [
    manageAccountModalOpened,
    { open: openManageAccountModal, close: closeManageAccountModal },
  ] = useDisclosure(false);
  const { data: session } = authClient.useSession();

  return (
    <Box pos={"relative"}>
      <aside>
        <ReportAppIssueModal
          closeModal={closeReportApp}
          modalOpened={reportAppOpened}
        />
        <ManageAccountModal
          closeModal={closeManageAccountModal}
          modalOpened={manageAccountModalOpened}
        />
      </aside>
      <Burger
        aria-label="Toggle menu options"
        onClick={toggleBurger}
        opened={burgerOpened}
      />

      <main>
        <Collapse
          bottom={isMobile ? "180%" : undefined}
          in={burgerOpened}
          pos={"absolute"}
          right={"0%"}
          top={!isMobile ? "150%" : undefined}
        >
          <Stack>
            <Button
              c={"black"}
              color="customWhite"
              onClick={() => {
                if (session) {
                  openManageAccountModal();
                } else {
                  openLoginModal();
                }
              }}
              radius="lg"
              size="xs"
            >
              Manage Account
            </Button>
            <Button
              c={"black"}
              color="customWhite"
              onClick={openReportApp}
              radius="lg"
              size="xs"
            >
              Report App Issue
            </Button>
          </Stack>
        </Collapse>
      </main>
    </Box>
  );
}
