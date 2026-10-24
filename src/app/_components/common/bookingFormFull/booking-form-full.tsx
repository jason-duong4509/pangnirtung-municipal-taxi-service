"use client";

import {
  Alert,
  Box,
  Button,
  Checkbox,
  Group,
  Input,
  MantineProvider,
  Radio,
  Stack,
  Text,
  Textarea,
  TextInput,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useDisclosure } from "@mantine/hooks";
import {
  DeviceMobileIcon,
  InfoIcon,
  MapPinLineIcon,
  PathIcon,
  QuestionIcon,
  UserIcon,
} from "@phosphor-icons/react";
import { useState } from "react";
import { IMaskInput } from "react-imask";
import {
  checkAddress,
  checkBookingType,
  checkName,
  checkPhoneNumber,
  checkPickUpTime,
  checkTripReason,
} from "~/lib/input-checkers";
import { showNotifications } from "~/lib/mantine-notifications-system";
import { api } from "~/trpc/react";
import { BookingTypes, BookingValueTypes } from "~/types/types";
import AddressDropdown from "../../bookingForm/booking-form-components/address-drop-down-field";
import PickupTimeInput from "../../bookingForm/booking-form-components/pick-up-time-field";
import AlertPopup from "../alert/alert";

export default function BookingFormFull({
  onSuccess,
}: {
  onSuccess: () => void;
}) {
  const [pickupAddr, setPickupAddr] = useState("");
  const [destAddr, setDestAddr] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [alertModalOpened, { open: openAlertModal, close: closeAlertModal }] =
    useDisclosure(false);
  const utils = api.useUtils();

  const form = useForm<{
    pickupTime: string | null;
    pickupAddr: string;
    destAddr: string;
    name: string;
    reasonForTrip: string;
    phoneNumber: string;
    bookingType: BookingValueTypes;
    sendReminders: boolean;
  }>({
    mode: "uncontrolled",

    initialValues: {
      pickupTime: null as string | null,
      pickupAddr: "",
      destAddr: "",
      name: "",
      reasonForTrip: "",
      phoneNumber: "",
      bookingType: BookingValueTypes.IN_TOWN,
      sendReminders: false,
    },

    //Frontend field checks
    validate: {
      pickupTime: (value) => {
        const result = checkPickUpTime(value as string | null);

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
      pickupAddr: (value) => {
        const result = checkAddress(value);

        if (result.isProper) {
          return null;
        } else {
          return result.errorMessage;
        }
      },
      destAddr: (value) => {
        const result = checkAddress(value);

        if (result.isProper) {
          return null;
        } else {
          return result.errorMessage;
        }
      },
      name: (value) => {
        const result = checkName(value);

        if (result.isProper) {
          return null;
        } else {
          return result.errorMessage;
        }
      },
      reasonForTrip: (value) => {
        const result = checkTripReason(value);

        if (result.isProper) {
          return null;
        } else {
          return result.errorMessage;
        }
      },
      bookingType: (value) => {
        const result = checkBookingType(value);

        if (result.isProper) {
          return null;
        } else {
          return result.errorMessage;
        }
      },
    },
  });

  const createBookingMutation = api.bookings.createForAnother.useMutation({
    onSuccess: () => {
      showNotifications.success("Successfully added trip");
      closeAlertModal();
      onSuccess();
      setIsLoading(false);
      form.reset();
      void utils.bookings.get.invalidate();
    },
    onError: (error) => {
      showNotifications.error(error.message);
      setIsLoading(false);
    },
  });

  const handleSubmit = async (values: typeof form.values) => {
    if (isLoading) {
      return;
    }
    setIsLoading(true);

    createBookingMutation.mutate({
      pickupAddr: values.pickupAddr,
      destAddr: values.destAddr,
      name: values.name,
      pickupTime: values.pickupTime,
      tripReason: values.reasonForTrip,
      reminders: values.sendReminders,
      contactPhone: values.phoneNumber,
      bookingType: values.bookingType,
    });
  };

  return (
    <>
      <AlertPopup
        abortButtonText={"Cancel"}
        body={<Text>Are you sure?</Text>}
        closeModal={closeAlertModal}
        confirmButtonText={"Submit"}
        isLoading={isLoading}
        modalOpened={alertModalOpened}
        onConfirm={() => form.onSubmit(handleSubmit)()}
        titleText={"Adding trip"}
      />
      <Alert color="blue" icon={<InfoIcon />} title="Note" variant="light">
        Bookings added are set as paid with cash. Bookings can only be added
        using the client's primary phone number (used during account
        registration)
      </Alert>
      <Stack gap={"xs"}>
        <Box>
          <Input.Label required>Pick-up Time</Input.Label>
          <PickupTimeInput form={form} formField={"pickupTime"} />
        </Box>
        <Box>
          <Input.Label required>Pick-up Address</Input.Label>
          <AddressDropdown
            ariaLabel="Pick-up address field"
            changeValue={setPickupAddr}
            fieldName="pickupAddr"
            fieldValue={pickupAddr}
            form={form}
            icon={<MapPinLineIcon size={20} />}
            placeholder="Pick-up Address"
          />
        </Box>
        <Box>
          <Input.Label required>Destination Address</Input.Label>
          <AddressDropdown
            ariaLabel="Destination address field"
            changeValue={setDestAddr}
            fieldName="destAddr"
            fieldValue={destAddr}
            form={form}
            icon={<PathIcon size={20} />}
            placeholder="Destination Address"
          />
        </Box>
        <TextInput
          key={form.key("name")}
          leftSection={<UserIcon size={20} />}
          {...form.getInputProps("name")}
          label="Client Name"
          placeholder="Client Name"
          withAsterisk
        />
        <Input.Wrapper
          error={form.errors.phoneNumber}
          label="Client Phone (primary number)"
          withAsterisk
        >
          <Input
            component={IMaskInput}
            key={form.key("phoneNumber")}
            mask="(000) 000-0000"
            placeholder="Client Phone"
            {...form.getInputProps("phoneNumber")}
            leftSection={<DeviceMobileIcon size={20} />}
          />
        </Input.Wrapper>
        <Textarea
          key={form.key("reasonForTrip")}
          leftSection={<QuestionIcon size={20} />}
          {...form.getInputProps("reasonForTrip")}
          autosize
          label="Reason for Trip"
          minRows={1}
          placeholder="Reason for Trip (optional)"
        />
        <Box>
          <Input.Label required>Send Reminders? (user needs app)</Input.Label>
          <MantineProvider theme={{ cursorType: "pointer" }}>
            <Checkbox
              aria-label="Receive reminders check box"
              color="buttonColor"
              key={form.key("receiveReminders")}
              label="Yes"
              {...form.getInputProps("receiveReminders", {
                type: "checkbox",
              })}
            />
          </MantineProvider>
        </Box>
        <Radio.Group
          key={form.key("bookingType")}
          label="Booking Type"
          {...form.getInputProps("bookingType")}
          withAsterisk
        >
          <Group mt="xs">
            {BookingTypes.map((json) => (
              <Radio
                color="backgroundColor"
                iconColor="black"
                key={json.value}
                label={json.label}
                value={json.value}
              />
            ))}
          </Group>
        </Radio.Group>
        <Button
          c={"black"}
          color="buttonColor"
          onClick={() => {
            const { hasErrors } = form.validate();
            if (!hasErrors) {
              openAlertModal();
            }
          }}
          type="button"
        >
          Submit
        </Button>
      </Stack>
    </>
  );
}
