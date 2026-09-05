"use client";
import { Button, Flex, Group, Paper, Title } from "@mantine/core";
import { useDisclosure, useMediaQuery } from "@mantine/hooks";
import { useRouter } from "next/navigation";
import { useState } from "react";
import PangSeal from "~/assets/icons/pang";
import { authClient } from "~/server/better-auth/client";
import BookingForm from "../../bookingForm/booking-form";
import LogOutModal from "../../logout/logout";
import MenuButton from "../../menuButton/menu-button";

export default function MobileLandingPage({
  openLoginModal,
}: {
  openLoginModal: () => void;
}) {
  const { data: session, isPending } = authClient.useSession();
  const router = useRouter();
  const shortenTitle = useMediaQuery("(max-width: 455px)");
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
              {shortenTitle ? "Taxi Service" : "Municipal Taxi Service"}
            </Title>

            <Group flex={1} justify="flex-end" pr={"lg"}>
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
                History
              </Button>
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
                {!session && "Log in"}
                {session && "Log out"}
              </Button>
            </Group>
          </Group>
        </Paper>

        <Flex align={"center"} flex={1} justify={"center"} pos={"relative"}>
          <BookingForm openLoginModal={openLoginModal} />
        </Flex>

        <Paper
          bg={"primaryColor"}
          mih={"55px"}
          style={{ boxShadow: "10px 0px 10px rgba(0, 0, 0, 0.25)" }}
          w={"100vw"}
        >
          <Flex align={"center"} h={"100%"} justify={"flex-end"} pr={"lg"}>
            <MenuButton />
          </Flex>
        </Paper>
      </Flex>
    </>
  );
}
