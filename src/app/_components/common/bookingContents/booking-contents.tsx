"use client";

import {
  Divider,
  Group,
  Input,
  Text,
  Textarea,
  TextInput,
} from "@mantine/core";
import type { UseFormReturnType } from "@mantine/form";
import {
  DeviceMobileIcon,
  MapPinLineIcon,
  PathIcon,
  QuestionIcon,
  UserIcon,
} from "@phosphor-icons/react";
import { useState } from "react";
import { IMaskInput } from "react-imask";
import { dbTimeToPrettyString, formatString } from "~/lib/helpers";
import type { RouterOutputs } from "~/server/api/root";
import AddressDropdown from "../../bookingForm/booking-form-components/address-drop-down-field";
import PickupTimeInput from "../../bookingForm/booking-form-components/pick-up-time-field";

type bookingData = RouterOutputs["bookings"]["getOne"];
type formType = {
  pickupTime: string | null;
  pickupAddr: string;
  destAddr: string;
  phoneNumber: string;
  name: string;
  reasonForTrip: string;
};

export default function BookingContents({
  bookingData,
  readOnly,
  form,
}:
  | {
      bookingData: bookingData;
      readOnly: true;
      form?: never;
    }
  | {
      bookingData: bookingData;
      readOnly: false;
      form: UseFormReturnType<formType>;
    }) {
  const [pickupAddr, setPickupAddr] = useState("");
  const [destAddr, setDestAddr] = useState("");

  if (!pickupAddr || !destAddr) {
    setPickupAddr(bookingData.pickupAddr);
    setDestAddr(bookingData.destAddr);
  }

  return (
    <>
      <section>
        <Group justify="space-between">
          <Input.Label>Booking ID</Input.Label>
          <Text>{bookingData.id}</Text>
        </Group>
        <Group justify="space-between">
          <Input.Label>Booking Status</Input.Label>
          <Text>{formatString(bookingData.status)}</Text>
        </Group>
      </section>

      <Divider label="Logistics" labelPosition="left" mt="xs" size={"md"} />
      <section>
        <TextInput
          label="Booking Type"
          readOnly
          value={formatString(bookingData.bookingType)}
          variant="unstyled"
        />
        {readOnly && (
          <>
            <TextInput
              label="Pick-up Time"
              readOnly
              value={dbTimeToPrettyString(bookingData.pickupTime)}
              variant="unstyled"
            />
            <TextInput
              label="Pick-up Address"
              readOnly
              value={bookingData.pickupAddr}
              variant="unstyled"
            />
            <TextInput
              label="Destination Address"
              readOnly
              value={bookingData.destAddr}
              variant="unstyled"
            />
            <TextInput
              label="Contact Phone Number"
              readOnly
              value={bookingData.contactPhone}
              variant="unstyled"
            />
          </>
        )}
        {!readOnly && (
          <>
            <PickupTimeInput form={form} formField={"pickupTime"} useLabel />
            <AddressDropdown
              ariaLabel="Pick-up Address"
              changeValue={setPickupAddr}
              fieldName="pickupAddr"
              fieldValue={pickupAddr}
              form={form}
              icon={<MapPinLineIcon size={20} />}
              label="Pick-up Address"
              placeholder="Location"
            />
            <AddressDropdown
              ariaLabel="Destination address"
              changeValue={setDestAddr}
              fieldName="destAddr"
              fieldValue={destAddr}
              form={form}
              icon={<PathIcon size={20} />}
              label="Destination Address"
              placeholder="Location"
            />
            <Input.Wrapper error={form.errors.phoneNumber} label="Phone Number">
              <Input
                component={IMaskInput}
                key={form.key("phoneNumber")}
                mask="(000) 000-0000"
                placeholder="Phone Number"
                {...form.getInputProps("phoneNumber")}
                leftSection={<DeviceMobileIcon size={20} />}
              />
            </Input.Wrapper>
          </>
        )}
        <TextInput
          label="Paid"
          readOnly
          value={bookingData.paid ? "Yes" : "No"}
          variant="unstyled"
        />
        <TextInput
          label="Requested Verification?"
          readOnly
          value={bookingData.requestVerification ? "Yes" : "No"}
          variant="unstyled"
        />
      </section>

      <Divider
        label="Client Information"
        labelPosition="left"
        mt="xs"
        size={"md"}
      />
      <section>
        {readOnly && (
          <>
            <TextInput
              label="Name"
              readOnly
              value={bookingData.name}
              variant="unstyled"
            />
            <Textarea
              autosize
              label="Trip Reason"
              maxRows={4}
              minRows={1}
              readOnly
              value={
                bookingData.tripReason.length === 0
                  ? "None Given"
                  : bookingData.tripReason
              }
              variant="unstyled"
            />
          </>
        )}
        {!readOnly && (
          <>
            <TextInput
              key={form.key("name")}
              leftSection={<UserIcon size={20} />}
              {...form.getInputProps("name")}
              label="Name"
              placeholder="Name"
            />
            <Textarea
              key={form.key("reasonForTrip")}
              label="Reason for Trip"
              leftSection={<QuestionIcon size={20} />}
              {...form.getInputProps("reasonForTrip")}
              autosize
              maxRows={4}
              minRows={1}
              placeholder="Optional"
            />
          </>
        )}
        <TextInput
          label="Payment Method"
          readOnly
          value={`${formatString(bookingData.paymentMethod)}${bookingData.rideCode ? ` (used code: ${bookingData.rideCode})` : ""}`}
          variant="unstyled"
        />
      </section>

      <Divider label="Miscellaneous" labelPosition="left" mt="xs" size={"md"} />
      <section>
        <TextInput
          label="Created At"
          readOnly
          value={dbTimeToPrettyString(bookingData.createdAt)}
          variant="unstyled"
        />
        <TextInput
          label="Updated At"
          readOnly
          value={dbTimeToPrettyString(bookingData.updatedAt)}
          variant="unstyled"
        />
      </section>
    </>
  );
}
