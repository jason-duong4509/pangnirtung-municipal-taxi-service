"use client";

import {
  Button,
  Drawer,
  Group,
  Select,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useDisclosure } from "@mantine/hooks";
import { useEffect, useState } from "react";
import { dbTimeToPrettyString } from "~/lib/helpers";
import { checkEmail, checkName, checkPhoneNumber } from "~/lib/input-checkers";
import { showNotifications } from "~/lib/mantine-notifications-system";
import { api, type RouterOutputs } from "~/trpc/react";
import { UserRoles } from "~/types/types";
import AlertPopup from "../../common/alert/alert";

type usersData = RouterOutputs["users"]["getAll"][0];

export default function EditUsersDrawer({
  drawerOpened,
  closeDrawer,
  drawerContents,
}: {
  drawerOpened: boolean;
  closeDrawer: () => void;
  drawerContents: usersData | undefined;
}) {
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [alertTitle, setAlertTitle] = useState("Are you sure?");
  const [alertBody, setAlertBody] = useState(<Text>Are you sure?</Text>);
  const [alertOnConfirm, setAlertOnConfirm] = useState<() => void>(() => {});
  const [alertOpened, { open: openAlert, close: closeAlert }] =
    useDisclosure(false);

  const getUsersQuery = api.users.getAll.useQuery(undefined, {
    //Forces manual fetching
    enabled: false,
  });

  const updateUserMutation = api.users.update.useMutation({
    onSuccess: () => {
      showNotifications.success("User updated");
      setFormSubmitting(false);
      getUsersQuery.refetch();
      closeDrawer();
      closeAlert();
    },
    onError: (error) => {
      showNotifications.error(error.message);
      setFormSubmitting(false);
    },
  });

  const deleteUserMutation = api.users.delete.useMutation({
    onSuccess: () => {
      showNotifications.success("Deleted successfully");
      setFormSubmitting(false);
      getUsersQuery.refetch();
      closeDrawer();
      closeAlert();
    },
    onError: (error) => {
      showNotifications.error(error.message);
      setFormSubmitting(false);
    },
  });

  const form = useForm<{
    id: string;
    name: string;
    email: string;
    phoneNumber: string;
    role: UserRoles;
  }>({
    mode: "uncontrolled",

    initialValues: {
      id: "0",
      name: "",
      email: "",
      phoneNumber: "",
      role: UserRoles.MEMBER,
    },

    validate: {
      name: (value) => {
        if (value === "") {
          return null;
        }
        const result = checkName(value);

        if (result.isProper) {
          return null;
        } else {
          return result.errorMessage;
        }
      },
      email: (value) => {
        if (value === "") {
          return null;
        }
        const result = checkEmail(value);

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

  useEffect(() => {
    if (!drawerContents) {
      return;
    }

    form.setInitialValues({
      id: drawerContents.id,
      name:
        drawerContents.name === "no-name-given.pang" ? "" : drawerContents.name,
      email: drawerContents.email.includes("@no-email-given.pang")
        ? ""
        : drawerContents.email,
      phoneNumber:
        drawerContents.phoneNumber ??
        "ERROR: User does not have a phone number",
      role: drawerContents.role,
    });
    form.setValues({
      id: drawerContents.id,
      name:
        drawerContents.name === "no-name-given.pang" ? "" : drawerContents.name,
      email: drawerContents.email.includes("@no-email-given.pang")
        ? ""
        : drawerContents.email,
      phoneNumber:
        drawerContents.phoneNumber ??
        "ERROR: User does not have a phone number",
      role: drawerContents.role,
    });

    form.resetDirty();
  }, [drawerContents, form.setValues, form.setInitialValues, form.resetDirty]);

  const handleFormOnSubmit = async (values: typeof form.values) => {
    if (formSubmitting) {
      //If form is already submitting
      return;
    }
    setFormSubmitting(true);

    updateUserMutation.mutate({
      id: values.id,
      name: values.name,
      email: values.email,
      phoneNumber: values.phoneNumber,
      role: values.role,
    });
  };

  return (
    <>
      <AlertPopup
        abortButtonText={"Back"}
        body={alertBody}
        closeModal={closeAlert}
        confirmButtonText={"Confirm"}
        isLoading={formSubmitting}
        modalOpened={alertOpened}
        onConfirm={alertOnConfirm}
        titleText={alertTitle}
      />
      <Drawer
        offset={8}
        onClose={closeDrawer}
        opened={drawerOpened}
        radius="md"
        styles={{ body: { paddingBottom: 0 } }}
        title={"View User"}
      >
        <form>
          <Stack h={"calc(100dvh - 75px)"}>
            <TextInput
              label="User ID"
              readOnly
              value={form.getValues().id}
              variant="unstyled"
            />
            <TextInput
              label={"Name on Account"}
              placeholder="Name"
              {...form.getInputProps("name")}
              key={form.key("name")}
            />
            <TextInput
              label={"Primary Phone Number"}
              placeholder="123-456-7890"
              {...form.getInputProps("phoneNumber")}
              key={form.key("phoneNumber")}
            />
            <TextInput
              label={"Email"}
              placeholder="someone@email.com"
              {...form.getInputProps("email")}
              key={form.key("email")}
            />
            <Select
              data={Object.values(UserRoles)}
              key={form.key("role")}
              label="User Role"
              placeholder="Select Role"
              {...form.getInputProps("role")}
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
                  onClick={() => {
                    setAlertTitle("Delete User");
                    setAlertBody(
                      <Text>
                        Delete this user? This action cannot be undone!
                      </Text>,
                    );
                    setAlertOnConfirm(() => () => {
                      setFormSubmitting(true);
                      deleteUserMutation.mutate({
                        ids: [form.getValues().id],
                      });
                    });
                    openAlert();
                  }}
                  p={0}
                  size="compact-sm"
                  type="button"
                  variant="outline"
                >
                  Delete User
                </Button>
                <Button
                  c={form.isDirty() ? "black" : undefined}
                  color="buttonColor"
                  disabled={!form.isDirty()}
                  onClick={() => {
                    form.validate();
                    if (form.isValid()) {
                      setAlertTitle("Update User");
                      setAlertBody(<Text>Update this user?</Text>);
                      setAlertOnConfirm(
                        () => () => form.onSubmit(handleFormOnSubmit)(),
                      );
                      openAlert();
                    }
                  }}
                  p={0}
                  size="compact-sm"
                  type="button"
                  variant="filled"
                >
                  Update User
                </Button>
              </Group>
            </Stack>
          </Stack>
        </form>
      </Drawer>
    </>
  );
}
