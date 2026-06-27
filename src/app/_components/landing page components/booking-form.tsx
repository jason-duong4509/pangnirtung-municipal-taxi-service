/*
"use client";
import {
  Box,
  Button,
  Center,
  Combobox,
  ComboboxTarget,
  Flex,
  Group,
  Paper,
  Text,
  TextInput,
  Title,
  useCombobox,
} from "@mantine/core";
import { DateTimePicker } from "@mantine/dates";
import { useForm } from "@mantine/form";
import dayjs from "dayjs";
import { useState } from "react";
import PangSeal from "~/assets/icons/pang";

//Pick-up and drop-off location options
const suggestedLocations = ["Grocery Store", "Airport"];

export default function BookingForm() {
  //use states for pickup and dest addr
  const [pickupAddr, setPickupAddr] = useState("");
  const [destAddr, setDestAddr] = useState("");

  //Define combo box for pickup/dest addr fields
  const pickupAddrField = useCombobox();
  const destAddrField = useCombobox();

  //Filter behavior for pickup/dest addr locations
  const pickAddrFilteredLocs =
    pickupAddr.length === 0
      ? suggestedLocations
      : suggestedLocations.filter((location) => {
          location.toLowerCase().includes(pickupAddr.toLowerCase().trim());
        });

  //Make options that appear in pickup/dest fields
  const pickupAddrOptions = pickAddrFilteredLocs.map((location) => (
    <Combobox.Option value={location}>{location}</Combobox.Option>
  ));

  //Configure form
  const bookingForm = useForm({
    mode: "uncontrolled",

    //Initial field values of form
    initialValues: {
      pickupTime: "",
      pickupAddr: "",
      destAddr: "",
    },

    //Simple form field checks
    validate: {
      pickupAddr: (value) =>
        value.length !== 0 ? null : "Cannot submit blank address",
    },
  });

  return (
    <Paper bg={"red"} h={"400px"} shadow="md">
      <form
        onSubmit={bookingForm.onSubmit(() => {
          console.log("form submitted");
        })}
      >
        <TextInput
          key={bookingForm.key("pickupAddr")}
          label="e"
          withAsterisk
          {...bookingForm.getInputProps("pickupAddr")}
        />

        <DateTimePicker
          aria-label="Pick-up Time Selection"
          clearable
          label="Pick date and time"
          maxDate={dayjs().add(1, "month").toDate()}
          minDate={new Date()}
          placeholder="Pick date and time"
          presets={[
            { value: dayjs().format("YYYY-MM-DD HH:mm:ss"), label: "Now" },
          ]}
          timePickerProps={{
            withDropdown: true,
            format: "12h",
            popoverProps: { withinPortal: false },
          }}
          valueFormat={"ddd[,] MMM D [at] h:mm A"}
        />

        <Combobox
          onOptionSubmit={(selectedOption) => {
            setPickupAddr(selectedOption);
            pickupAddrField.closeDropdown();
          }}
          store={pickupAddrField}
        >
          <Combobox.Target>
            <TextInput
              aria-label="Pick-up address field"
              onBlur={() => {
                pickupAddrField.closeDropdown();
              }}
              onChange={(event) => {
                setPickupAddr(event.currentTarget.value);
                pickupAddrField.openDropdown();
              }}
              onClick={() => {
                pickupAddrField.openDropdown();
              }}
              onFocus={() => {
                pickupAddrField.openDropdown();
              }}
              placeholder="Pick-up Address"
              value={pickupAddr}
            />
          </Combobox.Target>

          <Combobox.Dropdown hidden={pickupAddrOptions.length === 0}>
            <Combobox.Options>{pickupAddrOptions}</Combobox.Options>
          </Combobox.Dropdown>
        </Combobox>

        <Button type="submit">Submit</Button>
      </form>
    </Paper>
  );
}
*/
