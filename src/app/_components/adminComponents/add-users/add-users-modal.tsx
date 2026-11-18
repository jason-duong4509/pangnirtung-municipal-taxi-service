"use client";

import {
  Button,
  CloseButton,
  Group,
  Input,
  Loader,
  Modal,
  Stack,
  Title,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { DeviceMobileIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { IMaskInput } from "react-imask";
import { checkPhoneNumber } from "~/lib/input-checkers";
import { showNotifications } from "~/lib/mantine-notifications-system";
import { api } from "~/trpc/react";

export default function AddUsersModal({
  modalOpened,
  closeModal,
}: {
  modalOpened: boolean;
  closeModal: () => void;
}) {
  const [isMutating, setIsMutating] = useState(false);
  const utils = api.useUtils();

  const form = useForm<{
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

  const createUserMutation = api.users.add.useMutation({
    onSuccess: () => {
      showNotifications.success("User created successfully");
      setIsMutating(false);
      form.reset();
      void utils.users.getAll.invalidate(); //Forces the get users table to refetch its data if opened
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

    createUserMutation.mutate({
      phoneNumber: values.phoneNumber,
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
          <Title order={4}>Add a User</Title>
          <CloseButton onClick={closeModal} />
        </Group>
        <Stack>
          <Input.Wrapper error={form.errors.phoneNumber}>
            <Input.Description>Enter the user's phone number</Input.Description>
            <Input
              aria-label="Phone number input"
              component={IMaskInput}
              key={form.key("phoneNumber")}
              mask="(000) 000-0000"
              placeholder="(123)-456-7890"
              {...form.getInputProps("phoneNumber")}
              leftSection={<DeviceMobileIcon size={20} />}
            />
          </Input.Wrapper>
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
            {!isMutating && "Add User"}
            {isMutating && <Loader color="black" size={20} />}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
