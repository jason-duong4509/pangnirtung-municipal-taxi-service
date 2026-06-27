"use client";
import { Button, Combobox, Paper, TextInput, useCombobox } from "@mantine/core";
import { DateTimePicker } from "@mantine/dates";
import { useForm } from "@mantine/form";
import dayjs from "dayjs";
import { type Dispatch, type SetStateAction, useState } from "react";

//Pick-up and drop-off location options
const suggestedLocations = ["Grocery Store", "Airport"];

//Locally reused component for pickup/dest addr fields
const DropdownField = ({
  fieldValue,
  changeValue,
  ariaLabel,
  placeholder,
}: {
  fieldValue: string;
  changeValue: Dispatch<SetStateAction<string>>;
  ariaLabel: string;
  placeholder: string;
}) => {
  const comboBox = useCombobox();

  //Location filter behavior based on user input
  const filteredLocations =
    fieldValue.length === 0
      ? suggestedLocations
      : suggestedLocations.filter((location) => {
          return location
            .toLowerCase()
            .includes(fieldValue.toLowerCase().trim());
        });

  //Make options that appear in pickup/dest fields
  const options = filteredLocations.map((location) => (
    <Combobox.Option key={location} value={location}>
      {location}
    </Combobox.Option>
  ));

  return (
    <Combobox
      onOptionSubmit={(selectedOption) => {
        changeValue(selectedOption);
        comboBox.closeDropdown();
      }}
      store={comboBox}
    >
      <Combobox.Target>
        <TextInput
          aria-label={ariaLabel}
          onBlur={() => {
            comboBox.closeDropdown();
          }}
          onChange={(event) => {
            changeValue(event.currentTarget.value);
            comboBox.openDropdown();
          }}
          onClick={() => {
            comboBox.openDropdown();
          }}
          onFocus={() => {
            comboBox.openDropdown();
          }}
          placeholder={placeholder}
          value={fieldValue}
        />
      </Combobox.Target>

      <Combobox.Dropdown hidden={options.length === 0}>
        <Combobox.Options>
          <Combobox.Group label="Suggested Locations">{options}</Combobox.Group>
        </Combobox.Options>
      </Combobox.Dropdown>
    </Combobox>
  );
};

export default function BookingForm() {
  //use states for pickup and dest addr
  const [pickupAddr, setPickupAddr] = useState("");
  const [destAddr, setDestAddr] = useState("");

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

        <DropdownField
          ariaLabel="Pick-up address field"
          changeValue={setPickupAddr}
          fieldValue={pickupAddr}
          placeholder="Pick-up Address"
        />
        <DropdownField
          ariaLabel="Destination address field"
          changeValue={setDestAddr}
          fieldValue={destAddr}
          placeholder="Destination Address"
        />

        <Button type="submit">Submit</Button>
      </form>
    </Paper>
  );
}
