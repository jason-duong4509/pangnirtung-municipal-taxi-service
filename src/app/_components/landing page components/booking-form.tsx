"use client";
import {
  ActionIcon,
  Box,
  Button,
  Center,
  Combobox,
  type CSSProperties,
  Group,
  Paper,
  Stack,
  TextInput,
  Title,
  Transition,
  useCombobox,
} from "@mantine/core";
import { DateTimePicker } from "@mantine/dates";
import { type UseFormReturnType, useForm } from "@mantine/form";
import {
  ArrowLeftIcon,
  CalendarBlankIcon,
  MapPinLineIcon,
  PathIcon,
  ShieldCheckIcon,
} from "@phosphor-icons/react";
import dayjs from "dayjs";
import { INITIAL_OVERLAY_STATE } from "next/dist/next-devtools/dev-overlay/shared";
import {
  type Dispatch,
  type ReactNode,
  type SetStateAction,
  useState,
} from "react";

//Pick-up and drop-off location options
const suggestedLocations = ["Grocery Store", "Airport"];

//Locally reused component for pickup/dest addr fields
const DropdownField = ({
  fieldName,
  fieldValue,
  changeValue,
  ariaLabel,
  placeholder,
  icon,
  form,
}: {
  fieldName: string;
  fieldValue: string;
  changeValue: Dispatch<SetStateAction<string>>;
  ariaLabel: string;
  placeholder: string;
  icon: ReactNode;
  form: UseFormReturnType<
    {
      pickupTime: Date | null;
      pickupAddr: string;
      destAddr: string;
    },
    (values: {
      pickupTime: Date | null;
      pickupAddr: string;
      destAddr: string;
    }) => {
      pickupTime: Date | null;
      pickupAddr: string;
      destAddr: string;
    }
  >;
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
        form.setFieldValue(fieldName, selectedOption);
        comboBox.closeDropdown();
      }}
      store={comboBox}
    >
      <Combobox.Target>
        <TextInput
          aria-label={ariaLabel}
          error={form.errors[fieldName] ?? ""}
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

//First form UI
const FormOne = ({
  pickupAddr,
  setPickupAddr,
  destAddr,
  setDestAddr,
  form,
  changeFormNum,
  transitionStyle,
}: {
  pickupAddr: string;
  setPickupAddr: Dispatch<SetStateAction<string>>;
  destAddr: string;
  setDestAddr: Dispatch<SetStateAction<string>>;
  form: UseFormReturnType<
    {
      pickupTime: Date | null;
      pickupAddr: string;
      destAddr: string;
    },
    (values: {
      pickupTime: Date | null;
      pickupAddr: string;
      destAddr: string;
    }) => {
      pickupTime: Date | null;
      pickupAddr: string;
      destAddr: string;
    }
  >;
  changeFormNum: Dispatch<SetStateAction<number>>;
  transitionStyle: CSSProperties;
}) => {
  return (
    <Paper
      bg={"primaryColor"}
      mah={"400px"}
      p={"xl"}
      pos={"absolute"}
      radius="lg"
      shadow="xl"
      style={transitionStyle}
      w={"400px"}
    >
      <Stack gap={"lg"}>
        <Title order={4}>Where to?</Title>
        <form
          onSubmit={form.onSubmit(() => {
            changeFormNum(2);
          })}
        >
          <Stack gap={"sm"}>
            <DateTimePicker
              aria-label="Pick-up Time Selection"
              clearable
              leftSection={<CalendarBlankIcon size={19} />}
              maxDate={dayjs().add(1, "month").toDate()}
              minDate={new Date()}
              placeholder="Pick-up Time"
              presets={[
                { value: dayjs().format("YYYY-MM-DD HH:mm:ss"), label: "Now" },
              ]}
              timePickerProps={{
                withDropdown: true,
                format: "12h",
                popoverProps: { withinPortal: false },
              }}
              valueFormat={"ddd[,] MMM D [at] h:mm A"}
              {...form.getInputProps("pickupTime")}
            />

            <DropdownField
              ariaLabel="Pick-up address field"
              changeValue={setPickupAddr}
              fieldName="pickupAddr"
              fieldValue={pickupAddr}
              form={form}
              icon={<MapPinLineIcon size={20} />}
              placeholder="Pick-up Address"
            />
            <DropdownField
              ariaLabel="Destination address field"
              changeValue={setDestAddr}
              fieldName="destAddr"
              fieldValue={destAddr}
              form={form}
              icon={<PathIcon size={20} />}
              placeholder="Destination Address"
            />

            <Button c={"black"} color="buttonColor" type="submit">
              Continue
            </Button>
          </Stack>
        </form>
      </Stack>
    </Paper>
  );
};

//Second form UI
const FormTwo = ({
  form,
  changeFormNum,
  transitionStyle,
}: {
  form: UseFormReturnType<
    {
      emailOrPhone: string;
    },
    (values: { emailOrPhone: string }) => {
      emailOrPhone: string;
    }
  >;
  changeFormNum: Dispatch<SetStateAction<number>>;
  transitionStyle: CSSProperties;
}) => {
  return (
    <Paper
      bg={"primaryColor"}
      mah={"400px"}
      p={"xl"}
      pos={"absolute"}
      radius="lg"
      shadow="xl"
      style={transitionStyle}
      w={"400px"}
    >
      <Stack gap={"lg"}>
        <Group gap={"xs"}>
          <ActionIcon
            aria-label="Go back button"
            color="black"
            onClick={() => {
              changeFormNum(1);
              form.clearErrors();
            }}
            size={"xs"}
            variant="transparent"
          >
            <ArrowLeftIcon size={20} />
          </ActionIcon>
          <Title order={4}>Enter Email/Phone</Title>
        </Group>
        <form
          onSubmit={form.onSubmit(() => {
            changeFormNum(3);
          })}
        >
          <Stack>
            <TextInput
              aria-label="Enter email or phone number"
              description="Verify that you're not a bot. Enter your email or phone number"
              key={form.key("emailOrPhone")}
              leftSection={<ShieldCheckIcon size={20} />}
              {...form.getInputProps("emailOrPhone")}
            />
            <Button c={"black"} color="buttonColor" type="submit">
              Continue
            </Button>
          </Stack>
        </form>
      </Stack>
    </Paper>
  );
};

export default function BookingForm() {
  const [pickupAddr, setPickupAddr] = useState("");
  const [destAddr, setDestAddr] = useState("");
  //Use state to keep track of what form is displayed
  const [formNumber, setFormNum] = useState(1);

  //Configure forms
  const formOne = useForm({
    mode: "uncontrolled",

    //Initial field values of form
    initialValues: {
      pickupTime: null as Date | null,
      pickupAddr: "",
      destAddr: "",
    },

    //Simple form field checks
    validate: {
      pickupTime: (value) =>
        value !== null ? null : "Must select a pick-up time",
      pickupAddr: (value) =>
        value.length !== 0 ? null : "Must add a pick-up address",
      destAddr: (value) =>
        value.length !== 0 ? null : "Must add a destination address",
    },
  });
  const formTwo = useForm({
    mode: "uncontrolled",

    initialValues: {
      emailOrPhone: "",
    },

    validate: {
      emailOrPhone: (value) => {
        //Blank field
        if (value.length === 0) {
          return "Field cannot be blank";
        }
        return null;
      },
    },
  });

  return (
    <Center
      h={"100%"}
      pos={"relative"}
      style={{ overflow: "hidden" }}
      w={"100%"}
    >
      <Transition
        duration={1000}
        mounted={formNumber === 1}
        timingFunction="ease"
        transition={"slide-right"}
      >
        {(transitionStyle) => (
          <FormOne
            changeFormNum={setFormNum}
            destAddr={destAddr}
            form={formOne}
            pickupAddr={pickupAddr}
            setDestAddr={setDestAddr}
            setPickupAddr={setPickupAddr}
            transitionStyle={transitionStyle}
          />
        )}
      </Transition>
      <Transition
        duration={1000}
        mounted={formNumber === 2}
        timingFunction="ease"
        transition={
          formNumber === 2 || formNumber === 1 ? "slide-left" : "slide-right"
        }
      >
        {(transitionStyle) => (
          <FormTwo
            changeFormNum={setFormNum}
            form={formTwo}
            transitionStyle={transitionStyle}
          />
        )}
      </Transition>
    </Center>
  );
}
