"use client";
import {
  Box,
  Button,
  Flex,
  Group,
  Loader,
  PasswordInput,
  ScrollArea,
  Stack,
  Text,
  TextInput,
  Title,
  Transition,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useDisclosure } from "@mantine/hooks";
import { parsePhoneNumberWithError } from "libphonenumber-js";
import { useRouter } from "next/navigation";
import { useState } from "react";
import PangSeal from "~/assets/icons/pang";
import { showNotifications } from "~/lib/mantine-notifications-system";
import { authClient } from "~/server/better-auth/client";
import { emailRegex, usernameRegex } from "~/types/validation";

//Enum constants to denote what UI is displayed to the user
const RegisterUIStates = {
  makeAccount: 0, //displays a form where the user can input account credentials (user,pass,etc)
  success: 1, //tells the user that account creation was successful
} as const;
type RegisterUIStates =
  (typeof RegisterUIStates)[keyof typeof RegisterUIStates];

export default function RegisterAccountPage() {
  const router = useRouter();
  const [isModalOpen, { open: openModal, close: closeModal }] =
    useDisclosure(false);
  //Use state to keep track of what UI of the form is displayed
  const [uiState, setUiState] = useState<RegisterUIStates>(
    RegisterUIStates.makeAccount,
  );
  const [stack, changeStack] = useState([] as RegisterUIStates[]);
  const [wentBack, setWentBack] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  //Form used to track what account data the user wants to change
  const form = useForm<{
    username: string;
    password: string;
    email: string;
    phoneNumber: string;
  }>({
    mode: "controlled",

    //Initial field values of form
    initialValues: {
      username: "",
      password: "",
      email: "",
      phoneNumber: "",
    },

    //Frontend field checks
    validate: {
      username: (value) => {
        if (value.length < 6 || value.length > 20) {
          return "Username must be 6-20 characters long";
        } else if (!usernameRegex.test(value)) {
          return "Invalid username provided";
        }
        return null;
      },
      password: (value) =>
        value.length < 9 ? "Password must be at least 9 characters long" : null,
      email: (value, values) => {
        if (value.length === 0 && values.phoneNumber.length === 0) {
          return "Either email or phone number must be given";
        } else if (value !== "" && !emailRegex.test(value)) {
          return "Invalid email provided";
        }
        return null;
      },
      phoneNumber: (value, values) => {
        if (value.length === 0 && values.email.length === 0) {
          return "Either email or phone number must be given";
        } else if (value !== "") {
          try {
            const phoneNumber = parsePhoneNumberWithError(value, "CA");
            if (!phoneNumber.isValid()) {
              throw new Error();
            }
          } catch (error) {
            if (error instanceof Error) {
              return "Invalid phone number given";
            } else {
              return `An unexpected error occurred: ${error}`;
            }
          }
        }
        return null;
      },
    },
  });

  const handleOnSubmit = async (values: typeof form.values) => {
    setIsSubmitting(true);

    let phoneNumber = values.phoneNumber;
    if (values.phoneNumber !== "") {
      try {
        phoneNumber = parsePhoneNumberWithError(
          values.phoneNumber,
          "CA",
        ).formatNational();
      } catch (error) {
        setIsSubmitting(false);
        showNotifications.error("Invalid phone number");
        return;
      }
    }

    const result = await authClient.signUp.email({
      email: values.email,
      password: values.password,
      username: values.username,
      phone: phoneNumber,
      name: "",
    });

    if (result.error) {
      showNotifications.error(
        result.error.message ?? "An unknown error occurred",
      );
    } else {
      //Enable 2FA on behalf of the user
      const { error } = await authClient.twoFactor.enable({
        password: values.password,
        method: "otp",
      });

      if (error) {
        showNotifications.error(
          error.message ?? "An error occurred while setting up 2FA",
        );
      } else {
        //Sign the user out
        await authClient.signOut({
          fetchOptions: {
            onSuccess: () => {
              //--Move to success UI--
              setUiState(RegisterUIStates.success);
              stack.push(RegisterUIStates.makeAccount);
              changeStack([...stack]); //Need to recreate the [] for react to rerender
              //----------------------
            },
            onError: (ctx) => {
              showNotifications.error(ctx.error.message);
            },
          },
        });
      }
    }

    setIsSubmitting(false);
  };

  return (
    <Flex
      align={"center"}
      bg={"backgroundColor"}
      h={"100vh"}
      justify={"center"}
    >
      <ScrollArea.Autosize
        bg={"primaryColor"}
        mah={"70vh"}
        maw={"80vw"}
        p={"32px"}
        scrollbars="y"
        style={{
          boxShadow: "0 12px 32px rgba(0, 0, 0, 0.08)",
          borderRadius: "16px",
        }}
      >
        <form id="register-form" onSubmit={form.onSubmit(handleOnSubmit)}>
          <Stack>
            <Group wrap="nowrap">
              <PangSeal
                height={"clamp(2.2rem, 3vh, 3rem)"}
                width={"clamp(2.2rem, 3vh, 3rem)"}
              />
              <Title order={4}>Municipal Taxi Service</Title>
            </Group>

            <Box style={{ display: "grid" }}>
              <Transition
                duration={1000}
                enterDelay={300}
                mounted={uiState === RegisterUIStates.makeAccount}
                timingFunction="ease"
                transition={"slide-right"}
              >
                {(transitionStyle) => (
                  <Title
                    order={5}
                    style={{ ...transitionStyle, gridArea: "1/1" }}
                  >
                    Register Your Resident Account
                  </Title>
                )}
              </Transition>
              <Transition
                duration={1000}
                enterDelay={300}
                mounted={uiState === RegisterUIStates.success}
                timingFunction="ease"
                transition={"slide-left"}
              >
                {(transitionStyle) => (
                  <Title
                    order={5}
                    style={{ ...transitionStyle, gridArea: "1/1" }}
                  >
                    Success
                  </Title>
                )}
              </Transition>
            </Box>
            <Box style={{ display: "grid" }}>
              <Transition
                duration={1000}
                enterDelay={300}
                mounted={uiState === RegisterUIStates.makeAccount}
                timingFunction="ease"
                transition={"slide-right"}
              >
                {(transitionStyle) => (
                  <Stack style={{ ...transitionStyle, gridArea: "1/1" }}>
                    <Flex direction={{ base: "column", xs: "row" }} gap={"md"}>
                      <TextInput
                        label="Username"
                        placeholder="Alphanumeric (A-Z, 0-9)"
                        withAsterisk
                        {...form.getInputProps("username")}
                        style={{ flex: 1 }}
                      />
                      <PasswordInput
                        label="Password"
                        placeholder="At least 9 characters long"
                        withAsterisk
                        {...form.getInputProps("password")}
                        style={{ flex: 1 }}
                      />
                    </Flex>
                    <Flex direction={{ base: "column", xs: "row" }} gap={"md"}>
                      <TextInput
                        label="Email Address"
                        placeholder="someone@email.com"
                        {...form.getInputProps("email")}
                        description="Optional if phone number is given"
                        style={{ flex: 1 }}
                      />
                      <TextInput
                        label="Phone Number"
                        placeholder="123-456-7890"
                        {...form.getInputProps("phoneNumber")}
                        description="Optional if email address is given"
                        style={{ flex: 1 }}
                      />
                    </Flex>
                    <Button
                      c={"black"}
                      color="buttonColor"
                      form="register-form"
                      type={"submit"}
                    >
                      {isSubmitting && <Loader color="black" size={20} />}
                      {!isSubmitting && "Create Account"}
                    </Button>
                  </Stack>
                )}
              </Transition>
              <Transition
                duration={1000}
                enterDelay={300}
                mounted={uiState === RegisterUIStates.success}
                timingFunction="ease"
                transition={"slide-left"}
              >
                {(transitionStyle) => (
                  <Stack style={{ ...transitionStyle, gridArea: "1/1" }}>
                    <Text>
                      You can now log in with your new account credentials
                    </Text>
                    <Button
                      c={"black"}
                      color="buttonColor"
                      onClick={() => router.push("/")}
                      type="button"
                    >
                      Home
                    </Button>
                  </Stack>
                )}
              </Transition>
            </Box>
          </Stack>
        </form>
      </ScrollArea.Autosize>
    </Flex>
  );
}
