"use client";

import {
  Button,
  CloseButton,
  Group,
  Modal,
  Stack,
  TextInput,
  Title,
  Text,
  Accordion,
  Flex,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useDisclosure, useMediaQuery } from "@mantine/hooks";
import { LockSimpleIcon, MoneyWavyIcon, UserIcon } from "@phosphor-icons/react";
import { useEffect, useState, type JSX } from "react";
import { checkEmail, checkName, checkPhoneNumber } from "~/lib/input-checkers";
import { showNotifications } from "~/lib/mantine-notifications-system";
import { api } from "~/trpc/react";
import { UserRoles } from "~/types/types";
import AlertPopup from "../alert/alert";

function AccordionLabel({
  label,
  icon,
  description,
}:{
  label: string;
  icon: JSX.Element;
  description: string;
}) {
  return (
    <Group wrap="nowrap">
      {icon}
      <div>
        <Text>{label}</Text>
        <Text size="sm" c="dimmed" fw={400}>
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
  const [alertModalOpened, { open: openAlertModal, close: closeAlertModal }] = useDisclosure(false);

  const getUsersQuery = api.users.getSelf.useQuery(undefined, {
    //Forces manual fetching
    enabled: false,
  });

  const updateUserMutation = api.users.updateSelf.useMutation({
    onSuccess: () => {
      showNotifications.success("Updated successfully");
      setIsMutating(false);
      getUsersQuery.refetch();
      closeModal();
      closeAlertModal();
    },
    onError: (error) => {
      showNotifications.error(error.message);
      setIsMutating(false);
    },
  });

  useEffect(() => {
    if (modalOpened){
      getUsersQuery.refetch()
    }
  }, [modalOpened]);

  const form = useForm<{
    name: string;
    phoneNumber: string;
    email: string;
    role: UserRoles;
  }>({
    mode: "uncontrolled",

    initialValues: {
      name: "",
      phoneNumber: "",
      email: "",
      role: UserRoles.MEMBER,
    },

    validate: {
      name: (value) => {
        if (value === ""){
          return null;
        }
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
      email: (value) => {
        if (value === ""){
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
    } else if (!getUsersQuery.isFetching && getUsersQuery.data && getUsersQuery.data[0]) {
      const user = getUsersQuery.data[0]

      form.setInitialValues({
        name: user.name === "no-name-given.pang" ? "" : user.name,
        phoneNumber: user.phoneNumber!,
        email: user.email.includes("@no-email-given.pang") ? "" : user.email,
        role: user.role,
      });
      form.setValues({
        name: user.name === "no-name-given.pang" ? "" : user.name,
        phoneNumber: user.phoneNumber!,
        email: user.email.includes("@no-email-given.pang") ? "" : user.email,
        role: user.role,
      });
    }
  }, [getUsersQuery.error, getUsersQuery.isFetching]);

  const handleFormOnSubmit = async (values: typeof form.values) => {
    if (isMutating) {
      //If form is already submitting
      return;
    }
    setIsMutating(true);

    updateUserMutation.mutate({
      name: values.name,
      phoneNumber: values.phoneNumber,
      email: values.email,
    });
  };

  const accordianSections = [
    {
      id: 'about_you',
      icon: <UserIcon size={20} />,
      label: 'About You',
      description: 'Name, residency status, and user role',
      content: (
        <Stack>
          <TextInput
            label={"Name on Account"}
            description={"If set, will be used to pre-fill the name section in future booking forms"}
            placeholder="Name"
            {...form.getInputProps("name")}
            key={form.key("name")}
          />
          <Flex gap={"md"} direction={isPhone ? "column" : "row"}>
            <TextInput
              label={"Residency Status"}
              readOnly
              variant="unstyled"
              value={"Not a resident"}
              flex={1}
            />
            <TextInput
              label={"User Role"}
              readOnly
              variant="unstyled"
              value={form.getValues().role}
              flex={1}
            />
          </Flex>
        </Stack>
      ),
    },
    {
      id: 'account_information',
      icon: <LockSimpleIcon size={20} />,
      label: 'Account Information',
      description: 'Phone number and email address',
      content: (
        <Flex gap={"md"} direction={isPhone ? "column" : "row"}>
          <TextInput
            label={"Phone Number"}
            description={"Used to log into this account"}
            placeholder="123-456-7890"
            flex={1}
            {...form.getInputProps("phoneNumber")}
            key={form.key("phoneNumber")}
          />
          <TextInput
            label={"Email Address"}
            description={"For communication via email"}
            placeholder="someone@gmail.com"
            flex={1}
            {...form.getInputProps("email")}
            key={form.key("email")}
          />
        </Flex>
      ),
    },
    {
      id: 'payment',
      icon: <MoneyWavyIcon size={20} />,
      label: 'Payment & Rides',
      description: 'Change credit card information and view Rides credit',
      content: (
        <Flex gap={"md"} direction={isTablet ? "column" : "row"}>
          <Flex justify="space-between" flex={1} wrap="wrap" align={isPhone ? "flex-start" : "stretch"} direction={isPhone ? "column" : "row"}>
            <TextInput
              label={"Credit Card"}
              description={"Used to pay for rides within the app"}
              readOnly
              defaultValue={"Not Registered"}
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
          <Flex justify="space-between" flex={1} wrap="wrap" align={isPhone ? "flex-start" : "stretch"} direction={isPhone ? "column" : "row"}>
            <TextInput
              label={"Ride Credits"}
              description={"To cover trip costs"}
              readOnly
              defaultValue={"60 Rides"}
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
    },
  ];

  return (
    <>
    <AlertPopup
      abortButtonText={"Back"}
      body={<Text>Account information will be changed. Are you sure?</Text>}
      closeModal={closeAlertModal}
      confirmButtonText={"Confirm"}
      isLoading={isMutating}
      modalOpened={alertModalOpened}
      onConfirm={() => form.onSubmit(handleFormOnSubmit)()}
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
        <Accordion chevronPosition="right" variant="contained" radius="md">
          {accordianSections.map((section) => (
            <Accordion.Item value={section.id} key={section.label}>
              <Accordion.Control aria-label={section.label}>
                <AccordionLabel label={section.label} icon={section.icon} description={section.description}/>
              </Accordion.Control>
              <Accordion.Panel>
                {section.content}
              </Accordion.Panel>
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
            c={form.isDirty() ? "black" : undefined}
            color="buttonColor"
            disabled={!form.isDirty()}
            onClick={() => {
              form.validate();
              if (form.isValid()) {
                openAlertModal()
              } else{
                showNotifications.error("Invalid information given. Please correct the information and try again")
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

/*
<Drawer title="Manage Account Information" size="100%" opened={modalOpened} onClose={closeModal} offset={8} radius={"md"} transitionProps={{transition: "fade-down", timingFunction: "ease", duration: 250}}>
      
      
    </Drawer>
*/

/*

      
      
      
      
      
      
      
      
      
      
      
      <Accordion>
        <section>
          <Accordion.Item key={"About You"} value={"About You"}>
            <Accordion.Control>About You</Accordion.Control>
            <Accordion.Panel>
              <Stack>
                <TextInput
                  label={"Name on Account"}
                  description={"If set, will be used to pre-fill the name section in future booking forms"}
                  placeholder="Name"
                  w={"50%"}
                />
                <Group grow>
                  <TextInput
                    label={"Residency Status"}
                    readOnly
                    variant="unstyled"
                    value={"Not a resident"}
                  />
                  <TextInput
                    label={"User Role"}
                    readOnly
                    variant="unstyled"
                    value={"Member"}
                  />
                </Group>
              </Stack>
            </Accordion.Panel>
          </Accordion.Item>
        </section>
      </Accordion>
      
      <section>
        <Divider my="xs" label="About You" labelPosition="left" />
        <Stack>
          <Text>name and residency status and role</Text>
          <TextInput
            label={"Name on Account"}
            description={"If set, will be used to pre-fill the name section in future booking forms"}
            placeholder="Name"
            w={"50%"}
          />
          <Group grow>
            <TextInput
              label={"Residency Status"}
              readOnly
              variant="unstyled"
              value={"Not a resident"}
            />
            <TextInput
              label={"User Role"}
              readOnly
              variant="unstyled"
              value={"Member"}
            />
          </Group>
        </Stack>
      </section>
      
      <Divider my="xs" label="Account Information" labelPosition="left" />
      <Text>insert phone #, option for other phone numbers.. maybe? and email</Text>
      <Divider my="xs" label="Payment & Rides" labelPosition="left" />
      <Text>insert option where its like: credit card: registered/not registered. if registered, add a button thatll eventually take you to stripe to change credit card info</Text>
      <Text>also add num of credits</Text>
      */