"use client";
import { Button, Flex, Group, Paper, Title } from "@mantine/core";
import { useDisclosure, useMediaQuery } from "@mantine/hooks";
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

export default function MobileLandingPage({
  openLoginModal,
}: {
  openLoginModal: () => void;
}) {
  const { data: session, isPending } = authClient.useSession();
  const router = useRouter();
  const shortenTitle = useMediaQuery("(max-width: 530px)");
  const shortenTitleAgain = useMediaQuery("(max-width: 430px)");
  const removeTitle = useMediaQuery("(max-width: 340px)");
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
      <Flex bg={"backgroundColor"} direction={"column"} h={"100dvh"}>
        <Paper
          bg={"primaryColor"}
          mih={"55px"}
          style={{ boxShadow: "10px 0px 10px rgba(0, 0, 0, 0.25)" }}
          w={"100vw"}
        >
          <Group
            align={"center"}
            gap={"xs"}
            h={"100%"}
            justify={"center"}
            pl={"lg"}
          >
            <PangSeal height={"35px"} width={"35px"} />
            <Title order={2} style={{ fontSize: "20px" }}>
              {removeTitle
                ? ""
                : shortenTitleAgain
                  ? "Taxi"
                  : shortenTitle
                    ? "Taxi Service"
                    : "Municipal Taxi Service"}
            </Title>

            <Group
              flex={1}
              gap={shortenTitle ? "xs" : "md"}
              justify="flex-end"
              pr={"lg"}
            >
              <Button
                c={"black"}
                color={"buttonColor"}
                disabled={firstRender}
                onClick={() => {
                  if (session) {
                    router.push("/booking-history");
                  } else {
                    openLoginModal();
                  }
                }}
                radius={"lg"}
                size="xs"
                type="button"
              >
                <ClockIcon size={20} />
              </Button>
              <RideCreditCountPopover isMobile />
              <Button
                c={"black"}
                color={"buttonColor"}
                disabled={firstRender}
                onClick={() => {
                  if (session) {
                    openLogoutModal();
                  } else {
                    openLoginModal();
                  }
                }}
                radius={"lg"}
                size="xs"
                type="button"
              >
                {!session && <SignInIcon size={20} />}
                {session && <SignOutIcon size={20} />}
              </Button>
            </Group>
          </Group>
        </Paper>

        <Flex align={"center"} flex={1} justify={"center"} pos={"relative"}>
          <BookingForm
            openLoginModal={openLoginModal}
            toggleBurger={toggleBurger}
          />
        </Flex>

        <Paper
          bg={"primaryColor"}
          mih={"55px"}
          style={{ boxShadow: "10px 0px 10px rgba(0, 0, 0, 0.25)" }}
          w={"100vw"}
        >
          <Flex
            align={"center"}
            gap={"sm"}
            h={"100%"}
            justify={"flex-end"}
            pr={"lg"}
          >
            <CallDriverButton isMobile openLoginModal={openLoginModal} />
            <Button
              aria-label="Download PWA button"
              c={"black"}
              color={"buttonColor"}
              onClick={() => {
                if (session) {
                  openPwaModal();
                } else {
                  openLoginModal();
                }
              }}
              radius={"lg"}
              size="xs"
              type="button"
            >
              <CloudArrowDownIcon size={20} />
            </Button>
            <MenuButton
              burgerOpened={burgerOpened}
              openLoginModal={openLoginModal}
              toggleBurger={toggleBurger}
            />
          </Flex>
        </Paper>
      </Flex>
    </>
  );
}
