"use client";
import { Button, Flex, Group, Paper, Title } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  ClockIcon,
  CloudArrowDownIcon,
  SignInIcon,
  SignOutIcon,
} from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import PangSeal from "~/assets/icons/pang";
import { authClient } from "~/server/better-auth/client";
import BookingForm from "../../bookingForm/booking-form";
import CallDriverButton from "../../common/callDriverButton/call-driver-button";
import InstallPwaPrompt from "../../common/installPwaPrompt/install-pwa-prompt";
import RideCreditCountPopover from "../../common/rideCreditCountPopover/ride-credit-count-popover";
import LogOutModal from "../../logout/logout";
import MenuButton from "../../menuButton/menu-button";

export default function DesktopLandingPage({
  openLoginModal,
}: {
  openLoginModal: () => void;
}) {
  const { data: session, isPending } = authClient.useSession();
  const router = useRouter();
  const [
    logoutModalOpened,
    { open: openLogoutModal, close: closeLogoutModal },
  ] = useDisclosure(false);
  const [firstRender, setFirstRender] = useState(true);
  const [burgerOpened, { toggle: toggleBurger }] = useDisclosure();
  const [installPwaModalOpened, { open: openPwaModal, close: closePwaModal }] =
    useDisclosure(false);

  if (!isPending && firstRender) {
    setFirstRender(false);
  }

  return (
    <>
      <InstallPwaPrompt
        closeModal={closePwaModal}
        modalOpened={installPwaModalOpened}
      />
      <LogOutModal onClose={closeLogoutModal} opened={logoutModalOpened} />
      <Flex bg={"backgroundColor"} direction={"row"} h={"100dvh"}>
        <Paper
          bg={"primaryColor"}
          h={"100dvh"}
          mih={"55px"}
          style={{ boxShadow: "10px 0px 10px rgba(0, 0, 0, 0.25)" }}
          w={"380px"}
        >
          <Group align={"center"} gap={"md"} h={"100%"} justify={"center"}>
            <PangSeal height={"125px"} width={"125px"} />
            <Title order={2} w={"144px"}>
              Municipal Taxi Service
            </Title>
          </Group>
        </Paper>

        <Flex align={"center"} flex={1} justify={"center"} pos={"relative"}>
          <BookingForm
            openLoginModal={openLoginModal}
            toggleBurger={toggleBurger}
          />
          <Group justify="flex-end" pos={"absolute"} right={"5%"} top={"5%"}>
            <Button
              c={"black"}
              color={"customWhite"}
              disabled={firstRender}
              onClick={() => {
                if (session) {
                  router.push("/booking-history");
                } else {
                  openLoginModal();
                }
              }}
              radius={"lg"}
              rightSection={<ClockIcon size={20} />}
              size="xs"
              type="button"
            >
              Trip History
            </Button>
            <RideCreditCountPopover isMobile={false} />
            <Button
              c={"black"}
              color={"customWhite"}
              disabled={firstRender}
              onClick={() => {
                if (session) {
                  openLogoutModal();
                } else {
                  openLoginModal();
                }
              }}
              radius={"lg"}
              rightSection={
                session ? <SignOutIcon size={20} /> : <SignInIcon size={20} />
              }
              size="xs"
              type="button"
            >
              {!session && "Log in"}
              {session && "Log out"}
            </Button>
            <MenuButton
              burgerOpened={burgerOpened}
              openLoginModal={openLoginModal}
              toggleBurger={toggleBurger}
            />
          </Group>
          <Group bottom={"5%"} justify="flex-end" pos={"absolute"} right={"5%"}>
            <CallDriverButton
              isMobile={false}
              openLoginModal={openLoginModal}
            />
            <Button
              aria-label="Download PWA button"
              c={"black"}
              color={"customWhite"}
              onClick={() => {
                if (session) {
                  openPwaModal();
                } else {
                  openLoginModal();
                }
              }}
              radius={"lg"}
              rightSection={<CloudArrowDownIcon size={20} />}
              size="xs"
              type="button"
            >
              Download the App
            </Button>
          </Group>
        </Flex>
      </Flex>
    </>
  );
}
