"use client";
import {
  Button,
  CloseButton,
  Group,
  Loader,
  Modal,
  Stack,
  Text,
  Textarea,
  TextInput,
  Title,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useState } from "react";
import {
  checkReportAppComments,
  checkReportAppTitle,
} from "~/lib/input-checkers";
import { showNotifications } from "~/lib/mantine-notifications-system";
import { api } from "~/trpc/react";

export default function ReportAppIssueModal({
  modalOpened,
  closeModal,
}: {
  modalOpened: boolean;
  closeModal: () => void;
}) {
  const [formSubmitting, setFormSubmitting] = useState(false);

  //Configure form
  const form = useForm<{
    title: string;
    comments: string;
  }>({
    mode: "uncontrolled",

    //Initial field values of form
    initialValues: {
      title: "",
      comments: "",
    },

    //Frontend field checks
    validate: {
      title: (value) => {
        const result = checkReportAppTitle(value);

        if (result.isProper) {
          return null;
        } else {
          return result.errorMessage;
        }
      },
      comments: (value) => {
        const result = checkReportAppComments(value);

        if (result.isProper) {
          return null;
        } else {
          return result.errorMessage;
        }
      },
    },
  });

  //Create issue mutation
  const createIssuesMutation = api.reportApp.createIssue.useMutation({
    onSuccess: () => {
      showNotifications.success("Successfully sent");
      setFormSubmitting(false);
      form.reset();
    },
    onError: (error) => {
      showNotifications.error(error.message);
      setFormSubmitting(false);
    },
  });

  //Handles form submit behavior
  const handleFormSubmit = async (values: typeof form.values) => {
    if (formSubmitting) {
      return;
    }
    setFormSubmitting(true);

    createIssuesMutation.mutate({
      title: values.title,
      comments: values.comments,
    });
  };

  return (
    <Modal
      centered
      onClose={closeModal}
      opened={modalOpened}
      radius={"lg"}
      size={"lg"}
      withCloseButton={false}
    >
      <form onSubmit={form.onSubmit(handleFormSubmit)}>
        <Stack gap={"lg"} p={"md"}>
          <header>
            <Group justify="space-between">
              <Title order={4}>Report an App Issue</Title>
              <CloseButton onClick={closeModal} />
            </Group>
          </header>
          <main>
            <Stack gap={"xs"}>
              <Text>
                Found an issue with the app? Want to suggest new features or
                changes? Send them our way below!
              </Text>
              <TextInput
                key={form.key("title")}
                label="Title"
                {...form.getInputProps("title")}
                placeholder="Max. 100 characters"
                withAsterisk
              />
              <Textarea
                key={form.key("comments")}
                label="Comments"
                {...form.getInputProps("comments")}
                autosize
                maxRows={10}
                minRows={1}
                placeholder="Max. 1,000 characters"
                withAsterisk
              />
            </Stack>
          </main>
          <footer>
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
                Back
              </Button>
              <Button
                c={"black"}
                color="buttonColor"
                p={0}
                size="compact-sm"
                type="submit"
                variant="filled"
              >
                {!formSubmitting && "Submit"}
                {formSubmitting && <Loader color="black" size={20} />}
              </Button>
            </Group>
          </footer>
        </Stack>
      </form>
    </Modal>
  );
}
