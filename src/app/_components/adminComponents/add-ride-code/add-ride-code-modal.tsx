"use client";

import {
  Button,
  CloseButton,
  Group,
  Input,
  Loader,
  Modal,
  NumberInput,
  Stack,
  TextInput,
  Title,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import {
  CarSimpleIcon,
  CoinsIcon,
  DeviceMobileIcon,
} from "@phosphor-icons/react";
import { useState } from "react";
import { IMaskInput } from "react-imask";
import {
  checkPhoneNumber,
  checkRedeemCode,
  checkRideCodeDiscount,
} from "~/lib/input-checkers";
import { showNotifications } from "~/lib/mantine-notifications-system";
import { api } from "~/trpc/react";

export default function AddRideCodeModal({
  modalOpened,
  closeModal,
}: {
  modalOpened: boolean;
  closeModal: () => void;
}) {
  const [isMutating, setIsMutating] = useState(false);
  const utils = api.useUtils();

  const form = useForm<{
    code: string;
    discount: string;
  }>({
    mode: "uncontrolled",

    initialValues: {
      code: "",
      discount: "1",
    },

    validate: {
      code: (value) => {
        const result = checkRedeemCode(value);

        if (result.isProper) {
          return null;
        } else {
          return result.errorMessage;
        }
      },
      discount: (value) => {
        const result = checkRideCodeDiscount(value);

        if (result.isProper) {
          return null;
        } else {
          return result.errorMessage;
        }
      },
    },
  });

  const createRideCodeMutation = api.rideCodes.create.useMutation({
    onSuccess: () => {
      showNotifications.success("Ride code created successfully");
      setIsMutating(false);
      form.reset();
      void utils.rideCodes.getAll.invalidate();
    },
    onError: (error) => {
      showNotifications.error(error.message);
      setIsMutating(false);
    },
  });

  const handleFormOnSubmit = async (values: typeof form.values) => {
    if (isMutating) {
      //If form is already submitting
      return;
    }
    setIsMutating(true);

    createRideCodeMutation.mutate({
      code: values.code,
      discount: `${values.discount}`,
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
        <Group justify="space-between">
          <Title order={4}>Add a Ride Code</Title>
          <CloseButton onClick={closeModal} />
        </Group>
        <Stack>
          <TextInput
            aria-label="New code"
            key={form.key("code")}
            leftSection={<CarSimpleIcon size={20} />}
            {...form.getInputProps("code")}
            placeholder="Unique Ride Code"
          />
          <NumberInput
            aria-label="Discount percentage"
            key={form.key("discount")}
            leftSection={<CoinsIcon size={20} />}
            {...form.getInputProps("discount")}
            defaultValue={1}
            max={100}
            min={1}
            placeholder="Discount Percentage"
            suffix="% off"
          />
        </Stack>
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
            Close
          </Button>
          <Button
            c={"black"}
            color="buttonColor"
            onClick={() => {
              form.validate();
              if (form.isValid()) {
                form.onSubmit(handleFormOnSubmit)();
              }
            }}
            p={0}
            size="compact-sm"
            type="button"
            variant="filled"
          >
            {!isMutating && "Create Code"}
            {isMutating && <Loader color="black" size={20} />}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
