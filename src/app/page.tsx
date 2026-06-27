"use client";
import { Flex, Group, Paper, Title } from "@mantine/core";
import PangSeal from "~/assets/icons/pang";
import BookingForm from "./_components/landing page components/booking-form";

export default function Home() {
  return (
    <Flex bg={"backgroundColor"}>
      <Paper
        bg={"primaryColor"}
        h={"100vh"}
        style={{ boxShadow: "10px 0px 10px rgba(0, 0, 0, 0.25)" }}
        w={"380px"}
      >
        <Group align={"center"} h={"100vh"} justify={"center"}>
          <PangSeal height="125px" width="125px" />
          <Title order={2} w={"144px"}>
            Municipal Taxi Service
          </Title>
        </Group>
      </Paper>

      <Flex align={"center"} flex={1} justify={"center"}>
        <BookingForm />
      </Flex>
    </Flex>
  );
}
