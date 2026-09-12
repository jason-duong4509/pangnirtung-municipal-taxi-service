"use client";

import {
  Button,
  Chip,
  Drawer,
  Group,
  Input,
  Rating,
  Stack,
  Text,
  Textarea,
  TextInput,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useDisclosure } from "@mantine/hooks";
import { useEffect, useState } from "react";
import { dbTimeToPrettyString } from "~/lib/helpers";
import {
  checkReportAppPriority,
  checkReportAppTags,
  checkReportAppTitle,
} from "~/lib/input-checkers";
import { showNotifications } from "~/lib/mantine-notifications-system";
import { api, type RouterOutputs } from "~/trpc/react";
import { ReportAppIssueChipTypes } from "~/types/types";
import AlertPopup from "../../common/alert/alert";

type issuesData = RouterOutputs["reportApp"]["get"][0];

export default function ViewAppIssuesDrawer({
  drawerOpened,
  closeDrawer,
  drawerContents,
}: {
  drawerOpened: boolean;
  closeDrawer: () => void;
  drawerContents: issuesData | undefined;
}) {
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [modalOpened, { open: openModal, close: closeModal }] =
    useDisclosure(false);

  const getIssuesQuery = api.reportApp.get.useQuery(undefined, {
    //Forces manual fetching
    enabled: false,
  });

  const updateIssueMutation = api.reportApp.update.useMutation({
    onSuccess: () => {
      showNotifications.success("Issue updated");
      setFormSubmitting(false);
      getIssuesQuery.refetch();
      closeDrawer();
      closeModal();
    },
    onError: (error) => {
      showNotifications.error(error.message);
      setFormSubmitting(false);
    },
  });

  const form = useForm<{
    title: string;
    priority: number;
    tags: string[];
    id: number;
  }>({
    mode: "uncontrolled",

    initialValues: {
      title: "",
      priority: 1,
      tags: [],
      id: 0,
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
      priority: (value) => {
        const result = checkReportAppPriority(value);

        if (result.isProper) {
          return null;
        } else {
          return result.errorMessage;
        }
      },
      tags: (value) => {
        const result = checkReportAppTags(value);

        if (result.isProper) {
          return null;
        } else {
          return result.errorMessage;
        }
      },
    },
  });

  useEffect(() => {
    if (!drawerContents) {
      return;
    }

    //Get tag data
    const tagsList = drawerContents.appIssuesHasTags;
    let usedTags = [] as string[];
    for (const tag of tagsList) {
      usedTags = [...usedTags, tag.appIssuesTags.name];
    }

    //--Prefill mantine form with issue data--
    form.setInitialValues({
      title: drawerContents.title,
      priority: drawerContents.priority,
      tags: usedTags,
      id: drawerContents.id,
    });
    form.setValues({
      title: drawerContents.title,
      priority: drawerContents.priority,
      tags: usedTags,
      id: drawerContents.id,
    });
    //----------------------------------------

    form.resetDirty();
  }, [drawerContents, form.setValues, form.setInitialValues, form.resetDirty]);

  const handleFormOnSubmit = async (values: typeof form.values) => {
    if (formSubmitting) {
      //If form is already submitting
      return;
    }
    setFormSubmitting(true);

    updateIssueMutation.mutate({
      title: values.title,
      priority: values.priority,
      tags: values.tags,
      id: values.id,
    });
  };

  return (
    <>
      <AlertPopup
        abortButtonText={"Back"}
        body={<Text>Changes will be made. Are you sure?</Text>}
        closeModal={closeModal}
        confirmButtonText={"Confirm"}
        isLoading={formSubmitting}
        modalOpened={modalOpened}
        onConfirm={() => form.onSubmit(handleFormOnSubmit)()}
        titleText={"Confirm Action"}
      />
      <Drawer
        offset={8}
        onClose={closeDrawer}
        opened={drawerOpened}
        radius="md"
        styles={{ body: { paddingBottom: 0 } }}
        title={"View Issue"}
      >
        <form onSubmit={form.onSubmit(handleFormOnSubmit)}>
          <Stack h={"calc(100dvh - 75px)"}>
            <TextInput
              label="App Issue ID"
              readOnly
              value={form.getValues().id}
              variant="unstyled"
            />
            <TextInput
              label={"Title"}
              placeholder="Max 100 characters"
              {...form.getInputProps("title")}
              key={form.key("title")}
            />
            <Input.Wrapper label="Priority Rating">
              <Stack gap={"xs"}>
                <Rating
                  key={form.key("priority")}
                  {...form.getInputProps("priority")}
                />
                <Input.Error>{form.errors.priority}</Input.Error>
              </Stack>
            </Input.Wrapper>
            <Input.Wrapper label="Tags">
              <Stack gap={"xs"}>
                <Chip.Group
                  key={form.key("tags")}
                  multiple
                  {...form.getInputProps("tags")}
                >
                  <Group justify="flex-start" mt="md">
                    {ReportAppIssueChipTypes.map((chipType) => (
                      <Chip
                        color={chipType.chip_color}
                        key={chipType.label}
                        value={chipType.label}
                      >
                        {chipType.label}
                      </Chip>
                    ))}
                  </Group>
                </Chip.Group>
                <Input.Error>{form.errors.tags}</Input.Error>
              </Stack>
            </Input.Wrapper>
            <Textarea
              autosize
              label="Comments"
              maxRows={10}
              minRows={1}
              readOnly
              resize="vertical"
              value={
                drawerContents
                  ? drawerContents.comments
                  : "Unable to fetch data"
              }
              variant="unstyled"
            />
            <TextInput
              label="Created On"
              readOnly
              value={
                drawerContents
                  ? dbTimeToPrettyString(drawerContents.createdAt)
                  : "Unable to fetch data"
              }
              variant="unstyled"
            />
            <TextInput
              label="Last Updated"
              readOnly
              value={
                drawerContents
                  ? dbTimeToPrettyString(drawerContents.updatedAt)
                  : "Unable to fetch data"
              }
              variant="unstyled"
            />
            <Stack bottom={"0%"} flex={1} justify="flex-end" pos={"sticky"}>
              <Group bg={"primaryColor"} grow py={"md"}>
                <Button
                  c={"black"}
                  color="buttonColor"
                  onClick={() => closeDrawer()}
                  p={0}
                  size="compact-sm"
                  type="button"
                  variant="outline"
                >
                  Exit
                </Button>
                <Button
                  c={form.isDirty() ? "black" : undefined}
                  color="buttonColor"
                  disabled={!form.isDirty()}
                  onClick={() => {
                    form.validate();
                    if (form.isValid()) {
                      openModal();
                    }
                  }}
                  p={0}
                  size="compact-sm"
                  type="button"
                  variant="filled"
                >
                  Save Changes
                </Button>
              </Group>
            </Stack>
          </Stack>
        </form>
      </Drawer>
    </>
  );
}
