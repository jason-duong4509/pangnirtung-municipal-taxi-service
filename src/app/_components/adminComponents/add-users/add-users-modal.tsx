"use client";

import {
  Button,
  CloseButton,
  Group,
  Loader,
  Modal,
  Stack,
  TextInput,
  Title,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useState } from "react";
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

  const getUsersQuery = api.users.getAll.useQuery(undefined, {
    //Forces manual fetching
    enabled: false,
  });

  const createUserMutation = api.users.add.useMutation({
    onSuccess: () => {
      showNotifications.success("User created successfully");
      setIsMutating(false);
      getUsersQuery.refetch();
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
          <TextInput
            aria-label="Phone number input"
            description="Enter the user's phone number"
            placeholder="123-456-7890"
            {...form.getInputProps("phoneNumber")}
            key={form.key("phoneNumber")}
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
            {!isMutating && "Add User"}
            {isMutating && <Loader color="black" size={20} />}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
