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
import { ShieldCheckIcon } from "@phosphor-icons/react";
import dayjs from "dayjs";
import {
  type Dispatch,
  type SetStateAction,
  useCallback,
  useEffect,
  useState,
} from "react";
import { checkOTP } from "~/lib/input-checkers";
import { showNotifications } from "~/lib/mantine-notifications-system";
import { authClient } from "~/server/better-auth/client";
import { api } from "~/trpc/react";

const MAX_COOLDOWN_SEC = 60;

export default function ChangePhoneNumberModal({
  setChangeSuccess,
  newPhoneNumber,
  modalOpened,
  closeModal,
}: {
  setChangeSuccess: Dispatch<SetStateAction<boolean>>;
  newPhoneNumber: string;
  modalOpened: boolean;
  closeModal: () => void;
}) {
  const [isMutating, setIsMutating] = useState(false);
  const [newOTPCooldown, setNewOTPCooldown] = useState(0);
  const [cooldownEndAt, setCooldownEndAt] = useState<dayjs.Dayjs | null>(null);
  const [lastGivenPhone, setLastGivenPhone] = useState<string>("");

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

  const sendOTP = useCallback(async () => {
    if (
      lastGivenPhone === newPhoneNumber &&
      (newOTPCooldown > 0 || cooldownEndAt !== null)
    ) {
      return;
    }
    const { error } = await authClient.phoneNumber.sendOtp({
      phoneNumber: newPhoneNumber,
    });

    if (error) {
      showNotifications.error(
        error?.message ?? "An error occurred while trying to send an OTP",
      );
    } else {
      setCooldownEndAt(dayjs().add(MAX_COOLDOWN_SEC, "second"));
      setNewOTPCooldown(MAX_COOLDOWN_SEC);
    }
  }, [newPhoneNumber, lastGivenPhone, newOTPCooldown, cooldownEndAt]);

  useEffect(() => {
    if (modalOpened) {
      sendOTP();
      setLastGivenPhone(newPhoneNumber);
    }
  }, [modalOpened, newPhoneNumber, sendOTP]);

  const form = useForm<{
    otp: string;
  }>({
    mode: "uncontrolled",

    initialValues: {
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

  const changePhoneNumberMutation = api.users.changeSelfPhoneNumber.useMutation(
    {
      onSuccess: () => {
        showNotifications.success("Successfully changed phone number");
        setIsMutating(false);
        setChangeSuccess(true);
        form.reset();
        setCooldownEndAt(null);
        setNewOTPCooldown(0);
        closeModal();
      },
      onError: (error) => {
        showNotifications.error(
          error.message ?? "An error occurred when changing phone numbers",
        );
        setIsMutating(false);
        if (error.data?.code === "INTERNAL_SERVER_ERROR") {
          setCooldownEndAt(null);
          setNewOTPCooldown(0);
        }
      },
    },
  );

  const handleCodeSubmit = async (values: typeof form.values) => {
    setIsMutating(true);

    changePhoneNumberMutation.mutate({
      newPhoneNumber: newPhoneNumber,
      otp: values.otp,
    });
  };

  return (
    <Modal
      centered
      onClose={closeModal}
      opened={modalOpened}
      radius={"lg"}
      size={"sm"}
      withCloseButton={false}
      zIndex={300}
    >
      <Stack gap={"lg"} p={"md"}>
        <Title order={4}>Change Phone Number</Title>
        <TextInput
          aria-label="Enter one-time code"
          key={form.key("otp")}
          leftSection={<ShieldCheckIcon size={20} />}
          {...form.getInputProps("otp")}
          description={`Enter the code sent to ${newPhoneNumber} via SMS`}
          placeholder="One-Time Code"
        />
        <Group align="flex-start">
          <Button
            c={"black"}
            fw={"normal"}
            onClick={() => {
              if (newOTPCooldown <= 0 && cooldownEndAt === null) {
                sendOTP();
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
        <Button
          c={"black"}
          color="buttonColor"
          onClick={() => {
            form.validate();
            if (form.isValid()) {
              form.onSubmit(handleCodeSubmit)();
            }
          }}
          type="button"
        >
          {!isMutating && "Submit"}
          {isMutating && <Loader color="black" size={20} />}
        </Button>
      </Stack>
    </Modal>
  );
}
