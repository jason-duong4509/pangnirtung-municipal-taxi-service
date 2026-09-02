import { Combobox, TextInput, useCombobox } from "@mantine/core";
import type { UseFormReturnType } from "@mantine/form";
import type { Dispatch, ReactNode, SetStateAction } from "react";

//Pick-up and drop-off location options
const suggestedLocations = ["Grocery Store", "Airport"];

export default function AddressDropdown({
  fieldName,
  fieldValue,
  changeValue,
  ariaLabel,
  placeholder,
  icon,
  form,
  label,
  withAsterisk,
}: {
  fieldName: string;
  fieldValue: string;
  changeValue: Dispatch<SetStateAction<string>>;
  ariaLabel: string;
  placeholder: string;
  icon: ReactNode;
  form: UseFormReturnType<any>;
  label?: string;
  withAsterisk?: boolean;
}) {
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
        form.setFieldValue(fieldName, selectedOption);
        comboBox.closeDropdown();
      }}
      store={comboBox}
    >
      <Combobox.Target>
        <TextInput
          aria-label={ariaLabel}
          error={form.errors[fieldName] ?? ""}
          label={label}
          leftSection={icon}
          onBlur={() => {
            comboBox.closeDropdown();
          }}
          onChange={(event) => {
            changeValue(event.currentTarget.value);
            form.setFieldValue(fieldName, event.currentTarget.value);
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
          withAsterisk={withAsterisk}
        />
      </Combobox.Target>

      <Combobox.Dropdown hidden={options.length === 0}>
        <Combobox.Options>
          <Combobox.Group label="Suggested Locations">{options}</Combobox.Group>
        </Combobox.Options>
      </Combobox.Dropdown>
    </Combobox>
  );
}
