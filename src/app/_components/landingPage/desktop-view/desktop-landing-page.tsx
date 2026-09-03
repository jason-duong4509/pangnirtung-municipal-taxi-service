"use client";
import { Button, Flex, Group, Paper, Title } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useRouter } from "next/navigation";
import { useState } from "react";
import PangSeal from "~/assets/icons/pang";
import { authClient } from "~/server/better-auth/client";
import BookingForm from "../../bookingForm/booking-form";
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

  if (!isPending && firstRender) {
    setFirstRender(false);
  }

  return (
    <>
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
          <BookingForm openLoginModal={openLoginModal} />
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
              size="xs"
              type="button"
            >
              Trip History
            </Button>
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
              size="xs"
              type="button"
            >
              {!session && "Log in"}
              {session && "Log out"}
            </Button>
            <MenuButton />
          </Group>
        </Flex>
      </Flex>
    </>
  );
}
