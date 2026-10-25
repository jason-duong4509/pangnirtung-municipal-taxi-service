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
  Select,
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
  ClipboardTextIcon,
  CurrencyCircleDollarIcon,
  DeviceMobileIcon,
  EnvelopeSimpleIcon,
  MapPinLineIcon,
  PathIcon,
  QuestionIcon,
  RoadHorizonIcon,
  UserIcon,
} from "@phosphor-icons/react";
import {
  type Dispatch,
  type JSX,
  type SetStateAction,
  useEffect,
  useRef,
  useState,
} from "react";
import { IMaskInput } from "react-imask";
import { dbTimeToLocalTime, formatString } from "~/lib/helpers";
import {
  checkAddress,
  checkBookingType,
  checkBookingTypeAndPaymentMethod,
  checkEmail,
  checkName,
  checkPaymentMethodType,
  checkPhoneNumber,
  checkPickUpTime,
  checkTripReason,
} from "~/lib/input-checkers";
import { showNotifications } from "~/lib/mantine-notifications-system";
import type { RouterOutputs } from "~/server/api/root";
import { authClient } from "~/server/better-auth/client";
import { api } from "~/trpc/react";
import {
  BookingStatus,
  BookingTypes,
  BookingValueTypes,
  PaymentMethods,
} from "~/types/types";
import AlertPopup from "../common/alert/alert";
import BookingContents from "../common/bookingContents/booking-contents";
import NameNumberPresetModal from "../common/namePhonePreset/name-number-preset-modal";
import PaymentModal from "../common/payment/payment";
import AddressDropdown from "./booking-form-components/address-drop-down-field";
import PickupTimeInput from "./booking-form-components/pick-up-time-field";

//Enum constants to denote what UI is displayed to the user
const BookingUIStates = {
  Where_To: "Where_to", //pickup time, to/from locations
  About_You: "About_You", //name + reason for trip
  Payment: "Payment", //prompt user for trip type and payment method
  Payment2: "Payment2", //initiate payment screen
  Confirm: "Confirm", //confirm form details and payment screen
  Loading: "Loading", //trip booking process loading, payment successful
  Success: "Success", //booking is successful
  Failed: "Failed", //booking was not successful (but payment was)
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
  const formSubmittingRef = useRef(false);
  const [alertModalOpened, { open: openAlertModal, close: closeAlertModal }] =
    useDisclosure(false);
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
      formSubmittingRef.current = false;
    },
    onError: (error) => {
      showNotifications.error(error.message);
      setFormSubmitting(false);
      formSubmittingRef.current = false;
    },
  });

  const cancelBookingMutation = api.bookings.cancel.useMutation({
    onSuccess: () => {
      showNotifications.success("Cancelled successfully");
      setFormSubmitting(false);
      formSubmittingRef.current = false;
      closeDrawer();
      closeAlertModal();
    },
    onError: (error) => {
      showNotifications.error(error.message);
      setFormSubmitting(false);
      formSubmittingRef.current = false;
    },
  });

  const bookingForm = useForm<{
    pickupTime: string | null;
    pickupAddr: string;
    destAddr: string;
    name: string;
    reasonForTrip: string;
    phoneNumber: string;
  }>({
    mode: "uncontrolled",

    initialValues: {
      pickupTime: null as string | null,
      pickupAddr: "",
      destAddr: "",
      name: "",
      reasonForTrip: "",
      phoneNumber: "",
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
    },
  });

  useEffect(() => {
    if (!drawerContents) {
      return;
    }

    //--Prefill mantine form with booking data--
    bookingForm.setInitialValues({
      pickupTime: dbTimeToLocalTime(drawerContents.pickupTime),
      pickupAddr: drawerContents.pickupAddr,
      destAddr: drawerContents.destAddr,
      name: drawerContents.name,
      reasonForTrip: drawerContents.tripReason,
      phoneNumber: drawerContents.contactPhone,
    });
    bookingForm.setValues({
      pickupTime: dbTimeToLocalTime(drawerContents.pickupTime),
      pickupAddr: drawerContents.pickupAddr,
      destAddr: drawerContents.destAddr,
      name: drawerContents.name,
      reasonForTrip: drawerContents.tripReason,
      phoneNumber: drawerContents.contactPhone,
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
    if (formSubmittingRef.current || !drawerContents) {
      //If form is already submitting
      return;
    }
    setFormSubmitting(true);
    formSubmittingRef.current = true;

    updateBookingMutation.mutate({
      pickupAddr: values.pickupAddr,
      destAddr: values.destAddr,
      name: values.name,
      pickupTime: values.pickupTime as string | null,
      bookingId: drawerContents.id,
      tripReason: values.reasonForTrip,
      contactPhone: values.phoneNumber,
    });
  };

  const handleDelete = (bookingId: number) => {
    if (formSubmittingRef.current) {
      return;
    }
    setFormSubmitting(true);
    formSubmittingRef.current = true;

    cancelBookingMutation.mutate({
      bookingIds: [bookingId],
    });
  };

  if (!drawerContents) {
    return;
  }
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
          drawerContents.status === BookingStatus.PENDING
            ? { body: { paddingBottom: 0 } }
            : undefined
        }
        title={
          drawerContents.status === BookingStatus.PENDING
            ? "Edit Trip"
            : "View Trip"
        }
      >
        <Stack h={"calc(100dvh - 75px)"}>
          {drawerContents.status !== BookingStatus.PENDING && (
            <BookingContents bookingData={drawerContents} readOnly={true} />
          )}
          {drawerContents.status === BookingStatus.PENDING && (
            <>
              <BookingContents
                bookingData={drawerContents}
                form={bookingForm}
                readOnly={false}
              />
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
                            No charges will be made to trips that are cancelled
                            while pending
                          </Text>
                          <Text>This action cannot be undone!</Text>
                        </>,
                      );
                      setOnModalSubmit(
                        () => () => handleDelete(drawerContents.id),
                      );
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
                          () => () =>
                            bookingForm.onSubmit(handleFormOnSubmit)(),
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
            </>
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
  toggleBurger,
}: {
  openLoginModal: () => void;
  toggleBurger: () => void;
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
  const [
    presetModalOpened,
    { open: openPresetModal, close: closePresetModal },
  ] = useDisclosure(false);
  const [drawerContents, setDrawerContents] = useState<
    bookingsData | undefined
  >(undefined);
  const [presetName, setPresetName] = useState<string | undefined>(undefined);
  const [presetPhoneNumber, setPresetPhoneNumber] = useState<
    string | undefined
  >(undefined);
  const [
    paymentModalOpened,
    { open: openPaymentModal, close: closePaymentModal },
  ] = useDisclosure(false);
  const [discountCode, setDiscountCode] = useState<string | null>(null);

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
      setFormState(BookingUIStates.Success);
      setBookedTripId(data.id);
    },
    onError: (error) => {
      showNotifications.error(
        `${error.message}. You have not been charged. Please try again later`,
      );
      setFormState(BookingUIStates.Failed);
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
      bookingType: BookingValueTypes.IN_TOWN,
      paymentMethod: PaymentMethods.CREDIT_CARD,
      code: null as null | string,
      stripePaymentMethodId: null as null | string,
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
        if (formState === BookingUIStates.Confirm && sendReceiptToEmail) {
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
      bookingType: (value, values) => {
        if (
          formState === BookingUIStates.Payment ||
          formState === BookingUIStates.Confirm
        ) {
          const result = checkBookingType(value);

          if (result.isProper) {
            const result2 = checkBookingTypeAndPaymentMethod(
              value,
              values.paymentMethod,
            );

            if (result2.isProper) {
              return null;
            } else {
              return result2.errorMessage;
            }
          } else {
            return result.errorMessage;
          }
        } else {
          return null;
        }
      },
      paymentMethod: (value, values) => {
        if (formState === BookingUIStates.Payment) {
          const result = checkPaymentMethodType(value);

          if (result.isProper) {
            const result2 = checkBookingTypeAndPaymentMethod(
              values.bookingType,
              value,
            );

            if (result2.isProper) {
              return null;
            } else {
              return result2.errorMessage;
            }
          } else {
            return result.errorMessage;
          }
        } else {
          return null;
        }
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
      paymentMethod: values.paymentMethod,
      reminders: values.receiveReminders,
      requestVerification: values.requestVerification,
      contactEmail: sendReceiptToEmail ? values.contactEmail : "",
      contactPhone: values.contactPhone,
      bookingType: values.bookingType,
      redeemCode: values.code,
      paymentMethodId: values.stripePaymentMethodId,
    });
  };

  useEffect(() => {
    bookingForm.setFieldValue("code", discountCode);
  }, [discountCode, bookingForm.setFieldValue]);

  useEffect(() => {
    if (!getUserQuery.isLoading && getUserQuery.data?.[0]) {
      const user = getUserQuery.data[0].user;

      bookingForm.setValues({
        contactEmail: user.email.includes("@no-email-given.pang")
          ? ""
          : user.email,
        contactPhone: user.phoneNumber ?? "ERROR: Phone Number not Found",
        name: user.name.includes("no-name-given.pang") ? "" : user.name,
      });
    }
  }, [getUserQuery.isLoading, getUserQuery.data, bookingForm.setValues]);

  useEffect(() => {
    if (getBookingQuery.data) {
      setDrawerContents(getBookingQuery.data);
    }
  }, [getBookingQuery.data]);

  useEffect(() => {
    if (presetName && presetPhoneNumber) {
      setPresetName(undefined);
      setPresetPhoneNumber(undefined);
      bookingForm.setValues({
        contactPhone: presetPhoneNumber,
        name: presetName,
      });
    }
  }, [presetName, presetPhoneNumber, bookingForm.setValues]);

  if (formState === BookingUIStates.Payment2) {
    openPaymentModal();
    setFormState(BookingUIStates.Confirm);
  }

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
      <NameNumberPresetModal
        closeModal={closePresetModal}
        loadPreset
        modalOpened={presetModalOpened}
        openModal={openPresetModal}
        setName={setPresetName}
        setPhoneNumber={setPresetPhoneNumber}
      />
      <PaymentModal
        asideContent={
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
                <Text>Booking Type</Text>
              </Grid.Col>
              <Grid.Col span={6}>
                <Textarea
                  aria-label="Booking Type"
                  autosize
                  leftSection={<RoadHorizonIcon size={20} />}
                  minRows={1}
                  readOnly
                  value={formatString(bookingForm.getValues().bookingType)}
                />
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
                  value={formatString(bookingForm.getValues().paymentMethod)}
                />
              </Grid.Col>
            </Grid>
            <Grid gutter={0}>
              <Grid.Col span={6}>
                <Text>Receive Reminders? (requires app)</Text>
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
        asideTabIcon={<ClipboardTextIcon size={19} />}
        asideTabName="Details"
        bookingType={bookingForm.getValues().bookingType}
        closeModal={closePaymentModal}
        modalOpened={paymentModalOpened}
        onClose={() => {
          setFormState(BookingUIStates.Payment);
          setPrevFormState(BookingUIStates.Payment2);
          setDiscountCode(null);
        }}
        onPaymentConfirm={() => {
          const { hasErrors } = bookingForm.validate();

          return {
            proceedToPayment: !hasErrors,
          };
        }}
        onPaymentSuccess={() => {
          bookingForm.onSubmit(handleBookingSubmit)();
          setFormState(BookingUIStates.Loading);
          setPrevFormState(BookingUIStates.Payment);
        }}
        paymentMethod={bookingForm.getValues().paymentMethod}
        setDiscountCode={setDiscountCode}
        setStripePaymentMethodId={(value: string) => {
          bookingForm.setFieldValue("stripePaymentMethodId", value);
        }}
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
                  onClick={() => openPresetModal()}
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
          <Stack>
            <Radio.Group
              key={bookingForm.key("bookingType")}
              label="Select a Trip Type"
              {...bookingForm.getInputProps("bookingType")}
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
            <Radio.Group
              key={bookingForm.key("paymentMethod")}
              label="Select a Payment Method"
              {...bookingForm.getInputProps("paymentMethod")}
            >
              <Group mt="xs">
                {Object.values(PaymentMethods).map((method) => (
                  <Radio
                    color="backgroundColor"
                    iconColor="black"
                    key={method}
                    label={formatString(method)}
                    value={method}
                  />
                ))}
              </Group>
            </Radio.Group>
          </Stack>
        }
        changeFormState={setFormState}
        changePrevFormState={setPrevFormState}
        currentFormState={formState}
        form={bookingForm}
        isMobile={isMobile}
        nextButtonText={"Continue"}
        nextUIType={BookingUIStates.Payment2}
        openLoginModal={openLoginModal}
        prevFormState={prevFormState}
        prevUIType={BookingUIStates.About_You}
        showBackButton={true}
        title={"Payment"}
        uiType={BookingUIStates.Payment}
      />

      <Transition
        duration={1000}
        mounted={formState === BookingUIStates.Loading}
        timingFunction="ease"
        transition={
          formState === BookingUIStates.Loading ? "slide-left" : "slide-right"
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
            <Stack align="center" h="100%" justify="center">
              <Title order={4}>Processing Booking Request...</Title>
              <Loader color="black" />
            </Stack>
          </Paper>
        )}
      </Transition>

      <Transition
        duration={1000}
        mounted={formState === BookingUIStates.Failed}
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
              <Title order={4}>Booking Failed</Title>
              <Text>
                We are unable to process your request at this time. You have not
                been charged. Please try again later
              </Text>

              <Button
                c={"black"}
                color="buttonColor"
                onClick={() => window.location.reload()}
                type="button"
              >
                Start from Beginning
              </Button>
            </Stack>
          </Paper>
        )}
      </Transition>

      <Transition
        duration={1000}
        mounted={formState === BookingUIStates.Success}
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
            <Stack gap={"md"}>
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
                  You can still make changes until the trip is accepted by
                  clicking the button below or by visiting your{" "}
                </Text>
                <Anchor href="/booking-history">Trip History</Anchor>
              </Text>

              <Text>
                Download the app to receive in-app notifications and an app-like
                experience
              </Text>
              <Group justify="flex-start">
                <Button
                  c={"black"}
                  fw={"normal"}
                  onClick={() => toggleBurger()}
                  p={0}
                  size="compact-sm"
                  style={{ textDecoration: "underline" }}
                  type="button"
                  variant="transparent"
                >
                  Download the app
                </Button>
              </Group>

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
