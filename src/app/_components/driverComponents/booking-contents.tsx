"use client";

import {
  Divider,
  Group,
  Input,
  Stack,
  Text,
  Textarea,
  TextInput,
} from "@mantine/core";
import { dbTimeToPrettyString, formatString } from "~/lib/helpers";
import type { RouterOutputs } from "~/server/api/root";

type bookingData = RouterOutputs["bookings"]["getOne"];

export default function BookingContentsDriver({
  bookingData,
}: {
  bookingData: bookingData;
}) {
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
        label="About the Client"
        labelPosition="left"
        mt="xs"
        size={"md"}
      />
      <section>
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
        <TextInput
          label="Payment Method"
          readOnly
          value={formatString(bookingData.paymentMethod)}
          variant="unstyled"
        />
      </section>
    </>
  );
}
