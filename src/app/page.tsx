"use client";
import { Flex, Group, Paper, Title, useMantineTheme } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import Login from "~/app/_components/login/login";
import HistoryButton from "~/app/_components/tripHistory/trip-history";
import PangSeal from "~/assets/icons/pang";
import BookingForm from "./_components/bookingForm/booking-form";
import MenuButton from "./_components/menuButton/menu-button";

export default function Home() {
  const mantineTheme = useMantineTheme();
  const isMobile = useMediaQuery(
    `(max-width: ${mantineTheme.breakpoints.smMd})`,
  );

  return (
    <Flex
      bg={"backgroundColor"}
      direction={{ base: "column", smMd: "row" }}
      h={"100vh"}
    >
      <Paper
        bg={"primaryColor"}
        h={{ base: "7vh", smMd: "100vh" }}
        mih={"55px"}
        style={{ boxShadow: "10px 0px 10px rgba(0, 0, 0, 0.25)" }}
        w={{ base: "100vw", smMd: "380px" }}
      >
        <Group
          align={"center"}
          gap={isMobile ? "xs" : "md"}
          h={"100%"}
          justify={"center"}
        >
          <PangSeal
            height={isMobile ? "clamp(2.2rem, 3vh, 3rem)" : "125px"}
            width={isMobile ? "clamp(2.2rem, 3vh, 3rem)" : "125px"}
          />
          <Title
            order={2}
            style={
              isMobile ? { fontSize: "clamp(1.2rem, 2vh, 2rem)" } : undefined
            }
            w={{ base: "130px", smMd: "144px" }}
          >
            {isMobile ? "Taxi Service" : "Municipal Taxi Service"}
          </Title>

          {isMobile && (
            <>
              <HistoryButton />
              <Login />
            </>
          )}
        </Group>
      </Paper>

      <Flex align={"center"} flex={1} justify={"center"} pos={"relative"}>
        <BookingForm />
        {!isMobile && (
          <>
            <Group justify="flex-end" pos={"absolute"} right={"5%"} top={"5%"}>
              <HistoryButton />
              <Login />
              <MenuButton />
            </Group>
          </>
        )}
      </Flex>

      <Paper
        bg={"primaryColor"}
        h={"7vh"}
        hiddenFrom="smMd"
        mih={"55px"}
        style={{ boxShadow: "10px 0px 10px rgba(0, 0, 0, 0.25)" }}
        w={"100vw"}
      >
        <Flex align={"center"} h={"100%"} justify={"flex-end"} pr={"lg"}>
          <MenuButton />
        </Flex>
      </Paper>
    </Flex>
  );
}
