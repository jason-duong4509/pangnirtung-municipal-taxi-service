"use client";
import {
  ActionIcon,
  Box,
  Button,
  CloseButton,
  FileInput,
  type FileInputProps,
  Flex,
  Group,
  Modal,
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
import { ArrowLeftIcon } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import PangSeal from "~/assets/icons/pang";

//Enum constants to denote what UI is displayed to the user
const RegisterUIStates = {
  makeAccount: 0, //displays a form where the user can input account credentials (user,pass,etc)
  verify: 1, //prompts the user to verify their residency status
  success: 2, //tells the user that account creation was successful
} as const;
type RegisterUIStates =
  (typeof RegisterUIStates)[keyof typeof RegisterUIStates];

//Function which returns a component that renders an image from a file
const MakeImagePreview: FileInputProps["valueComponent"] = ({
  value: file,
}) => {
  //Tracks the file URL from the previous render
  const [oldFileURL, setOldFileURL] = useState<string | null>(null);

  //Runs every time the file object changes
  useEffect(() => {
    if (!file || Array.isArray(file)) {
      return; //Should never reach this as file is always of type File in this context
    }

    //Create a URL for the file
    const fileURL = URL.createObjectURL(file);
    //Start tracking it across renders
    setOldFileURL(fileURL);

    //When useEffect reruns (unmounted or file changes), remove URL for the file (memory clean-up)
    return () => URL.revokeObjectURL(fileURL);
  }, [file]);

  //First render, skip (no URL created yet)
  if (oldFileURL === null) {
    return null;
  }

  return <img alt="Submitted ID" src={oldFileURL} />;
};

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

  //Form used to track what account data the user wants to change
  const form = useForm<{
    username: string;
    password: string;
    email: string;
    phoneNumber: string;
    proofOfResidency: File | null;
  }>({
    mode: "controlled",

    //Initial field values of form
    initialValues: {
      username: "",
      password: "",
      email: "",
      phoneNumber: "",
      proofOfResidency: null,
    },

    //Frontend field checks
    validate: {
      proofOfResidency: (fileBlob) => {
        if (
          fileBlob !== null &&
          fileBlob.type !== "image/png" &&
          fileBlob.type !== "image/jpg" &&
          fileBlob.type !== "image/jpeg"
        ) {
          return "Incorrect file type given";
        }
      },
      username: (value) =>
        value.length === 0 ? "Field cannot be blank" : null,
      password: (value) =>
        value.length === 0 ? "Field cannot be blank" : null,
      email: (value, values) =>
        value.length === 0 && values.phoneNumber.length === 0
          ? "Either email or phone number must be given"
          : null,
      phoneNumber: (value, values) =>
        value.length === 0 && values.email.length === 0
          ? "Either email or phone number must be given"
          : null,
    },
  });

  const handleOnSubmit = async (values: typeof form.values) => {
    console.log(values);
  };

  return (
    <Flex
      align={"center"}
      bg={"backgroundColor"}
      h={"100dvh"}
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
          <Modal
            centered
            onClose={closeModal}
            opened={isModalOpen}
            radius={"lg"}
            size={"sm"}
            withCloseButton={false}
          >
            <Stack gap={"lg"} p={"md"}>
              <Group justify="space-between">
                <Title order={4}>Are you Sure?</Title>
                <CloseButton onClick={closeModal} />
              </Group>
              <Text>
                Upload your proof of local residency to access discounted rides
              </Text>
              <Text>Proof of residency can be added to your account later</Text>
              <Group grow>
                <Button
                  c={"black"}
                  color="buttonColor"
                  onClick={closeModal}
                  p={0}
                  size="compact-sm"
                  type="button"
                  variant="outline"
                >
                  Cancel
                </Button>
                <Button
                  c={"black"}
                  color="buttonColor"
                  form="register-form"
                  onClick={() => {
                    setUiState(RegisterUIStates.success);
                    stack.push(RegisterUIStates.verify);
                    changeStack([...stack]); //Need to recreate the [] for react to rerender
                    setWentBack(false);
                    closeModal();
                  }}
                  p={0}
                  size="compact-sm"
                  type="submit"
                  variant="filled"
                >
                  Skip
                </Button>
              </Group>
            </Stack>
          </Modal>
          <Stack>
            <Group wrap="nowrap">
              {uiState !== RegisterUIStates.makeAccount &&
                uiState !== RegisterUIStates.success && (
                  <ActionIcon
                    aria-label="Go back button"
                    color="black"
                    onClick={() => {
                      const previousState = stack.pop();
                      changeStack([...stack]); //Need to recreate the [] for react to rerender
                      if (previousState !== undefined) {
                        setUiState(previousState);
                        setWentBack(true);
                      }
                    }}
                    size={"xs"}
                    variant="transparent"
                  >
                    <ArrowLeftIcon size={20} />
                  </ActionIcon>
                )}
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
                mounted={uiState === RegisterUIStates.verify}
                timingFunction="ease"
                transition={
                  wentBack
                    ? uiState === RegisterUIStates.verify
                      ? "slide-right"
                      : "slide-left"
                    : uiState === RegisterUIStates.verify
                      ? "slide-left"
                      : "slide-right"
                }
              >
                {(transitionStyle) => (
                  <Title
                    order={5}
                    style={{ ...transitionStyle, gridArea: "1/1" }}
                  >
                    Verify Your Residency
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
                        placeholder="Alphanumeric (A-Z, 0-9)"
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
                      onClick={() => {
                        const validateFormResults = form.validate();

                        if (!validateFormResults.hasErrors) {
                          setUiState(RegisterUIStates.verify);
                          stack.push(RegisterUIStates.makeAccount);
                          changeStack([...stack]); //Need to recreate the [] for react to rerender
                          setWentBack(false);
                        }
                      }}
                      type="button"
                    >
                      Next
                    </Button>
                  </Stack>
                )}
              </Transition>
              <Transition
                duration={1000}
                enterDelay={300}
                mounted={uiState === RegisterUIStates.verify}
                timingFunction="ease"
                transition={
                  wentBack
                    ? uiState === RegisterUIStates.verify
                      ? "slide-right"
                      : "slide-left"
                    : uiState === RegisterUIStates.verify
                      ? "slide-left"
                      : "slide-right"
                }
              >
                {(transitionStyle) => (
                  <Stack style={{ ...transitionStyle, gridArea: "1/1" }}>
                    <FileInput
                      accept="image/png,image/jpg,image/jpeg"
                      clearable
                      description="Verify your residency by uploading any government-issued ID"
                      placeholder=".png or .jpg files accepted"
                      valueComponent={MakeImagePreview}
                      {...form.getInputProps("proofOfResidency")}
                    />
                    <Button
                      c={"black"}
                      color="buttonColor"
                      form="register-form"
                      onClick={() => {
                        if (form.getValues().proofOfResidency === null) {
                          //Chose to skip verification process
                          openModal();
                        } else {
                          const validateFormResults = form.validate();

                          if (!validateFormResults.hasErrors) {
                            setUiState(RegisterUIStates.success);
                            stack.push(RegisterUIStates.verify);
                            changeStack([...stack]); //Need to recreate the [] for react to rerender
                            setWentBack(false);
                          }
                        }
                      }}
                      type={
                        form.getValues().proofOfResidency === null
                          ? "button"
                          : "submit"
                      }
                    >
                      {form.getValues().proofOfResidency === null
                        ? "Skip and Create Account"
                        : "Confirm and Create Account"}
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
