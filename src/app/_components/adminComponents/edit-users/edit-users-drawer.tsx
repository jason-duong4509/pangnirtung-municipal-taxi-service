"use client";

import {
  Button,
  Divider,
  Drawer,
  Group,
  Input,
  NumberInput,
  Select,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { type UseFormReturnType, useForm } from "@mantine/form";
import { useDisclosure } from "@mantine/hooks";
import {
  CarProfileIcon,
  DeviceMobileIcon,
  EnvelopeSimpleIcon,
  UserIcon,
} from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { IMaskInput } from "react-imask";
import { checkEmail, checkName, checkPhoneNumber } from "~/lib/input-checkers";
import { showNotifications } from "~/lib/mantine-notifications-system";
import { api, type RouterOutputs } from "~/trpc/react";
import { UserRoles } from "~/types/types";
import AlertPopup from "../../common/alert/alert";

type userData = RouterOutputs["users"]["getAll"][0];
type formType = {
  name: string;
  phoneNumber: string;
  role: UserRoles;
  isResident: "Yes" | "No";
  email: string;
  numberOfRides: number;
};

const UserInfo = ({
  userInfo,
  form,
}: {
  userInfo: userData;
  form: UseFormReturnType<formType>;
}) => {
  return (
    <>
      <section>
        <Group justify="space-between">
          <Input.Label>User ID</Input.Label>
          <Text>{userInfo.user.id}</Text>
        </Group>
        <Group justify="space-between">
          <Input.Label>Stripe ID</Input.Label>
          <Text>
            {userInfo.user.stripeCustomerId ??
              "ERROR: No Stripe customer ID associated with this account"}
          </Text>
        </Group>
      </section>

      <Divider
        label="Main Information"
        labelPosition="left"
        mt="xs"
        size={"md"}
      />
      <section>
        <TextInput
          key={form.key("name")}
          leftSection={<UserIcon size={20} />}
          {...form.getInputProps("name")}
          label="Name"
          placeholder="Name"
        />
        <Input.Wrapper
          error={form.errors.phoneNumber}
          label="Primary Phone Number"
        >
          <Input
            component={IMaskInput}
            key={form.key("phoneNumber")}
            mask="(000) 000-0000"
            placeholder="Phone Number"
            {...form.getInputProps("phoneNumber")}
            leftSection={<DeviceMobileIcon size={20} />}
          />
        </Input.Wrapper>
        <Select
          data={[UserRoles.ADMIN, UserRoles.DRIVER, UserRoles.MEMBER]}
          key={form.key("role")}
          placeholder="Role Selection"
          {...form.getInputProps("role")}
          allowDeselect={false}
          label="User Role"
        />
        <Select
          data={["Yes", "No"]}
          key={form.key("isResident")}
          placeholder="Role Selection"
          {...form.getInputProps("isResident")}
          allowDeselect={false}
          label="Is Resident"
        />
      </section>

      <Divider
        label="Extra Information"
        labelPosition="left"
        mt="xs"
        size={"md"}
      />
      <section>
        <TextInput
          key={form.key("email")}
          leftSection={<EnvelopeSimpleIcon size={20} />}
          {...form.getInputProps("email")}
          label="Email Address"
          placeholder="someone@gmail.com"
        />
        <NumberInput
          key={form.key("numberOfRides")}
          leftSection={<CarProfileIcon size={20} />}
          {...form.getInputProps("numberOfRides")}
          label="Ride Credits"
          max={999999999}
          min={0}
          placeholder="Integer"
        />
      </section>
    </>
  );
};

export default function EditUsersDrawer({
  drawerOpened,
  closeDrawer,
  drawerContents,
}: {
  drawerOpened: boolean;
  closeDrawer: () => void;
  drawerContents: userData | undefined;
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
    name: string;
    phoneNumber: string;
    role: UserRoles;
    isResident: "Yes" | "No";
    email: string;
    numberOfRides: number;
  }>({
    mode: "uncontrolled",

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
      name:
        drawerContents["user"].name === "no-name-given.pang"
          ? ""
          : drawerContents["user"].name,
      email: drawerContents["user"].email.includes("@no-email-given.pang")
        ? ""
        : drawerContents["user"].email,
      phoneNumber:
        drawerContents["user"].phoneNumber ??
        "ERROR: User does not have a phone number",
      role: drawerContents["user"].role,
      isResident: drawerContents["profile"].isResident ? "Yes" : "No",
      numberOfRides: drawerContents["profile"].numberOfRides,
    });
    form.setValues({
      name:
        drawerContents["user"].name === "no-name-given.pang"
          ? ""
          : drawerContents["user"].name,
      email: drawerContents["user"].email.includes("@no-email-given.pang")
        ? ""
        : drawerContents["user"].email,
      phoneNumber:
        drawerContents["user"].phoneNumber ??
        "ERROR: User does not have a phone number",
      role: drawerContents["user"].role,
      isResident: drawerContents["profile"].isResident ? "Yes" : "No",
      numberOfRides: drawerContents["profile"].numberOfRides,
    });

    form.resetDirty();
  }, [drawerContents, form.setValues, form.setInitialValues, form.resetDirty]);

  const handleFormOnSubmit = async (values: typeof form.values) => {
    if (formSubmitting || !drawerContents) {
      //If form is already submitting
      return;
    }
    setFormSubmitting(true);

    updateUserMutation.mutate({
      id: drawerContents.user.id,
      name: values.name,
      email: values.email,
      phoneNumber: values.phoneNumber,
      role: values.role,
      isResident: values.isResident === "Yes" ? true : false,
      numberOfRides: values.numberOfRides,
    });
  };

  if (!drawerContents) {
    return;
  }

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
            <UserInfo form={form} userInfo={drawerContents} />
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
                        ids: [drawerContents.user.id],
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
