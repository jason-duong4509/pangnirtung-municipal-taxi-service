"use client";
import {
  ActionIcon,
  Anchor,
  Button,
  Center,
  Checkbox,
  Drawer,
  Grid,
  Group,
  Input,
  Loader,
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
  useMantineTheme,
} from "@mantine/core";
import { type UseFormReturnType, useForm } from "@mantine/form";
import { useDisclosure, useMediaQuery } from "@mantine/hooks";
import {
  ArrowLeftIcon,
  CalendarBlankIcon,
  CurrencyCircleDollarIcon,
  DeviceMobileIcon,
  EnvelopeSimpleIcon,
  MapPinLineIcon,
  PathIcon,
  QuestionIcon,
  UserIcon,
} from "@phosphor-icons/react";
import {
  type Dispatch,
  type JSX,
  type SetStateAction,
  useEffect,
  useState,
} from "react";
import { IMaskInput } from "react-imask";
import {
  dbTimeToLocalTime,
  dbTimeToPrettyString,
  formatString,
} from "~/lib/helpers";
import {
  checkAddress,
  checkEmail,
  checkName,
  checkPhoneNumber,
  checkPickUpTime,
  checkTripReason,
} from "~/lib/input-checkers";
import { showNotifications } from "~/lib/mantine-notifications-system";
import type { RouterOutputs } from "~/server/api/root";
import { authClient } from "~/server/better-auth/client";
import { api } from "~/trpc/react";
import { PaymentMethods } from "~/types/types";
import AlertPopup from "../common/alert/alert";
import AddressDropdown from "./booking-form-components/address-drop-down-field";
import PickupTimeInput from "./booking-form-components/pick-up-time-field";

//Enum constants to denote what UI is displayed to the user
const BookingUIStates = {
  Where_To: "Where_to", //pickup time, to/from locations
  About_You: "About_You", //name + reason for trip
  Payment: "Payment", //payment options screen
  Buy_Rides: "Buy_Rides", //buy more rides screen (USES NEW COMPONENT)
  Select_Pay: "Select_Pay", //select a credit card screen (USES NEW COMPONENT)
  Confirm: "Confirm", //confirm user input screen
  End: "End", //successfully booked trip
} as const;
type BookingUIStates = (typeof BookingUIStates)[keyof typeof BookingUIStates];

type bookingsData = RouterOutputs["bookings"]["get"][0];

//Drawer component taken straight off the drawer from /bookings-history
//can be refactored to reuse the same component
const BookingsDrawer = ({
  closeDrawer,
  drawerOpened,
  drawerContents,
}: {
  closeDrawer: () => void;
  drawerOpened: boolean;
  drawerContents: bookingsData | undefined;
}) => {
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [alertModalOpened, { open: openAlertModal, close: closeAlertModal }] =
    useDisclosure(false);
  const [pickupAddr, setPickupAddr] = useState("");
  const [destAddr, setDestAddr] = useState("");
  const [alertBodyComponent, setAlertBodyComponent] = useState(
    <Text>Are you sure?</Text>,
  );
  const [onModalSubmit, setOnModalSubmit] = useState<() => void>(() => {});

  const updateBookingMutation = api.bookings.update.useMutation({
    onSuccess: () => {
      showNotifications.success("Booking updated");
      setFormSubmitting(false);
      closeDrawer();
      closeAlertModal();
    },
    onError: (error) => {
      showNotifications.error(error.message);
      setFormSubmitting(false);
    },
  });

  const cancelBookingMutation = api.bookings.cancel.useMutation({
    onSuccess: () => {
      showNotifications.success("Cancelled successfully");
      setFormSubmitting(false);
      closeDrawer();
      closeAlertModal();
    },
    onError: (error) => {
      showNotifications.error(error.message);
      setFormSubmitting(false);
    },
  });

  const bookingForm = useForm<{
    pickupTime: string | null | Date;
    pickupAddr: string;
    destAddr: string;
    name: string;
    reasonForTrip: string;
    paymentMethod: string;
    paymentCode: string | null;
    id: number;
    status: string;
    createdAt: Date;
    updatedAt: Date;
  }>({
    mode: "uncontrolled",

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
    },
  });

  useEffect(() => {
    if (!drawerContents) {
      return;
    }

    //Prefill mantine controlled fields with booking data
    setPickupAddr(drawerContents.pickupAddr);
    setDestAddr(drawerContents.destAddr);

    //--Prefill mantine form with booking data--
    bookingForm.setInitialValues({
      pickupTime: dbTimeToLocalTime(drawerContents.pickupTime),
      pickupAddr: drawerContents.pickupAddr,
      destAddr: drawerContents.destAddr,
      name: drawerContents.name,
      reasonForTrip: drawerContents.tripReason,
      paymentMethod: formatString(drawerContents.payment),
      paymentCode: null, //TODO: add feature for this
      id: drawerContents.id,
      status: formatString(drawerContents.status),
      createdAt: drawerContents.createdAt,
      updatedAt: drawerContents.updatedAt,
    });
    bookingForm.setValues({
      pickupTime: dbTimeToLocalTime(drawerContents.pickupTime),
      pickupAddr: drawerContents.pickupAddr,
      destAddr: drawerContents.destAddr,
      name: drawerContents.name,
      reasonForTrip: drawerContents.tripReason,
      paymentMethod: formatString(drawerContents.payment),
      paymentCode: null, //TODO: add feature for this
      id: drawerContents.id,
      status: formatString(drawerContents.status),
      createdAt: drawerContents.createdAt,
      updatedAt: drawerContents.updatedAt,
    });
    //------------------------------------------

    bookingForm.resetDirty();
  }, [
    drawerContents,
    bookingForm.setValues,
    bookingForm.setInitialValues,
    bookingForm.resetDirty,
  ]);

  const handleFormOnSubmit = async (values: typeof bookingForm.values) => {
    if (formSubmitting) {
      //If form is already submitting
      return;
    }
    setFormSubmitting(true);

    updateBookingMutation.mutate({
      pickupAddr: values.pickupAddr,
      destAddr: values.destAddr,
      name: values.name,
      pickupTime: values.pickupTime as string | null,
      bookingId: values.id,
      tripReason: values.reasonForTrip,
    });
  };

  return (
    <>
      <AlertPopup
        abortButtonText={"Back"}
        body={alertBodyComponent}
        closeModal={closeAlertModal}
        confirmButtonText={"Confirm"}
        isLoading={formSubmitting}
        modalOpened={alertModalOpened}
        onConfirm={() => onModalSubmit()}
        titleText={"Are you Sure?"}
      />
      <Drawer
        offset={8}
        onClose={closeDrawer}
        opened={drawerOpened}
        radius="md"
        styles={
          bookingForm.getValues().status === "Pending"
            ? { body: { paddingBottom: 0 } }
            : undefined
        }
        title={
          bookingForm.getValues().status === "Pending"
            ? "Edit Trip"
            : "View Trip"
        }
      >
        <Stack h={"calc(100dvh - 75px)"}>
          <TextInput
            label="Trip Status"
            readOnly
            value={bookingForm.getValues().status}
            variant="unstyled"
          />
          <TextInput
            label="Booking ID"
            readOnly
            value={bookingForm.getValues().id}
            variant="unstyled"
          />
          <TextInput
            aria-label="Contact Name"
            label={"Contact Name"}
            leftSection={<UserIcon size={20} />}
            placeholder="Contact Name"
            {...bookingForm.getInputProps("name")}
            readOnly={bookingForm.getValues().status !== "Pending"}
            withAsterisk
          />
          {bookingForm.getValues().status === "Pending" && (
            <>
              <PickupTimeInput
                form={bookingForm}
                formField={"pickupTime"}
                useLabel
                withAsterisk
              />
              <AddressDropdown
                ariaLabel="Pick-up address field"
                changeValue={setPickupAddr}
                fieldName="pickupAddr"
                fieldValue={pickupAddr}
                form={bookingForm}
                icon={<MapPinLineIcon size={20} />}
                label="Pick-up Address"
                placeholder="Pick-up Address"
                withAsterisk
              />
              <AddressDropdown
                ariaLabel="Destination address field"
                changeValue={setDestAddr}
                fieldName="destAddr"
                fieldValue={destAddr}
                form={bookingForm}
                icon={<PathIcon size={20} />}
                label="Destination Address"
                placeholder="Destination Address"
                withAsterisk
              />
            </>
          )}
          {bookingForm.getValues().status !== "Pending" && (
            <>
              <TextInput
                label={"Pick-up Time"}
                leftSection={<CalendarBlankIcon size={20} />}
                readOnly
                value={dbTimeToPrettyString(
                  bookingForm.getValues().pickupTime as Date,
                )}
              />
              <TextInput
                label={"Pick-up Address"}
                leftSection={<MapPinLineIcon size={20} />}
                readOnly
                value={bookingForm.getValues().pickupAddr}
              />
              <TextInput
                label={"Destination Address"}
                leftSection={<PathIcon size={20} />}
                readOnly
                value={bookingForm.getValues().destAddr}
              />
            </>
          )}
          <Textarea
            aria-label="Reason for trip"
            key={bookingForm.key("reasonForTrip")}
            leftSection={<QuestionIcon size={20} />}
            {...bookingForm.getInputProps("reasonForTrip")}
            autosize
            label="Reason for Trip"
            maxRows={4}
            minRows={1}
            placeholder="Optional"
            readOnly={bookingForm.getValues().status !== "Pending"}
          />
          <TextInput
            aria-label="Payment method"
            defaultValue={
              bookingForm.getValues().paymentMethod === "Redeem Code"
                ? `Code (${bookingForm.getValues().paymentCode ?? "unable to retrieve code"})`
                : bookingForm.getValues().paymentMethod
            }
            label="Payment Method"
            readOnly
            variant="unstyled"
          />
          <TextInput
            label="Created On"
            readOnly
            value={dbTimeToPrettyString(bookingForm.getValues().createdAt)}
            variant="unstyled"
          />
          <TextInput
            label="Last Updated"
            readOnly
            value={dbTimeToPrettyString(bookingForm.getValues().updatedAt)}
            variant="unstyled"
          />
          {bookingForm.getValues().status === "Pending" && (
            <Stack bottom={"0%"} flex={1} justify="flex-end" pos={"sticky"}>
              <Group bg={"primaryColor"} grow py={"md"}>
                <Button
                  c={"black"}
                  color="buttonColor"
                  onClick={() => {
                    openAlertModal();
                    setAlertBodyComponent(
                      <>
                        <Text>
                          A refund will be provided to trips that are still
                          pending
                        </Text>
                        <Text>This action cannot be undone!</Text>
                      </>,
                    );
                    setOnModalSubmit(() => () => {
                      setFormSubmitting(true);
                      cancelBookingMutation.mutate({
                        bookingIds: [bookingForm.getValues().id],
                      });
                    });
                  }}
                  p={0}
                  size="compact-sm"
                  type="button"
                  variant="outline"
                >
                  Cancel Trip
                </Button>
                <Button
                  c={bookingForm.isDirty() ? "black" : undefined}
                  color="buttonColor"
                  disabled={!bookingForm.isDirty()}
                  form="booking-form"
                  onClick={() => {
                    bookingForm.validate();
                    if (bookingForm.isValid()) {
                      openAlertModal();
                      setAlertBodyComponent(
                        <Text>
                          Trip information will be changed. Are you sure?
                        </Text>,
                      );
                      setOnModalSubmit(
                        () => () => bookingForm.onSubmit(handleFormOnSubmit)(),
                      );
                    }
                  }}
                  p={0}
                  size="compact-sm"
                  type="button"
                  variant="filled"
                >
                  Update Trip
                </Button>
              </Group>
            </Stack>
          )}
        </Stack>
      </Drawer>
    </>
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
  formSubmitting,
  openLoginModal,
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
  formSubmitting?: boolean;
  openLoginModal: () => void;
}) => {
  const { data: session, isPending } = authClient.useSession();
  const [firstRender, setFirstRender] = useState(true);

  if (!isPending && firstRender) {
    setFirstRender(false);
  }

  return (
    <>
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
                  if (session) {
                    if (handleSubmit) {
                      //Form submit function provided
                      form.onSubmit(handleSubmit)();
                    } else if (nextUIType) {
                      changePrevFormState(currentFormState);
                      changeFormState(nextUIType);
                    }
                  } else {
                    openLoginModal();
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
                  <Button
                    c={"black"}
                    color="buttonColor"
                    disabled={firstRender}
                    type="submit"
                  >
                    {!formSubmitting && nextButtonText}
                    {formSubmitting && <Loader color="black" size={20} />}
                  </Button>
                </Stack>
              </form>
            </Stack>
          </Paper>
        )}
      </Transition>
    </>
  );
};

export default function BookingForm({
  openLoginModal,
}: {
  openLoginModal: () => void;
}) {
  const [pickupAddr, setPickupAddr] = useState("");
  const [destAddr, setDestAddr] = useState("");
  const [formSubmitting, setFormSubmitting] = useState(false);
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
  const [sendReceiptToEmail, setSendReceiptToEmail] = useState(false);
  const { data: session } = authClient.useSession();
  const [firstRender, setFirstRender] = useState(true);
  const [bookedTripId, setBookedTripId] = useState(0);
  const [drawerOpened, { open: openDrawer, close: closeDrawer }] =
    useDisclosure(false);
  const [drawerContents, setDrawerContents] = useState<
    bookingsData | undefined
  >(undefined);

  const getUserQuery = api.users.getSelf.useQuery(undefined, {
    enabled: false,
  });

  const getBookingQuery = api.bookings.getOne.useQuery(
    { bookingId: bookedTripId },
    {
      enabled: false,
    },
  );

  if (session && firstRender) {
    getUserQuery.refetch();
    setFirstRender(false);
  }

  useEffect(() => {
    if (bookedTripId !== 0) {
      getBookingQuery.refetch();
    }
  }, [bookedTripId, getBookingQuery.refetch]);

  //Create booking mutation
  const createBookingMutation = api.bookings.create.useMutation({
    onSuccess: (data) => {
      setFormSubmitting(false);
      setFormState(BookingUIStates.End);
      setBookedTripId(data.id);
    },
    onError: (error) => {
      showNotifications.error(error.message);
      setFormSubmitting(false);
    },
  });

  //Configure booking form
  const bookingForm = useForm({
    mode: "uncontrolled",

    //Initial field values of form
    initialValues: {
      pickupTime: null as string | null,
      pickupAddr: "",
      destAddr: "",
      name: "",
      reasonForTrip: "",
      receiveReminders: false,
      requestVerification: false,
      contactEmail: "",
      contactPhone: "",
    },

    //Frontend field checks
    validate: {
      pickupTime: (value) => {
        if (
          formState === BookingUIStates.Where_To ||
          formState === BookingUIStates.Confirm
        ) {
          const result = checkPickUpTime(value);

          if (result.isProper) {
            return null;
          } else {
            return result.errorMessage;
          }
        } else {
          return null;
        }
      },
      pickupAddr: (value) => {
        if (
          formState === BookingUIStates.Where_To ||
          formState === BookingUIStates.Confirm
        ) {
          const result = checkAddress(value);

          if (result.isProper) {
            return null;
          } else {
            return result.errorMessage;
          }
        } else {
          return null;
        }
      },
      destAddr: (value) => {
        if (
          formState === BookingUIStates.Where_To ||
          formState === BookingUIStates.Confirm
        ) {
          const result = checkAddress(value);

          if (result.isProper) {
            return null;
          } else {
            return result.errorMessage;
          }
        } else {
          return null;
        }
      },
      name: (value) => {
        if (
          formState === BookingUIStates.About_You ||
          formState === BookingUIStates.Confirm
        ) {
          const result = checkName(value);

          if (result.isProper) {
            return null;
          } else {
            return result.errorMessage;
          }
        } else {
          return null;
        }
      },
      reasonForTrip: (value) => {
        if (
          formState === BookingUIStates.About_You ||
          formState === BookingUIStates.Confirm
        ) {
          const result = checkTripReason(value);

          if (result.isProper) {
            return null;
          } else {
            return result.errorMessage;
          }
        } else {
          return null;
        }
      },
      contactEmail: (value) => {
        if (sendReceiptToEmail) {
          const result = checkEmail(value);

          if (result.isProper) {
            return null;
          } else {
            return result.errorMessage;
          }
        } else {
          return null;
        }
      },
      contactPhone: (value) => {
        if (
          formState === BookingUIStates.About_You ||
          formState === BookingUIStates.Confirm
        ) {
          const result = checkPhoneNumber(value);

          if (result.isProper) {
            return null;
          } else {
            return result.errorMessage;
          }
        } else {
          return null;
        }
      },
    },
  });

  //Configure payment form
  const paymentForm = useForm<{
    paymentType: PaymentMethods;
    enteredCode: string;
  }>({
    mode: "controlled",

    initialValues: {
      paymentType: PaymentMethods.CREDIT_CARD,
      enteredCode: "",
    },

    validate: {
      paymentType: (paymentType, formValues) => {
        if (
          paymentType !== PaymentMethods.REDEEM_CODE &&
          paymentType !== PaymentMethods.CREDIT_CARD &&
          paymentType !== PaymentMethods.RIDES
        ) {
          return "A selection must be made";
        } else if (
          paymentType === PaymentMethods.REDEEM_CODE &&
          formValues.enteredCode === ""
        ) {
          return "Must input a valid code";
        }
        return null;
      },
    },
  });

  //Functions that handles form submit behavior
  const handleBookingSubmit = async (values: typeof bookingForm.values) => {
    if (formSubmitting) {
      return;
    }
    setFormSubmitting(true);

    createBookingMutation.mutate({
      pickupAddr: values.pickupAddr,
      destAddr: values.destAddr,
      name: values.name,
      pickupTime: values.pickupTime,
      tripReason: values.reasonForTrip,
      payment: paymentForm.values.paymentType,
      reminders: values.receiveReminders,
      requestVerification: values.requestVerification,
      contactEmail: sendReceiptToEmail ? values.contactEmail : "",
      contactPhone: values.contactPhone,
    });
  };

  useEffect(() => {
    if (!getUserQuery.isLoading && getUserQuery.data?.[0]) {
      const user = getUserQuery.data[0].user;

      bookingForm.setValues({
        contactEmail: user.email.includes("@no-email-given.pang")
          ? ""
          : user.email,
        contactPhone: user.phoneNumber!,
        name: user.name.includes("no-name-given.pang") ? "" : user.name,
      });
    }
  }, [getUserQuery.isLoading, getUserQuery.data, bookingForm.setValues]);

  useEffect(() => {
    if (getBookingQuery.data) {
      setDrawerContents(getBookingQuery.data[0]);
    }
  }, [getBookingQuery.data]);

  return (
    <Center
      h={"100%"}
      pos={"relative"}
      style={{ overflow: "hidden" }}
      w={"100%"}
    >
      <BookingsDrawer
        closeDrawer={closeDrawer}
        drawerContents={drawerContents}
        drawerOpened={drawerOpened}
      />
      <FormUI
        body={
          <>
            <PickupTimeInput form={bookingForm} formField={"pickupTime"} />

            <AddressDropdown
              ariaLabel="Pick-up address field"
              changeValue={setPickupAddr}
              fieldName="pickupAddr"
              fieldValue={pickupAddr}
              form={bookingForm}
              icon={<MapPinLineIcon size={20} />}
              placeholder="Pick-up Address"
            />
            <AddressDropdown
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
        nextUIType={BookingUIStates.About_You}
        openLoginModal={openLoginModal}
        prevFormState={prevFormState}
        prevUIType={null}
        showBackButton={false}
        title={"Where to?"}
        uiType={BookingUIStates.Where_To}
      />

      <FormUI
        body={
          <>
            <ScrollArea.Autosize mah={isMobile ? "170px" : "200px"}>
              <Stack gap={"sm"}>
                <TextInput
                  aria-label="Text box for your name"
                  key={bookingForm.key("name")}
                  leftSection={<UserIcon size={20} />}
                  {...bookingForm.getInputProps("name")}
                  disabled={!getUserQuery.data?.[0]}
                  placeholder="Contact Name"
                />
                <div>
                  <Input.Wrapper
                    aria-label="Text box for your phone number"
                    error={bookingForm.errors.contactPhone}
                  >
                    <Input
                      component={IMaskInput}
                      key={bookingForm.key("contactPhone")}
                      mask="(000) 000-0000"
                      placeholder="Contact Phone Number"
                      {...bookingForm.getInputProps("contactPhone")}
                      disabled={!getUserQuery.data?.[0]}
                      leftSection={<DeviceMobileIcon size={20} />}
                    />
                  </Input.Wrapper>
                  <Button
                    c={"black"}
                    fw={"normal"}
                    onClick={() => {}}
                    p={0}
                    size="compact-sm"
                    style={{ textDecoration: "underline" }}
                    type="button"
                    variant="transparent"
                  >
                    Load Name + Number Preset
                  </Button>
                </div>
                <Textarea
                  aria-label="Reason for trip (optional)"
                  key={bookingForm.key("reasonForTrip")}
                  leftSection={<QuestionIcon size={20} />}
                  {...bookingForm.getInputProps("reasonForTrip")}
                  autosize
                  minRows={1}
                  placeholder="Reason for Trip (optional)"
                />
              </Stack>
            </ScrollArea.Autosize>
          </>
        }
        changeFormState={setFormState}
        changePrevFormState={setPrevFormState}
        currentFormState={formState}
        form={bookingForm}
        isMobile={isMobile}
        nextButtonText={"Continue"}
        nextUIType={BookingUIStates.Payment}
        openLoginModal={openLoginModal}
        prevFormState={prevFormState}
        prevUIType={BookingUIStates.Where_To}
        showBackButton={true}
        title={"About You"}
        uiType={BookingUIStates.About_You}
      />

      <FormUI
        body={
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
                value={PaymentMethods.CREDIT_CARD}
              />
              <Radio
                color="buttonColor"
                label="Redeem Code"
                value={PaymentMethods.REDEEM_CODE}
              />
              {paymentForm.values.paymentType ===
                PaymentMethods.REDEEM_CODE && (
                <TextInput
                  aria-label="Redeem code text input"
                  error={paymentForm.errors.paymentType}
                  onChange={(event) => {
                    paymentForm.values.enteredCode = event.currentTarget.value;
                    paymentForm.clearErrors();
                  }}
                  placeholder="Enter Code"
                  value={paymentForm.values.enteredCode}
                />
              )}
              <Radio
                color="buttonColor"
                label="Pay with Rides"
                value={PaymentMethods.RIDES}
              />
              {paymentForm.values.paymentType === PaymentMethods.RIDES && (
                <Text>
                  <Text span>
                    This trip costs 1 Ride. You will have 40 Rides remaining.{" "}
                  </Text>
                  <Text span>Buy More</Text>
                </Text>
              )}
            </Stack>
          </Radio.Group>
        }
        changeFormState={setFormState}
        changePrevFormState={setPrevFormState}
        currentFormState={formState}
        form={paymentForm}
        isMobile={isMobile}
        nextButtonText={"Continue"}
        nextUIType={BookingUIStates.Confirm}
        openLoginModal={openLoginModal}
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
                  placeholder="Name"
                />
              </Grid.Col>
            </Grid>
            <Grid gutter={0}>
              <Grid.Col span={6}>
                <Text>Phone</Text>
              </Grid.Col>
              <Grid.Col span={6}>
                <Input.Wrapper
                  aria-label="Text box for your phone number"
                  error={bookingForm.errors.contactPhone}
                >
                  <Input
                    component={IMaskInput}
                    key={bookingForm.key("contactPhone")}
                    mask="(000) 000-0000"
                    placeholder="Phone Number"
                    {...bookingForm.getInputProps("contactPhone")}
                    leftSection={<DeviceMobileIcon size={20} />}
                  />
                </Input.Wrapper>
              </Grid.Col>
            </Grid>
            <Grid gutter={0}>
              <Grid.Col span={6}>
                <Text>Pick-up Address</Text>
              </Grid.Col>
              <Grid.Col span={6}>
                <AddressDropdown
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
                <PickupTimeInput form={bookingForm} formField={"pickupTime"} />
              </Grid.Col>
            </Grid>
            <Grid gutter={0}>
              <Grid.Col span={6}>
                <Text>Destination Address</Text>
              </Grid.Col>
              <Grid.Col span={6}>
                <AddressDropdown
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
                  value={formatString(paymentForm.values.paymentType)}
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
            <Grid gutter={0}>
              <Grid.Col span={6}>
                <Text>Request Resident Verification?</Text>
              </Grid.Col>
              <Grid.Col span={6}>
                <MantineProvider theme={{ cursorType: "pointer" }}>
                  <Checkbox
                    aria-label="Request to undergo resident verification"
                    color="buttonColor"
                    key={bookingForm.key("requestVerification")}
                    label="Yes"
                    {...bookingForm.getInputProps("requestVerification", {
                      type: "checkbox",
                    })}
                  />
                </MantineProvider>
              </Grid.Col>
            </Grid>
            <Grid gutter={0}>
              <Grid.Col span={6}>
                <Text>Send Receipt to Email?</Text>
              </Grid.Col>
              <Grid.Col span={6}>
                <MantineProvider theme={{ cursorType: "pointer" }}>
                  <Checkbox
                    aria-label="Send receipt to email checkbox"
                    checked={sendReceiptToEmail}
                    color="buttonColor"
                    label="Yes"
                    onChange={() => setSendReceiptToEmail(!sendReceiptToEmail)}
                  />
                </MantineProvider>
              </Grid.Col>
            </Grid>
            {sendReceiptToEmail && (
              <TextInput
                aria-label="Email address input"
                key={bookingForm.key("contactEmail")}
                leftSection={<EnvelopeSimpleIcon size={20} />}
                {...bookingForm.getInputProps("contactEmail")}
                placeholder="Email Address"
              />
            )}
          </>
        }
        changeFormState={setFormState}
        changePrevFormState={setPrevFormState}
        currentFormState={formState}
        form={bookingForm}
        formSubmitting={formSubmitting}
        handleSubmit={handleBookingSubmit}
        isMobile={isMobile}
        nextButtonText={"Book"}
        nextUIType={BookingUIStates.End}
        openLoginModal={openLoginModal}
        prevFormState={prevFormState}
        prevUIType={BookingUIStates.Payment}
        showBackButton={true}
        title={"Confirm"}
        uiType={BookingUIStates.Confirm}
      />
      <Transition
        duration={1000}
        mounted={formState === BookingUIStates.End}
        timingFunction="ease"
        transition={"slide-left"}
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
              <Group gap={"xs"} justify="space-between">
                <Title order={4}>You're Booked!</Title>
                <Button
                  c={"black"}
                  fw={"normal"}
                  onClick={() => window.location.reload()}
                  p={0}
                  size="compact-sm"
                  style={{ textDecoration: "underline" }}
                  type="button"
                  variant="transparent"
                >
                  Book Another Trip
                </Button>
              </Group>
              <Text>
                <Text component="span">
                  Your trip has been successfully booked. You can still make
                  changes to it until the trip is accepted by clicking the
                  button below or by visiting{" "}
                </Text>
                <Anchor href="/booking-history">Trip History</Anchor>
              </Text>

              <Button
                c={"black"}
                color="buttonColor"
                onClick={() => {
                  openDrawer();
                  getBookingQuery.refetch();
                }}
                type="button"
              >
                View and Edit Trip
              </Button>
            </Stack>
          </Paper>
        )}
      </Transition>
    </Center>
  );
}
