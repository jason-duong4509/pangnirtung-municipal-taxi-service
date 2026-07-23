"use client";
import {
  ActionIcon,
  Button,
  Center,
  Checkbox,
  Combobox,
  Grid,
  Group,
  MantineProvider,
  Paper,
  Radio,
  ScrollArea,
  Stack,
  Text,
  Textarea,
  TextInput,
  Title,
  Transition,
  useCombobox,
  useMantineTheme,
} from "@mantine/core";
import { DateTimePicker } from "@mantine/dates";
import { type UseFormReturnType, useForm } from "@mantine/form";
import { useMediaQuery } from "@mantine/hooks";
import {
  ArrowLeftIcon,
  CalendarBlankIcon,
  CurrencyCircleDollarIcon,
  MapPinLineIcon,
  PaperPlaneTiltIcon,
  PathIcon,
  QuestionIcon,
  ShieldCheckIcon,
  UserIcon,
} from "@phosphor-icons/react";
import dayjs from "dayjs";
import {
  type Dispatch,
  type JSX,
  type ReactNode,
  type SetStateAction,
  useState,
} from "react";

//Enum constants to denote what UI is displayed to the user
const BookingUIStates = {
  Where_To: "Where_to", //pickup time, to/from locations
  Enter_Email_Phone: "Enter_Email_Phone", //non-logged in verify 1
  Verify: "Verify", //non-logged in verify 2
  About_You: "About_You", //name + reason for trip
  Payment: "Payment", //payment options screen
  Buy_Rides: "Buy_Rides", //buy more rides screen (USES NEW COMPONENT)
  Select_Pay: "Select_Pay", //select a credit card screen (USES NEW COMPONENT)
  Confirm: "Confirm", //confirm user input screen
  End: "End", //successfully booked trip
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
  form: UseFormReturnType<any>;
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
  isMobile,
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
  isMobile: boolean | undefined;
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
          mah={{ base: "350px", smMd: "400px" }}
          p={"xl"}
          pos={"absolute"}
          radius="lg"
          shadow="xl"
          style={transitionStyle}
          w={{ base: "350px", smMd: "400px" }}
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
                <ScrollArea.Autosize
                  mah={isMobile ? "170px" : "220px"}
                  scrollbars={
                    isMobile
                      ? "y"
                      : currentFormState === BookingUIStates.Confirm
                        ? "y"
                        : false
                  }
                >
                  <Stack gap={"sm"}>{body}</Stack>
                </ScrollArea.Autosize>
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
  const mantineTheme = useMantineTheme();
  const isMobile = useMediaQuery(
    `(max-width: ${mantineTheme.breakpoints.smMd})`,
  );
  //Use state to keep track of what UI of the form is displayed
  const [formState, setFormState] = useState<BookingUIStates>(
    BookingUIStates.Where_To,
  );
  //Holds the previously visited UI state
  const [prevFormState, setPrevFormState] = useState<BookingUIStates | null>(
    null,
  );

  //Configure booking form
  const bookingForm = useForm({
    mode: "uncontrolled",

    //Initial field values of form
    initialValues: {
      pickupTime: null as Date | null,
      pickupAddr: "",
      destAddr: "",
      name: "",
      reasonForTrip: "",
      receiveReminders: false,
    },

    //Frontend field checks
    validate: {
      pickupTime: (value) =>
        formState === BookingUIStates.Where_To ||
        formState === BookingUIStates.Confirm
          ? value !== null
            ? null
            : "Must select a pick-up time"
          : null,
      pickupAddr: (value) =>
        formState === BookingUIStates.Where_To ||
        formState === BookingUIStates.Confirm
          ? value.length !== 0
            ? null
            : "Must add a pick-up address"
          : null,
      destAddr: (value) =>
        formState === BookingUIStates.Where_To ||
        formState === BookingUIStates.Confirm
          ? value.length !== 0
            ? null
            : "Must add a destination address"
          : null,
      name: (value) =>
        formState === BookingUIStates.About_You ||
        formState === BookingUIStates.Confirm
          ? value.length !== 0
            ? null
            : "Field cannot be blank"
          : null,
    },
  });

  //Configure verification form (used for not logged in users)
  const verificationForm = useForm({
    mode: "uncontrolled",

    //Initial field values of form
    initialValues: {
      emailOrPhone: "",
      oneTimeCode: "",
    },

    //Frontend field checks
    validate: {
      emailOrPhone: (value) =>
        formState === BookingUIStates.Enter_Email_Phone
          ? value.length !== 0
            ? null
            : "Field cannot be blank"
          : null,
      oneTimeCode: (value) =>
        formState === BookingUIStates.Verify
          ? value.length !== 0
            ? null
            : "Field cannot be blank"
          : null,
    },
  });

  //Configure payment form
  const paymentForm = useForm({
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
              {...bookingForm.getInputProps("pickupTime")}
            />

            <DropdownField
              ariaLabel="Pick-up address field"
              changeValue={setPickupAddr}
              fieldName="pickupAddr"
              fieldValue={pickupAddr}
              form={bookingForm}
              icon={<MapPinLineIcon size={20} />}
              placeholder="Pick-up Address"
            />
            <DropdownField
              ariaLabel="Destination address field"
              changeValue={setDestAddr}
              fieldName="destAddr"
              fieldValue={destAddr}
              form={bookingForm}
              icon={<PathIcon size={20} />}
              placeholder="Destination Address"
            />
          </>
        }
        changeFormState={setFormState}
        changePrevFormState={setPrevFormState}
        currentFormState={formState}
        form={bookingForm}
        isMobile={isMobile}
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
              key={verificationForm.key("emailOrPhone")}
              leftSection={<PaperPlaneTiltIcon size={20} />}
              {...verificationForm.getInputProps("emailOrPhone")}
              placeholder="Email or Phone Number"
            />
          </>
        }
        changeFormState={setFormState}
        changePrevFormState={setPrevFormState}
        currentFormState={formState}
        form={verificationForm}
        isMobile={isMobile}
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
              key={verificationForm.key("oneTimeCode")}
              leftSection={<ShieldCheckIcon size={20} />}
              {...verificationForm.getInputProps("oneTimeCode")}
              placeholder="One-Time Code"
            />
            <Group align="flex-start">
              <Button
                c={"black"}
                fw={"normal"}
                p={0}
                size="compact-sm"
                style={{ textDecoration: "underline" }}
                variant="transparent"
              >
                Request new code
              </Button>
            </Group>
          </>
        }
        changeFormState={setFormState}
        changePrevFormState={setPrevFormState}
        currentFormState={formState}
        form={verificationForm}
        isMobile={isMobile}
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
              key={bookingForm.key("name")}
              leftSection={<UserIcon size={20} />}
              {...bookingForm.getInputProps("name")}
              placeholder="Your Name"
            />
            <Textarea
              aria-label="Reason for trip (optional)"
              key={bookingForm.key("reasonForTrip")}
              leftSection={<QuestionIcon size={20} />}
              {...bookingForm.getInputProps("reasonForTrip")}
              autosize
              maxRows={4}
              minRows={1}
              placeholder="Reason for Trip (optional)"
            />
          </>
        }
        changeFormState={setFormState}
        changePrevFormState={setPrevFormState}
        currentFormState={formState}
        form={bookingForm}
        isMobile={isMobile}
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
              {...paymentForm.getInputProps("paymentType")}
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
                {paymentForm.values.paymentType === "Redeem Code" && (
                  <TextInput
                    aria-label="Text input field to redeem a code that covers a ride"
                    error={paymentForm.errors.paymentType}
                    onChange={(event) => {
                      paymentForm.values.enteredCode =
                        event.currentTarget.value;
                      paymentForm.clearErrors();
                    }}
                    placeholder="Enter Code"
                    value={paymentForm.values.enteredCode}
                  />
                )}
                <Radio
                  color="buttonColor"
                  label="Pay with Rides"
                  value="Pay with Rides"
                />
                {paymentForm.values.paymentType === "Pay with Rides" && (
                  <Text>
                    <Text span>
                      This trip costs 1 Ride. You will have 40 Rides remaining.{" "}
                    </Text>
                    <Text span>Buy More</Text>
                  </Text>
                )}
              </Stack>
            </Radio.Group>
          </>
        }
        changeFormState={setFormState}
        changePrevFormState={setPrevFormState}
        currentFormState={formState}
        form={paymentForm}
        isMobile={isMobile}
        nextButtonText={"Continue"}
        nextUIType={BookingUIStates.Confirm}
        prevFormState={prevFormState}
        prevUIType={BookingUIStates.About_You}
        showBackButton={true}
        title={"Payment"}
        uiType={BookingUIStates.Payment}
      />

      <FormUI
        body={
          <>
            <Grid gutter={0}>
              <Grid.Col span={6}>
                <Text>Name</Text>
              </Grid.Col>
              <Grid.Col span={6}>
                <TextInput
                  aria-label="Text box with previously entered name"
                  key={bookingForm.key("name")}
                  leftSection={<UserIcon size={20} />}
                  {...bookingForm.getInputProps("name")}
                  placeholder="Your Name"
                />
              </Grid.Col>
            </Grid>
            <Grid gutter={0}>
              <Grid.Col span={6}>
                <Text>Pick-up Address</Text>
              </Grid.Col>
              <Grid.Col span={6}>
                <DropdownField
                  ariaLabel="Text box with previously entered pick-up address"
                  changeValue={setPickupAddr}
                  fieldName="pickupAddr"
                  fieldValue={pickupAddr}
                  form={bookingForm}
                  icon={<MapPinLineIcon size={20} />}
                  placeholder="Location"
                />
              </Grid.Col>
            </Grid>
            <Grid gutter={0}>
              <Grid.Col span={6}>
                <Text>Pick-up Time</Text>
              </Grid.Col>
              <Grid.Col span={6}>
                <DateTimePicker
                  aria-label="Text box with previously entered pick-up time"
                  clearable
                  leftSection={<CalendarBlankIcon size={19} />}
                  maxDate={dayjs().add(1, "month").toDate()}
                  minDate={new Date()}
                  placeholder="Time and Date"
                  presets={[
                    {
                      value: dayjs().format("YYYY-MM-DD HH:mm:ss"),
                      label: "Now",
                    },
                  ]}
                  timePickerProps={{
                    withDropdown: true,
                    format: "12h",
                    popoverProps: { withinPortal: false },
                  }}
                  valueFormat={"ddd[,] MMM D [at] h:mm A"}
                  {...bookingForm.getInputProps("pickupTime")}
                />
              </Grid.Col>
            </Grid>
            <Grid gutter={0}>
              <Grid.Col span={6}>
                <Text>Destination Address</Text>
              </Grid.Col>
              <Grid.Col span={6}>
                <DropdownField
                  ariaLabel="Text box with previously entered destination address"
                  changeValue={setDestAddr}
                  fieldName="destAddr"
                  fieldValue={destAddr}
                  form={bookingForm}
                  icon={<PathIcon size={20} />}
                  placeholder="Location"
                />
              </Grid.Col>
            </Grid>
            <Grid gutter={0}>
              <Grid.Col span={6}>
                <Text>Reason for Trip</Text>
              </Grid.Col>
              <Grid.Col span={6}>
                <Textarea
                  aria-label="Text box with previously entered trip reason"
                  key={bookingForm.key("reasonForTrip")}
                  leftSection={<QuestionIcon size={20} />}
                  {...bookingForm.getInputProps("reasonForTrip")}
                  autosize
                  maxRows={4}
                  minRows={1}
                  placeholder="Optional"
                />
              </Grid.Col>
            </Grid>
            <Grid gutter={0}>
              <Grid.Col span={6}>
                <Text>Payment Method</Text>
              </Grid.Col>
              <Grid.Col span={6}>
                <Textarea
                  aria-label="Previously entered payment type"
                  autosize
                  leftSection={<CurrencyCircleDollarIcon size={20} />}
                  minRows={1}
                  readOnly
                  value={paymentForm.values.paymentType}
                />
              </Grid.Col>
            </Grid>
            <Grid gutter={0}>
              <Grid.Col span={6}>
                <Text>Receive Reminders?</Text>
              </Grid.Col>
              <Grid.Col span={6}>
                <MantineProvider theme={{ cursorType: "pointer" }}>
                  <Checkbox
                    aria-label="Consent to receive reminders check box"
                    color="buttonColor"
                    key={bookingForm.key("receiveReminders")}
                    label="Yes"
                    {...bookingForm.getInputProps("receiveReminders", {
                      type: "checkbox",
                    })}
                  />
                </MantineProvider>
              </Grid.Col>
            </Grid>
          </>
        }
        changeFormState={setFormState}
        changePrevFormState={setPrevFormState}
        currentFormState={formState}
        form={bookingForm}
        isMobile={isMobile}
        nextButtonText={"Book"}
        nextUIType={BookingUIStates.End}
        prevFormState={prevFormState}
        prevUIType={BookingUIStates.Payment}
        showBackButton={true}
        title={"Confirm"}
        uiType={BookingUIStates.Confirm}
      />
    </Center>
  );
}
