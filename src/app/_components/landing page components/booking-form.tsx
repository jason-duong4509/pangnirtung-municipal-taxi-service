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
  Radio,
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
  type JSX,
  type ReactNode,
  type SetStateAction,
  useState,
} from "react";

//Enum constants to denote what UI is displayed to the user
const BookingUIStates = {
  Where_To: "Where_to",
  Enter_Email_Phone: "Enter_Email_Phone",
  Verify: "Verify",
  About_You: "About_You",
  Payment: "Payment",
  Buy_Rides: "Buy_Rides",
  Select_Pay: "Select_Pay",
  Confirm: "Confirm",
  End: "End",
} as const;
type BookingUIStates = (typeof BookingUIStates)[keyof typeof BookingUIStates];

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

//Locally reused component for UIs in the booking process
const FormUI = ({
  form,
  currentFormState,
  prevFormState,
  nextUIType,
  prevUIType,
  uiType,
  changeFormState,
  showBackButton,
  handleSubmit,
  nextButtonText,
  title,
  body,
  changePrevFormState,
}: {
  form: UseFormReturnType<any>;
  currentFormState: BookingUIStates;
  prevFormState: BookingUIStates | null;
  nextUIType: BookingUIStates | null;
  prevUIType: BookingUIStates | null;
  uiType: BookingUIStates;
  changeFormState: Dispatch<SetStateAction<BookingUIStates>>;
  showBackButton: boolean;
  handleSubmit?: (values: typeof form.values) => Promise<void>;
  nextButtonText: string;
  title: string;
  body: JSX.Element;
  changePrevFormState: Dispatch<SetStateAction<BookingUIStates | null>>;
}) => {
  return (
    <Transition
      duration={1000}
      mounted={currentFormState === uiType}
      timingFunction="ease"
      transition={
        prevUIType === null || prevFormState === nextUIType
          ? "slide-right"
          : currentFormState === uiType || currentFormState === prevUIType
            ? "slide-left"
            : "slide-right"
      }
    >
      {(transitionStyle) => (
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
              {showBackButton && (
                <ActionIcon
                  aria-label="Go back button"
                  color="black"
                  onClick={() => {
                    if (prevUIType) {
                      changePrevFormState(currentFormState);
                      changeFormState(prevUIType);
                    }
                    form.clearErrors();
                  }}
                  size={"xs"}
                  variant="transparent"
                >
                  <ArrowLeftIcon size={20} />
                </ActionIcon>
              )}
              <Title order={4}>{title}</Title>
            </Group>
            <form
              onSubmit={form.onSubmit(() => {
                if (nextUIType) {
                  changePrevFormState(currentFormState);
                  changeFormState(nextUIType);
                }
                if (handleSubmit) {
                  //Provided a submit form funct
                  form.onSubmit(handleSubmit);
                }
              })}
            >
              <Stack gap={"lg"}>
                <Stack gap={"sm"}>{body}</Stack>
                <Button c={"black"} color="buttonColor" type="submit">
                  {nextButtonText}
                </Button>
              </Stack>
            </form>
          </Stack>
        </Paper>
      )}
    </Transition>
  );
};

export default function BookingForm() {
  const [pickupAddr, setPickupAddr] = useState("");
  const [destAddr, setDestAddr] = useState("");
  //Use state to keep track of what UI of the form is displayed
  const [formState, setFormState] = useState<BookingUIStates>(
    BookingUIStates.Where_To,
  );
  //Holds the previously visited UI state
  const [prevFormState, setPrevFormState] = useState<BookingUIStates | null>(
    null,
  );

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
      emailOrPhone: (value) =>
        value.length !== 0 ? null : "Field cannot be blank",
    },
  });
  const formThree = useForm({
    mode: "uncontrolled",

    initialValues: {
      oneTimeCode: "",
    },

    validate: {
      oneTimeCode: (value) =>
        value.length !== 0 ? null : "Field cannot be blank",
    },
  });
  const formFour = useForm({
    mode: "uncontrolled",

    initialValues: {
      name: "",
      reasonForTrip: "",
    },

    validate: {
      name: (value) => (value.length !== 0 ? null : "Field cannot be blank"),
    },
  });
  const formFive = useForm({
    mode: "controlled",

    initialValues: {
      paymentType: "Pay with Credit Card",
      enteredCode: "",
    },

    validate: {
      paymentType: (paymentType, formValues) => {
        if (paymentType.length === 0) {
          return "A selection must be made";
        } else if (
          paymentType === "Redeem Code" &&
          formValues.enteredCode === ""
        ) {
          return "Must input a valid code";
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
      <FormUI
        body={
          <>
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
              {...formOne.getInputProps("pickupTime")}
            />

            <DropdownField
              ariaLabel="Pick-up address field"
              changeValue={setPickupAddr}
              fieldName="pickupAddr"
              fieldValue={pickupAddr}
              form={formOne}
              icon={<MapPinLineIcon size={20} />}
              placeholder="Pick-up Address"
            />
            <DropdownField
              ariaLabel="Destination address field"
              changeValue={setDestAddr}
              fieldName="destAddr"
              fieldValue={destAddr}
              form={formOne}
              icon={<PathIcon size={20} />}
              placeholder="Destination Address"
            />
          </>
        }
        changeFormState={setFormState}
        changePrevFormState={setPrevFormState}
        currentFormState={formState}
        form={formOne}
        nextButtonText={"Continue"}
        nextUIType={BookingUIStates.Enter_Email_Phone}
        prevFormState={prevFormState}
        prevUIType={null}
        showBackButton={false}
        title={"Where to?"}
        uiType={BookingUIStates.Where_To}
      />

      <FormUI
        body={
          <>
            <TextInput
              aria-label="Enter email or phone number"
              description="Verify that you're human. Enter an email or phone number that we can contact you with"
              key={formTwo.key("emailOrPhone")}
              leftSection={<ShieldCheckIcon size={20} />}
              {...formTwo.getInputProps("emailOrPhone")}
              placeholder="Email or Phone Number"
            />
          </>
        }
        changeFormState={setFormState}
        changePrevFormState={setPrevFormState}
        currentFormState={formState}
        form={formTwo}
        nextButtonText={"Continue"}
        nextUIType={BookingUIStates.Verify}
        prevFormState={prevFormState}
        prevUIType={BookingUIStates.Where_To}
        showBackButton={true}
        title={"Enter Email/Phone"}
        uiType={BookingUIStates.Enter_Email_Phone}
      />

      <FormUI
        body={
          <>
            <TextInput
              aria-label="Enter one-time code"
              description="A code was sent to this [email/phone number via SMS]. Enter the code below"
              key={formThree.key("oneTimeCode")}
              leftSection={<ShieldCheckIcon size={20} />}
              {...formThree.getInputProps("oneTimeCode")}
              placeholder="One-Time Code"
            />
          </>
        }
        changeFormState={setFormState}
        changePrevFormState={setPrevFormState}
        currentFormState={formState}
        form={formThree}
        nextButtonText={"Continue"}
        nextUIType={BookingUIStates.About_You}
        prevFormState={prevFormState}
        prevUIType={BookingUIStates.Enter_Email_Phone}
        showBackButton={true}
        title={"Verify"}
        uiType={BookingUIStates.Verify}
      />

      <FormUI
        body={
          <>
            <TextInput
              aria-label="Text box for your name"
              key={formFour.key("name")}
              leftSection={<ShieldCheckIcon size={20} />}
              {...formFour.getInputProps("name")}
              placeholder="Your Name"
            />
            <TextInput
              aria-label="Reason for trip (optional)"
              key={formFour.key("reasonForTrip")}
              leftSection={<ShieldCheckIcon size={20} />}
              {...formFour.getInputProps("reasonForTrip")}
              placeholder="Reason for Trip (optional)"
            />
          </>
        }
        changeFormState={setFormState}
        changePrevFormState={setPrevFormState}
        currentFormState={formState}
        form={formFour}
        nextButtonText={"Continue"}
        nextUIType={BookingUIStates.Payment}
        prevFormState={prevFormState}
        prevUIType={BookingUIStates.Verify}
        showBackButton={true}
        title={"About You"}
        uiType={BookingUIStates.About_You}
      />

      <FormUI
        body={
          <>
            <Radio.Group
              aria-label="Select payment method"
              {...formFive.getInputProps("paymentType")}
              error={null}
              size="md"
            >
              <Stack>
                <Radio
                  color="buttonColor"
                  label="Pay with Credit Card"
                  value="Pay with Credit Card"
                />
                <Radio
                  color="buttonColor"
                  label="Redeem Code"
                  value="Redeem Code"
                />
                {formFive.values.paymentType === "Redeem Code" && (
                  <TextInput
                    error={formFive.errors.paymentType}
                    onChange={(event) => {
                      formFive.values.enteredCode = event.currentTarget.value;
                      formFive.clearErrors();
                    }}
                    placeholder="Enter Code"
                  />
                )}
                <Radio
                  color="buttonColor"
                  label="Pay with Rides"
                  value="Pay with Rides"
                />
              </Stack>
            </Radio.Group>
          </>
        }
        changeFormState={setFormState}
        changePrevFormState={setPrevFormState}
        currentFormState={formState}
        form={formFive}
        nextButtonText={"Continue"}
        nextUIType={BookingUIStates.Select_Pay}
        prevFormState={prevFormState}
        prevUIType={BookingUIStates.About_You}
        showBackButton={true}
        title={"Payment"}
        uiType={BookingUIStates.Payment}
      />
    </Center>
  );
}
