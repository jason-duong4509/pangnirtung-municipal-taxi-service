"use client";
import {
  Button,
  Group,
  Loader,
  Modal,
  Stack,
  TextInput,
  Title,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useDisclosure } from "@mantine/hooks";
import { DeviceMobileIcon, ShieldCheckIcon } from "@phosphor-icons/react";
import dayjs from "dayjs";
import { useEffect, useState } from "react";
import { checkOTP, checkPhoneNumber } from "~/lib/input-checkers";
import { showNotifications } from "~/lib/mantine-notifications-system";
import { authClient } from "~/server/better-auth/client";

const MAX_COOLDOWN_SEC = 60;

export default function LoginModal({
  loginModalOpened,
  closeLoginModal,
}: {
  loginModalOpened: boolean;
  closeLoginModal: () => void;
}) {
  const [isMutating, setIsMutating] = useState(false);
  const [
    verifyModalOpened,
    { open: openVerifyModal, close: closeVerifyModal },
  ] = useDisclosure(false);
  const [newOTPCooldown, setNewOTPCooldown] = useState(0);
  const [cooldownEndAt, setCooldownEndAt] = useState<dayjs.Dayjs | null>(null);

  //use effect that decrements cooldown
  useEffect(() => {
    if (!cooldownEndAt) {
      //no cooldown to decrement
      return;
    }

    const intervalId = setInterval(() => {
      const timeDifference = cooldownEndAt.diff(dayjs(), "second"); //Get the difference in seconds from the cooldown end to now

      if (timeDifference <= 0) {
        //cooldown done
        setNewOTPCooldown(0);
        setCooldownEndAt(null);
      } else {
        setNewOTPCooldown(timeDifference);
      }
    }, 1000);
    return () => clearInterval(intervalId);
  }, [cooldownEndAt]);

  const loginForm = useForm<{
    phoneNumber: string;
  }>({
    mode: "uncontrolled",

    initialValues: {
      phoneNumber: "",
    },

    validate: {
      phoneNumber: (value) => {
        const result = checkPhoneNumber(value);

        if (result.isProper) {
          return null;
        } else {
          return result.errorMessage;
        }
      },
    },
  });

  const otpForm = useForm<{
    phoneNumber: string;
    otp: string;
  }>({
    mode: "uncontrolled",

    initialValues: {
      phoneNumber: "",
      otp: "",
    },

    validate: {
      otp: (value) => {
        const result = checkOTP(value);

        if (result.isProper) {
          return null;
        } else {
          return result.errorMessage;
        }
      },
    },
  });

  const handleLoginSubmit = async (values: typeof loginForm.values) => {
    const resubmitOnCooldown =
      values.phoneNumber === otpForm.values.phoneNumber && newOTPCooldown > 0;
    if (resubmitOnCooldown) {
      closeLoginModal();
      openVerifyModal();
      loginForm.reset();
      return;
    } else if (loginModalOpened) {
      setIsMutating(true);
      //Normalize the input
      const result = checkPhoneNumber(values.phoneNumber);

      if (result.isProper) {
        values.phoneNumber = result.formattedInput;
      } else {
        showNotifications.error(result.errorMessage);
        return;
      }
    }

    const { error } = await authClient.phoneNumber.sendOtp({
      phoneNumber: loginModalOpened
        ? values.phoneNumber
        : otpForm.values.phoneNumber,
    });

    if (error) {
      showNotifications.error(error?.message ?? "An error occurred on login");
      setCooldownEndAt(null);
      setNewOTPCooldown(0);
    } else if (loginModalOpened) {
      closeLoginModal();
      otpForm.setValues({ phoneNumber: values.phoneNumber });
      loginForm.reset();
      openVerifyModal();
      setCooldownEndAt(dayjs().add(MAX_COOLDOWN_SEC, "second"));
      setNewOTPCooldown(MAX_COOLDOWN_SEC);
    }
    setIsMutating(false);
  };

  const handleCodeSubmit = async (values: typeof otpForm.values) => {
    setIsMutating(true);

    const { error } = await authClient.phoneNumber.verify({
      phoneNumber: values.phoneNumber,
      code: values.otp,
    });

    if (error) {
      showNotifications.error(
        error?.message ?? "An error occurred when validating OTP",
      );
    } else {
      closeVerifyModal();
      otpForm.reset();
      showNotifications.success("Successfully logged in");
    }
    setIsMutating(false);
  };

  return (
    <>
      <Modal
        centered
        onClose={closeLoginModal}
        opened={loginModalOpened}
        radius={"lg"}
        size={"sm"}
        withCloseButton={false}
      >
        <form onSubmit={loginForm.onSubmit(handleLoginSubmit)}>
          <Stack gap={"lg"} p={"md"}>
            <Title order={4}>Login</Title>
            <TextInput
              aria-label="Enter your phone number"
              key={loginForm.key("phoneNumber")}
              leftSection={<DeviceMobileIcon size={20} />}
              {...loginForm.getInputProps("phoneNumber")}
              placeholder="123-456-7890"
            />
            <Button c={"black"} color="buttonColor" type="submit">
              {!isMutating && "Log in"}
              {isMutating && <Loader color="black" size={20} />}
            </Button>
          </Stack>
        </form>
      </Modal>
      <Modal
        centered
        onClose={closeVerifyModal}
        opened={verifyModalOpened}
        radius={"lg"}
        size={"sm"}
        withCloseButton={false}
      >
        <form onSubmit={otpForm.onSubmit(handleCodeSubmit)}>
          <Stack gap={"lg"} p={"md"}>
            <Title order={4}>Verify</Title>
            <TextInput
              aria-label="Enter one-time code"
              key={otpForm.key("otp")}
              leftSection={<ShieldCheckIcon size={20} />}
              {...otpForm.getInputProps("otp")}
              description="Enter the code sent to this phone number via SMS"
              placeholder="One-Time Code"
            />
            <Group align="flex-start">
              <Button
                c={"black"}
                fw={"normal"}
                onClick={() => {
                  if (newOTPCooldown <= 0) {
                    handleLoginSubmit(loginForm.values);
                    setCooldownEndAt(dayjs().add(MAX_COOLDOWN_SEC, "second"));
                    setNewOTPCooldown(MAX_COOLDOWN_SEC);
                  }
                }}
                p={0}
                size="compact-sm"
                style={{ textDecoration: "underline" }}
                type="button"
                variant="transparent"
              >
                {newOTPCooldown <= 0 && "Request new code"}
                {newOTPCooldown > 0 && `Cooldown (${newOTPCooldown})`}
              </Button>
            </Group>
            <Button c={"black"} color="buttonColor" type="submit">
              {!isMutating && "Submit"}
              {isMutating && <Loader color="black" size={20} />}
            </Button>
          </Stack>
        </form>
      </Modal>
    </>
  );
}
