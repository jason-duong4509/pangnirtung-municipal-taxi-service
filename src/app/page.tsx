"use client";
import { Flex, Group, Title } from "@mantine/core";
import PangSeal from "~/assets/icons/pang";
import BookingForm from "./_components/landing page components/booking-form";

export default function Home() {
  return (
    <Flex bg={"backgroundColor"}>
      <Group
        align={"center"}
        bg={"primaryColor"}
        h={"100vh"}
        justify={"center"}
        w={"380px"}
      >
        <PangSeal height="125px" width="125px" />
        <Title order={2} w={"144px"}>
          Municipal Taxi Service
        </Title>
      </Group>

      <Flex align={"center"} bg={"backgroundColor"} flex={1} justify={"center"}>
        <BookingForm />
      </Flex>
    </Flex>
  );
}
