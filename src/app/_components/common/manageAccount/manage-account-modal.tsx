"use client";

import {
  Accordion,
  Button,
  CloseButton,
  Flex,
  Group,
  Input,
  Modal,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useDisclosure, useMediaQuery } from "@mantine/hooks";
import { LockSimpleIcon, MoneyWavyIcon, UserIcon } from "@phosphor-icons/react";
import { type JSX, useCallback, useEffect, useState } from "react";
import { IMaskInput } from "react-imask";
import { checkEmail, checkName, checkPhoneNumber } from "~/lib/input-checkers";
import { showNotifications } from "~/lib/mantine-notifications-system";
import { api } from "~/trpc/react";
import { UserRoles } from "~/types/types";
import AlertPopup from "../alert/alert";
import ChangePhoneNumberModal from "../changePhoneNumber/change-phone-number";

function AccordionLabel({
  label,
  icon,
  description,
}: {
  label: string;
  icon: JSX.Element;
  description: string;
}) {
  return (
    <Group wrap="nowrap">
      {icon}
      <div>
        <Text>{label}</Text>
        <Text c="dimmed" fw={400} size="sm">
          {description}
        </Text>
      </div>
    </Group>
  );
}

export default function ManageAccountModal({
  modalOpened,
  closeModal,
}: {
  modalOpened: boolean;
  closeModal: () => void;
}) {
  const [isMutating, setIsMutating] = useState(false);
  const isTablet = useMediaQuery("(max-width: 900px)");
  const isPhone = useMediaQuery("(max-width: 500px)");
  const [alertModalOpened, { open: openAlertModal, close: closeAlertModal }] =
    useDisclosure(false);
  const [
    changePhoneModalOpened,
    { open: openChangePhoneModal, close: closeChangePhoneModal },
  ] = useDisclosure(false);
  const [changePhoneSuccess, setChangePhoneSuccess] = useState(false);
  const utils = api.useUtils();

  const getUsersQuery = api.users.getSelf.useQuery(undefined, {
    //Forces manual fetching
    enabled: false,
  });

  const updateUserMutation = api.users.updateSelf.useMutation({
    onSuccess: () => {
      showNotifications.success("Updated successfully");
      setIsMutating(false);
      void utils.users.getAll.invalidate(); //Forces the get users table to refetch its data if opened
      closeModal();
      closeAlertModal();
    },
    onError: (error) => {
      showNotifications.error(error.message);
      setIsMutating(false);
    },
  });

  useEffect(() => {
    if (modalOpened) {
      getUsersQuery.refetch();
    }
  }, [modalOpened, getUsersQuery.refetch]);

  const phoneForm = useForm<{
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

  const form = useForm<{
    name: string;
    email: string;
    role: UserRoles | undefined;
    isResident: boolean | undefined;
    numberOfRides: number;
  }>({
    mode: "uncontrolled",

    initialValues: {
      name: "",
      email: "",
      role: undefined,
      isResident: undefined,
      numberOfRides: 0,
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
    },
  });

  useEffect(() => {
    if (!getUsersQuery.isFetching && getUsersQuery.error) {
      showNotifications.error(
        getUsersQuery.error.message ??
          "An error occurred while fetching user data",
      );
    } else if (
      !getUsersQuery.isFetching &&
      getUsersQuery.data &&
      getUsersQuery.data[0]
    ) {
      const user = getUsersQuery.data[0]["user"];
      const profile = getUsersQuery.data[0]["profile"];

      form.setInitialValues({
        name: user.name === "no-name-given.pang" ? "" : user.name,
        email: user.email.includes("@no-email-given.pang") ? "" : user.email,
        role: user.role,
        isResident: profile.isResident,
        numberOfRides: profile.numberOfRides,
      });
      form.setValues({
        name: user.name === "no-name-given.pang" ? "" : user.name,
        email: user.email.includes("@no-email-given.pang") ? "" : user.email,
        role: user.role,
        isResident: profile.isResident,
        numberOfRides: profile.numberOfRides,
      });
      phoneForm.setInitialValues({
        phoneNumber: user.phoneNumber ?? "",
      });
      phoneForm.setValues({
        phoneNumber: user.phoneNumber ?? "",
      });
      phoneForm.reset();
      form.reset();
    }
  }, [
    getUsersQuery.error,
    getUsersQuery.isFetching,
    getUsersQuery.data,
    form.setInitialValues,
    phoneForm.setInitialValues,
    form.setValues,
    phoneForm.setValues,
    phoneForm.reset,
    form.reset,
  ]);

  const handleFormOnSubmit = useCallback(
    async (values: typeof form.values) => {
      if (isMutating) {
        //If form is already submitting
        return;
      }
      setIsMutating(true);

      updateUserMutation.mutate({
        name: values.name,
        email: values.email,
      });
    },
    [updateUserMutation.mutate, isMutating],
  );

  useEffect(() => {
    if (changePhoneSuccess) {
      setChangePhoneSuccess(false);
      if (form.isDirty()) {
        openAlertModal();
        form.onSubmit(handleFormOnSubmit)(); //Call the form submit to change the other values

        phoneForm.setInitialValues({
          phoneNumber: phoneForm.getValues().phoneNumber,
        });
        phoneForm.reset();
      } else {
        void utils.users.getAll.invalidate(); //Forces the get users table to refetch its data if opened
        closeModal();
      }
    }
  }, [
    changePhoneSuccess,
    form.isDirty,
    openAlertModal,
    utils.users.getAll.invalidate,
    form.onSubmit,
    closeModal,
    handleFormOnSubmit,
    phoneForm.setInitialValues,
    phoneForm.reset,
    phoneForm.getValues,
  ]);

  const accordianSections = [
    {
      id: "about_you",
      icon: <UserIcon size={20} />,
      label: "About You",
      description: "Name, residency status, and user role",
      content: (
        <Stack>
          <TextInput
            description={
              form.getValues().role === UserRoles.MEMBER
                ? "If set, will be used to pre-fill the name section in future booking forms"
                : "Add a name to this account for identification purposes"
            }
            label={"Name on Account"}
            placeholder="Name"
            {...form.getInputProps("name")}
            key={form.key("name")}
          />
          <Flex direction={isPhone ? "column" : "row"} gap={"md"}>
            <TextInput
              flex={1}
              label={"Residency Status"}
              readOnly
              value={
                form.getValues().isResident ? "Resident" : "Not a Resident"
              }
              variant="unstyled"
            />
            <TextInput
              flex={1}
              label={"User Role"}
              readOnly
              value={form.getValues().role ?? "Unknown"}
              variant="unstyled"
            />
          </Flex>
        </Stack>
      ),
    },
    {
      id: "account_information",
      icon: <LockSimpleIcon size={20} />,
      label: "Account Information",
      description: "Phone number and email address",
      content: (
        <Flex direction={isPhone ? "column" : "row"} gap={"md"}>
          <Input.Wrapper
            description="Used to log into this account"
            error={phoneForm.errors.phoneNumber}
            flex={1}
            label="Phone Number"
          >
            <Input
              aria-label="Phone Number Input"
              component={IMaskInput}
              key={phoneForm.key("phoneNumber")}
              mask="(000) 000-0000"
              placeholder="(123)-456-7890"
              {...phoneForm.getInputProps("phoneNumber")}
            />
          </Input.Wrapper>
          <TextInput
            description={"For communication via email"}
            flex={1}
            label={"Email Address"}
            placeholder="someone@gmail.com"
            {...form.getInputProps("email")}
            key={form.key("email")}
          />
        </Flex>
      ),
    },
  ];

  if (form.getValues().role === UserRoles.MEMBER) {
    accordianSections.push({
      id: "payment",
      icon: <MoneyWavyIcon size={20} />,
      label: "Payment & Rides",
      description: "Change credit card information and view Rides credit",
      content: (
        <Flex direction={isTablet ? "column" : "row"} gap={"md"}>
          <Flex
            align={isPhone ? "flex-start" : "stretch"}
            direction={isPhone ? "column" : "row"}
            flex={1}
            justify="space-between"
            wrap="wrap"
          >
            <TextInput
              defaultValue={"Not Registered"}
              description={"Used to pay for rides within the app"}
              label={"Credit Card"}
              readOnly
              variant="unstyled"
            />
            <Stack justify="flex-end" pb={"xs"}>
              <Button
                c={"black"}
                color="buttonColor"
                onClick={() => {}}
                size="compact-sm"
                type="button"
                variant="filled"
              >
                Add Credit Card
              </Button>
            </Stack>
          </Flex>
          <Flex
            align={isPhone ? "flex-start" : "stretch"}
            direction={isPhone ? "column" : "row"}
            flex={1}
            justify="space-between"
            wrap="wrap"
          >
            <TextInput
              description={"To cover trip costs"}
              label={"Ride Credits"}
              readOnly
              value={`${form.getValues().numberOfRides > 999 ? "999+" : form.getValues().numberOfRides} Rides`}
              variant="unstyled"
            />
            <Stack justify="flex-end" pb={"xs"}>
              <Button
                c={"black"}
                color="buttonColor"
                onClick={() => {}}
                size="compact-sm"
                type="button"
                variant="filled"
              >
                Buy More Rides
              </Button>
            </Stack>
          </Flex>
        </Flex>
      ),
    });
  }

  return (
    <>
      <ChangePhoneNumberModal
        closeModal={closeChangePhoneModal}
        modalOpened={changePhoneModalOpened}
        newPhoneNumber={phoneForm.getValues().phoneNumber}
        setChangeSuccess={setChangePhoneSuccess}
      />
      <AlertPopup
        abortButtonText={"Back"}
        body={<Text>Account information will be changed. Are you sure?</Text>}
        closeModal={closeAlertModal}
        confirmButtonText={"Confirm"}
        isLoading={isMutating}
        modalOpened={alertModalOpened}
        onConfirm={() => {
          if (phoneForm.isDirty()) {
            //phone number has changed
            openChangePhoneModal();
            closeAlertModal();
          } else {
            form.onSubmit(handleFormOnSubmit)();
          }
        }}
        titleText={"Are you sure?"}
      />
      <Modal
        centered
        onClose={closeModal}
        opened={modalOpened}
        radius={"lg"}
        size={"xl"}
        withCloseButton={false}
      >
        <Stack gap={"lg"} p={"md"}>
          <Group justify="space-between">
            <Title order={4}>Manage Account</Title>
            <CloseButton onClick={closeModal} />
          </Group>
          <Accordion chevronPosition="right" radius="md" variant="contained">
            {accordianSections.map((section) => (
              <Accordion.Item key={section.label} value={section.id}>
                <Accordion.Control aria-label={section.label}>
                  <AccordionLabel
                    description={section.description}
                    icon={section.icon}
                    label={section.label}
                  />
                </Accordion.Control>
                <Accordion.Panel>{section.content}</Accordion.Panel>
              </Accordion.Item>
            ))}
          </Accordion>
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
              c={form.isDirty() || phoneForm.isDirty() ? "black" : undefined}
              color="buttonColor"
              disabled={!form.isDirty() && !phoneForm.isDirty()}
              onClick={() => {
                const { hasErrors: formHasErrors } = form.validate();
                const { hasErrors: phoneFormHasErrors } = phoneForm.validate();
                if (!formHasErrors && !phoneFormHasErrors) {
                  openAlertModal();
                } else {
                  showNotifications.error(
                    "Invalid information given. Please correct the information and try again",
                  );
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
      </Modal>
    </>
  );
}
