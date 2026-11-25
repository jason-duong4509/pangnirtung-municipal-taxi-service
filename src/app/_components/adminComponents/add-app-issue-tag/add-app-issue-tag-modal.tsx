"use client";

import {
  Button,
  CloseButton,
  ColorInput,
  Group,
  Loader,
  Modal,
  Stack,
  TextInput,
  Title,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { TagIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { checkIssueTagColor, checkIssueTagName } from "~/lib/input-checkers";
import { showNotifications } from "~/lib/mantine-notifications-system";
import { api } from "~/trpc/react";

export default function AddAppIssueTagModal({
  modalOpened,
  closeModal,
}: {
  modalOpened: boolean;
  closeModal: () => void;
}) {
  const [isMutating, setIsMutating] = useState(false);
  const utils = api.useUtils();

  const form = useForm<{
    name: string;
    color: string;
  }>({
    mode: "uncontrolled",

    initialValues: {
      name: "",
      color: "",
    },

    validate: {
      name: (value) => {
        const result = checkIssueTagName(value);

        if (result.isProper) {
          return null;
        } else {
          return result.errorMessage;
        }
      },
      color: (value) => {
        const result = checkIssueTagColor(value);

        if (result.isProper) {
          return null;
        } else {
          return result.errorMessage;
        }
      },
    },
  });

  const createTagMutation = api.issueTag.create.useMutation({
    onSuccess: () => {
      showNotifications.success("Tag created successfully");
      setIsMutating(false);
      form.reset();
      void utils.issueTag.getList.invalidate();
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

    createTagMutation.mutate({
      name: values.name,
      color: values.color,
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
          <Title order={4}>Add an Issue Tag</Title>
          <CloseButton onClick={closeModal} />
        </Group>
        <Stack>
          <TextInput
            aria-label="New tag name"
            key={form.key("name")}
            leftSection={<TagIcon size={20} />}
            {...form.getInputProps("name")}
            placeholder="Unique Tag Name"
          />
          <ColorInput
            aria-label="New tag color"
            key={form.key("color")}
            placeholder="Unique Tag Color"
            {...form.getInputProps("color")}
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
            {!isMutating && "Create Tag"}
            {isMutating && <Loader color="black" size={20} />}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
