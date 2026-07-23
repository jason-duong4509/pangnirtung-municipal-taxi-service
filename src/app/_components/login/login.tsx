"use client";
import {
  Button,
  Group,
  Modal,
  Stack,
  Text,
  TextInput,
  Title,
  useMantineTheme,
  useModalsStack,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useMediaQuery } from "@mantine/hooks";
import {
  LockSimpleIcon,
  PaperPlaneTiltIcon,
  ShieldCheckIcon,
  UserIcon,
} from "@phosphor-icons/react";

export default function Login() {
  const mantineTheme = useMantineTheme();
  const isMobile = useMediaQuery(
    `(max-width: ${mantineTheme.breakpoints.smMd})`,
  );
  const modalStack = useModalsStack([
    "login",
    "verify",
    "notice",
    "forgot_pass_1",
    "forgot_pass_2",
  ]); //notice state to be moved and controlled by server result later

  //Mantine forms, each submitted to the server at various steps as the user navigates the page
  const loginForm = useForm({
    mode: "uncontrolled",

    initialValues: {
      username: "",
      password: "",
    },

    validate: {
      username: (value) => (value.length === 0 ? "Username required" : null),
      password: (value) => (value.length === 0 ? "Password required" : null),
    },
  });
  const oneTimeCodeForm = useForm({
    mode: "uncontrolled",

    initialValues: {
      code: "",
    },

    validate: {
      code: (value) => (value.length === 0 ? "Code required" : null),
    },
  });
  const resetAccountForm = useForm({
    mode: "uncontrolled",

    initialValues: {
      emailOrPhone: "",
    },

    validate: {
      emailOrPhone: (value) => (value.length === 0 ? "Cannot be blank" : null),
    },
  });

  //Functions that handles form submit behavior
  const handleLoginSubmit = async (values: typeof loginForm.values) => {
    console.log(values);
  };
  const handleCodeSubmit = async (values: typeof oneTimeCodeForm.values) => {
    console.log(values);
  };
  const handleResetAccountSubmit = async (
    values: typeof resetAccountForm.values,
  ) => {
    console.log(values);
  };

  return (
    <>
      <Button
        c={"black"}
        color={isMobile ? "buttonColor" : "customWhite"}
        onClick={() => modalStack.open("login")}
        radius={"lg"}
        size="xs"
        type="button"
      >
        Log in
      </Button>

      <Modal.Stack>
        <Modal
          centered
          radius={"lg"}
          size={"sm"}
          withCloseButton={false}
          {...modalStack.register("login")}
        >
          <form onSubmit={loginForm.onSubmit(handleLoginSubmit)}>
            <Stack gap={"lg"} p={"md"}>
              <Group justify="space-between">
                <Title order={4}>Login</Title>
                <Button
                  c={"black"}
                  fw={"normal"}
                  p={0}
                  size="compact-sm"
                  style={{ textDecoration: "underline" }}
                  variant="transparent"
                >
                  Sign-Up
                </Button>
              </Group>
              <Stack>
                <TextInput
                  aria-label="Username input field"
                  key={loginForm.key("username")}
                  leftSection={<UserIcon size={20} />}
                  {...loginForm.getInputProps("username")}
                  placeholder="Username"
                />
                <TextInput
                  aria-label="Password input field"
                  key={loginForm.key("password")}
                  leftSection={<LockSimpleIcon size={20} />}
                  {...loginForm.getInputProps("password")}
                  placeholder="Password"
                />
                <Group align="flex-start">
                  <Button
                    c={"black"}
                    fw={"normal"}
                    onClick={() => modalStack.open("forgot_pass_1")}
                    p={0}
                    size="compact-sm"
                    style={{ textDecoration: "underline" }}
                    type="button"
                    variant="transparent"
                  >
                    Forgot Username or Password
                  </Button>
                </Group>
              </Stack>
              <Button
                c={"black"}
                color="buttonColor"
                onClick={() => {
                  modalStack.closeAll();
                  modalStack.open("verify");
                }}
                type="submit"
              >
                Log in
              </Button>
            </Stack>
          </form>
        </Modal>
        <Modal
          centered
          radius={"lg"}
          size={"sm"}
          withCloseButton={false}
          {...modalStack.register("verify")}
        >
          <form onSubmit={oneTimeCodeForm.onSubmit(handleCodeSubmit)}>
            <Stack gap={"lg"} p={"md"}>
              <Group justify="space-between">
                <Title order={4}>Verify</Title>
              </Group>
              <Stack>
                <TextInput
                  aria-label="One-Time Code Input Field"
                  key={oneTimeCodeForm.key("code")}
                  leftSection={<ShieldCheckIcon size={20} />}
                  {...oneTimeCodeForm.getInputProps("code")}
                  description="Enter the code sent to this account's [email/phone number via SMS]"
                  placeholder="Enter One-Time Code"
                />
                <Group align="flex-start">
                  <Button
                    c={"black"}
                    fw={"normal"}
                    p={0}
                    size="compact-sm"
                    style={{ textDecoration: "underline" }}
                    variant="transparent"
                  >
                    Request new code
                  </Button>
                </Group>
              </Stack>
              <Button
                c={"black"}
                color="buttonColor"
                onClick={() => {
                  modalStack.closeAll();
                  modalStack.open("notice");
                }}
                type="submit"
              >
                Submit
              </Button>
            </Stack>
          </form>
        </Modal>
        <Modal
          centered
          radius={"lg"}
          size={"sm"}
          withCloseButton={false}
          {...modalStack.register("notice")}
        >
          <Stack gap={"lg"} p={"md"}>
            <Group justify="space-between">
              <Title order={4}>Note</Title>
            </Group>
            <Stack>
              <Text>You have successfully logged in</Text>
              <Text>
                Your residency status is still under review. This account cannot
                access discounted rides until residency has been verified
              </Text>
            </Stack>
            <Button
              c={"black"}
              color="buttonColor"
              onClick={() => {
                modalStack.closeAll();
              }}
              type="button"
            >
              I understand
            </Button>
          </Stack>
        </Modal>
        <Modal
          centered
          radius={"lg"}
          size={"sm"}
          withCloseButton={false}
          {...modalStack.register("forgot_pass_1")}
        >
          <form onSubmit={resetAccountForm.onSubmit(handleResetAccountSubmit)}>
            <Stack gap={"lg"} p={"md"}>
              <Group justify="space-between">
                <Title order={4}>Enter Email or Phone Number</Title>
              </Group>
              <TextInput
                aria-label="Input Field"
                key={resetAccountForm.key("emailOrPhone")}
                leftSection={<PaperPlaneTiltIcon size={20} />}
                {...resetAccountForm.getInputProps("emailOrPhone")}
                description="Instructions will be sent to the email address or phone number below"
                placeholder="Email or Phone Number"
              />
              <Button
                c={"black"}
                color="buttonColor"
                onClick={() => {
                  modalStack.closeAll();
                  modalStack.open("forgot_pass_2");
                }}
                type="submit"
              >
                Continue
              </Button>
            </Stack>
          </form>
        </Modal>
        <Modal
          centered
          radius={"lg"}
          size={"sm"}
          withCloseButton={false}
          {...modalStack.register("forgot_pass_2")}
        >
          <Stack gap={"lg"} p={"md"}>
            <Group justify="space-between">
              <Title order={4}>Success</Title>
            </Group>
            <Stack>
              <Text>
                Instructions for resetting your account have been sent if the
                email or phone number provided matches our records
              </Text>
            </Stack>
          </Stack>
        </Modal>
      </Modal.Stack>
    </>
  );
}
