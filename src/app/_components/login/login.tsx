"use client";
import {
  Button,
  CloseButton,
  Group,
  Loader,
  Modal,
  PasswordInput,
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
import { useRouter } from "next/navigation";
import { useState } from "react";
import { showNotifications } from "~/lib/mantine-notifications-system";
import { authClient } from "~/server/better-auth/client";
import { otpRegex, usernameRegex } from "~/types/validation";

export default function Login() {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const mantineTheme = useMantineTheme();
  const isMobile = useMediaQuery(
    `(max-width: ${mantineTheme.breakpoints.smMd})`,
  );
  const modalStack = useModalsStack([
    "login",
    "verify",
    "forgot_pass_1",
    "forgot_pass_2",
    "log_out",
  ]);
  const [isSubmittingLogin, setIsSubmittingLogin] = useState(false);
  const [isSubmittingOTP, setIsSubmittingOTP] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  //Mantine forms, each submitted to the server at various steps as the user navigates the page
  const loginForm = useForm({
    mode: "uncontrolled",

    initialValues: {
      username: "",
      password: "",
    },
  });
  const oneTimeCodeForm = useForm({
    mode: "uncontrolled",

    initialValues: {
      code: "",
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

  const logOut = async () => {
    setIsLoggingOut(true);
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          showNotifications.success("Log out successful");
          modalStack.closeAll();
          setIsLoggingOut(false);
          window.location.reload();
        },
        onError: (ctx) => {
          showNotifications.error(ctx.error.message);
        },
      },
    });
  };

  //Functions that handles form submit behavior
  const handleLoginSubmit = async (values: typeof loginForm.values) => {
    //--Input check--
    if (
      values.username.length > 20 ||
      values.username.length < 6 ||
      !usernameRegex.test(values.username) ||
      values.password.length < 9
    ) {
      showNotifications.error("Invalid username or password");
      return;
    }
    //---------------

    setIsSubmittingLogin(true);

    const { error } = await authClient.signIn.username({
      username: values.username,
      password: values.password,
    });

    if (error) {
      //Sign in failed
      showNotifications.error(error?.message ?? "An error occurred on login");
    } else {
      //Sign in successful
      const { error } = await authClient.twoFactor.sendOtp();
      if (error) {
        showNotifications.error(
          error.message ?? "An error occurred when sending a OTP",
        );
      } else {
        modalStack.closeAll();
        loginForm.reset();
        modalStack.open("verify");
      }
    }
    setIsSubmittingLogin(false);
  };
  const handleCodeSubmit = async (values: typeof oneTimeCodeForm.values) => {
    //--Input check--
    if (values.code.length !== 6 || !otpRegex.test(values.code)) {
      showNotifications.error("Invalid code");
      return;
    }
    //---------------

    setIsSubmittingOTP(true);

    const { error } = await authClient.twoFactor.verifyOtp({
      code: values.code,
    });

    if (error) {
      showNotifications.error(
        error.message ?? "An error occurred while validating OTP",
      );
    } else {
      showNotifications.success("Login successful");
      modalStack.closeAll();
      window.location.reload();
    }
    setIsSubmittingOTP(false);
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
        onClick={() => {
          if (session) {
            return modalStack.open("log_out");
          } else {
            return modalStack.open("login");
          }
        }}
        radius={"lg"}
        size="xs"
        type="button"
      >
        {!session && "Log in"}
        {session && "Log out"}
      </Button>

      <Modal.Stack>
        <Modal
          centered
          {...modalStack.register("log_out")}
          radius={"lg"}
          size={"sm"}
          withCloseButton={false}
        >
          <Stack gap={"lg"} p={"md"}>
            <Title order={4}>Log Out</Title>
            <Text>Are you sure?</Text>
            <Text>Any incomplete bookings will be lost!</Text>
            <Group grow>
              <Button
                c={"black"}
                color="buttonColor"
                onClick={() => modalStack.closeAll()}
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
                onClick={() => logOut()}
                p={0}
                size="compact-sm"
                type="button"
                variant="filled"
              >
                {isLoggingOut && <Loader color="black" size={20} />}
                {!isLoggingOut && "Log out"}
              </Button>
            </Group>
          </Stack>
        </Modal>
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
                  onClick={() => router.push("/register")}
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
                <PasswordInput
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
              <Button c={"black"} color="buttonColor" type="submit">
                {isSubmittingLogin && <Loader color="black" size={20} />}
                {!isSubmittingLogin && "Log in"}
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
                  description="A code has been sent to your email or phone via SMS. Enter the code below"
                  placeholder="One-Time Code"
                />
                <Group align="flex-start">
                  <Button
                    c={"black"}
                    fw={"normal"}
                    p={0}
                    size="compact-sm"
                    style={{ textDecoration: "underline" }}
                    type="button"
                    variant="transparent"
                  >
                    Request new code
                  </Button>
                </Group>
              </Stack>
              <Button c={"black"} color="buttonColor" type="submit">
                {isSubmittingOTP && <Loader color="black" size={20} />}
                {!isSubmittingOTP && "Submit"}
              </Button>
            </Stack>
          </form>
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
              <CloseButton onClick={() => modalStack.closeAll()} />
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
