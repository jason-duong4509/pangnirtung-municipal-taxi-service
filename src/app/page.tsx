"use client";
import {
  Button,
  Flex,
  Group,
  Paper,
  Title,
  useMantineTheme,
} from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { useRouter } from "next/navigation";
import Login from "~/app/_components/login/login";
import PangSeal from "~/assets/icons/pang";
import BookingForm from "./_components/bookingForm/booking-form";
import MenuButton from "./_components/menuButton/menu-button";

export default function Home() {
  const router = useRouter();
  const mantineTheme = useMantineTheme();
  const isMobile = useMediaQuery(
    `(max-width: ${mantineTheme.breakpoints.smMd})`,
  );
  const shortenTitle = useMediaQuery("(max-width: 455px)");

  return (
    <Flex
      bg={"backgroundColor"}
      direction={{ base: "column", smMd: "row" }}
      h={"100dvh"}
    >
      <Paper
        bg={"primaryColor"}
        h={{ smMd: "100dvh" }}
        mih={"55px"}
        style={{ boxShadow: "10px 0px 10px rgba(0, 0, 0, 0.25)" }}
        w={{ base: "100vw", smMd: "380px" }}
      >
        <Group
          align={"center"}
          gap={isMobile ? "xs" : "md"}
          h={"100%"}
          justify={"center"}
          pl={isMobile ? "lg" : undefined}
        >
          <PangSeal
            height={isMobile ? "35px" : "125px"}
            width={isMobile ? "35px" : "125px"}
          />
          <Title
            order={2}
            style={isMobile ? { fontSize: "20px" } : undefined}
            w={{ smMd: "144px" }}
          >
            {shortenTitle ? "Taxi Service" : "Municipal Taxi Service"}
          </Title>

          {isMobile && (
            <Group flex={1} justify="flex-end" pr={"lg"}>
              <Button
                c={"black"}
                color={isMobile ? "buttonColor" : "customWhite"}
                onClick={() => router.push("/booking-history")}
                radius={"lg"}
                size="xs"
                type="button"
              >
                {isMobile ? "History" : "Trip History"}
              </Button>
              <Login />
            </Group>
          )}
        </Group>
      </Paper>

      <Flex align={"center"} flex={1} justify={"center"} pos={"relative"}>
        <BookingForm />
        {!isMobile && (
          <Group justify="flex-end" pos={"absolute"} right={"5%"} top={"5%"}>
            <Button
              c={"black"}
              color={isMobile ? "buttonColor" : "customWhite"}
              onClick={() => router.push("/booking-history")}
              radius={"lg"}
              size="xs"
              type="button"
            >
              {isMobile ? "History" : "Trip History"}
            </Button>
            <Login />
            <MenuButton />
          </Group>
        )}
      </Flex>

      <Paper
        bg={"primaryColor"}
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
