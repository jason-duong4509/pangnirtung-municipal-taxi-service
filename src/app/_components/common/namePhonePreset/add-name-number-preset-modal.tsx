"use client";

import {
  Button,
  CloseButton,
  Fieldset,
  Group,
  Input,
  Loader,
  Modal,
  Stack,
  TextInput,
  Title,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { DeviceMobileIcon, UserIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { IMaskInput } from "react-imask";
import { checkName, checkPhoneNumber } from "~/lib/input-checkers";
import { showNotifications } from "~/lib/mantine-notifications-system";
import { api } from "~/trpc/react";

export default function AddNameNumberPresetModal({
  modalOpened,
  closeModal,
  openMainModal,
}: {
  modalOpened: boolean;
  closeModal: () => void;
  openMainModal: () => void;
}) {
  const [formSubmitting, setFormSubmitting] = useState(false);

  const form = useForm<{
    name: string;
    phoneNumber: string;
  }>({
    mode: "uncontrolled",

    initialValues: {
      name: "",
      phoneNumber: "",
    },

    validate: {
      name: (value) => {
        const result = checkName(value);

        if (result.isProper) {
          return null;
        } else {
          return result.errorMessage;
        }
      },
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

  const addPresetMutation = api.profile.addPreset.useMutation({
    onSuccess: () => {
      showNotifications.success("Added successfully");
      setFormSubmitting(false);
      form.reset();
    },
    onError: (error) => {
      showNotifications.error(error.message);
      setFormSubmitting(false);
    },
  });

  const handleFormOnSubmit = async (values: typeof form.values) => {
    if (formSubmitting) {
      return;
    }
    setFormSubmitting(true);

    addPresetMutation.mutate({
      name: values.name,
      phoneNumber: values.phoneNumber,
    });
  };

  return (
    <Modal
      centered
      onClose={() => {
        closeModal();
        openMainModal();
      }}
      opened={modalOpened}
      radius={"lg"}
      size={"md"}
      withCloseButton={false}
    >
      <Stack gap={"lg"} p={"md"}>
        <header>
          <Group justify="space-between">
            <Title order={4}>Add a Preset</Title>
            <CloseButton
              onClick={() => {
                closeModal();
                openMainModal();
              }}
            />
          </Group>
        </header>
        <main>
          <TextInput
            key={form.key("name")}
            label="Contact Name"
            leftSection={<UserIcon size={20} />}
            required
            {...form.getInputProps("name")}
            placeholder="Name"
          />
          <Input.Wrapper
            aria-label="Contact number"
            error={form.errors.phoneNumber}
          >
            <Input.Label required>Contact Number</Input.Label>
            <Input
              component={IMaskInput}
              key={form.key("phoneNumber")}
              mask="(000) 000-0000"
              placeholder="(123)-456-7890"
              {...form.getInputProps("phoneNumber")}
              leftSection={<DeviceMobileIcon size={20} />}
            />
          </Input.Wrapper>
        </main>
        <footer>
          <Group grow>
            <Button
              c={"black"}
              color="buttonColor"
              onClick={() => form.onSubmit(handleFormOnSubmit)()}
              p={0}
              size="compact-sm"
              type="submit"
              variant="filled"
            >
              {!formSubmitting && "Add Preset"}
              {formSubmitting && <Loader color="black" size={20} />}
            </Button>
          </Group>
        </footer>
      </Stack>
    </Modal>
  );
}
