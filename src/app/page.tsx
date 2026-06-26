"use client";
import {
  Box,
  Button,
  Center,
  Flex,
  Group,
  Paper,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { DateTimePicker } from "@mantine/dates";
import { useForm } from "@mantine/form";
import PangSeal from "~/assets/icons/pang";

/*
<Flex bg={"backgroundColor"}>
      <Group align={"center"} justify={"center"} h={"100vh"} w={"40%"} bg={"blue"} wrap="nowrap" p={"md"}>
        <PangSeal width="125px" height="125px"/>
        <Title order={2} w={"fit-content"}>Municipal Taxi Service</Title>
      </Group>
      <Flex align={"center"} h={"100vh"} w={"60%"} bg={"orange"}>
        Right
      </Flex>
    </Flex>
*/
export default function Home() {
  //Configure form
  const bookingForm = useForm({
    mode: "uncontrolled",

    //Initial field values of form
    initialValues: {
      pickupTime: "",
      pickupAddr: "",
      destAddr: "",
    },

    //Simple form field checks
    validate: {
      pickupAddr: (value) =>
        value.length !== 0 ? null : "Cannot submit blank address",
    },
  });

  /*
  
  */

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

      <Flex align={"center"} bg={"orange"} flex={1} justify={"center"}>
        <Paper bg={"red"} h={"400px"} shadow="md">
          <form
            onSubmit={bookingForm.onSubmit(() => {
              console.log("form submitted");
            })}
          >
            <TextInput
              key={bookingForm.key("pickupAddr")}
              label="e"
              withAsterisk
              {...bookingForm.getInputProps("pickupAddr")}
            />
            <DateTimePicker
              label="Pick date and time"
              placeholder="Pick date and time"
            />
            ;<Button type="submit">Submit</Button>
          </form>
        </Paper>
      </Flex>
    </Flex>
  );
}
