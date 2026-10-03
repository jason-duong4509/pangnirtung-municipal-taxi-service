"use client";

import {
  Box,
  Button,
  Center,
  CloseButton,
  Divider,
  Flex,
  Group,
  Input,
  Loader,
  Modal,
  ScrollArea,
  SegmentedControl,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useMediaQuery } from "@mantine/hooks";
import { CreditCardIcon } from "@phosphor-icons/react";
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import {
  type Dispatch,
  type JSX,
  type SetStateAction,
  useEffect,
  useState,
} from "react";
import { formatString } from "~/lib/helpers";
import { checkRedeemCode } from "~/lib/input-checkers";
import { showNotifications } from "~/lib/mantine-notifications-system";
import { stripePromise } from "~/lib/stripe";
import { api } from "~/trpc/react";
import {
  BOOKING_COSTS,
  type BookingValueTypes,
  PaymentMethods,
} from "~/types/types";
import TripLoading from "../trips/trip-loading";

const PaymentFooter = ({
  bookingType,
  isLoading,
  paymentMethod,
  numberOfRides,
  setDiscountCode,
}: {
  bookingType: BookingValueTypes;
  isLoading: boolean;
  paymentMethod: PaymentMethods;
  numberOfRides?: number;
  setDiscountCode: Dispatch<SetStateAction<string | null>>;
}) => {
  const [totalCost, setTotalCost] = useState(BOOKING_COSTS[bookingType]);
  const [redeemCodeLoading, setRedeemCodeLoading] = useState(false);

  useEffect(() => {
    setTotalCost(BOOKING_COSTS[bookingType]);
  }, [bookingType]);

  const redeemCodeForm = useForm<{
    code: string;
  }>({
    mode: "uncontrolled",

    initialValues: {
      code: "",
    },

    //Frontend field checks
    validate: {
      code: (value) => {
        const result = checkRedeemCode(value);

        if (result.isProper) {
          return null;
        } else {
          return result.errorMessage;
        }
      },
    },
  });

  const getCodeDiscountMutation = api.payment.getCodeDiscount.useMutation({
    onSuccess: (data) => {
      const discount = data.discount / 100;
      showNotifications.success("Code successfully redeemed");
      setRedeemCodeLoading(false);
      setTotalCost(
        () =>
          BOOKING_COSTS[bookingType] - BOOKING_COSTS[bookingType] * discount,
      );
      setDiscountCode(data.code);
    },
    onError: (error) => {
      setTotalCost(() => BOOKING_COSTS[bookingType]);
      setDiscountCode(null);
      showNotifications.error(
        error.message ?? "An error occurred while validating ride code",
      );
      setRedeemCodeLoading(false);
    },
  });

  const handleSubmit = async () => {
    if (redeemCodeLoading) {
      return;
    }
    setRedeemCodeLoading(true);

    getCodeDiscountMutation.mutate({
      code: redeemCodeForm.getValues().code,
    });
  };

  return (
    <>
      <Group justify="space-between">
        <div>
          <Input.Label>Ride</Input.Label>
          <Input.Description>{`${formatString(bookingType)} ($${BOOKING_COSTS[bookingType]})`}</Input.Description>
        </div>

        <Text>{`$${BOOKING_COSTS[bookingType]}`}</Text>
      </Group>

      {paymentMethod === PaymentMethods.RIDES && (
        <Group justify="space-between">
          <div>
            <Input.Label>Available Ride Credits</Input.Label>
            <Input.Description>Each credit covers 1 ride</Input.Description>
          </div>

          <Text>{numberOfRides}</Text>
        </Group>
      )}

      {paymentMethod !== PaymentMethods.RIDES && (
        <Group>
          <TextInput
            aria-label="Redeem code input"
            flex={1}
            key={redeemCodeForm.key("code")}
            placeholder="Enter Discount Code"
            {...redeemCodeForm.getInputProps("code")}
          />
          <Button
            c={"black"}
            color="buttonColor"
            onClick={() => redeemCodeForm.onSubmit(handleSubmit)()}
            type="button"
            variant="filled"
          >
            {!redeemCodeLoading && "Redeem"}
            {redeemCodeLoading && <Loader color="black" size={20} />}
          </Button>
        </Group>
      )}

      <Group justify="space-between">
        <Input.Label>Total</Input.Label>
        {paymentMethod === PaymentMethods.RIDES && <Text>1 Ride Credit</Text>}
        {paymentMethod !== PaymentMethods.RIDES && <Text>${totalCost}</Text>}
      </Group>

      <Button
        c={"black"}
        color="buttonColor"
        p={0}
        size="compact-sm"
        type="submit"
        variant="filled"
      >
        {!isLoading && "Confirm and Pay"}
        {isLoading && <Loader color="black" size={20} />}
      </Button>
    </>
  );
};

const CreditCardPayment = ({
  clientSecret,
  onPaymentConfirm,
  onPaymentSuccess,
  bookingType,
  isLoading,
  setIsLoading,
  setDiscountCode,
  setStripePaymentMethodId,
}: {
  clientSecret: string;
  onPaymentConfirm?: () => { proceedToPayment: boolean };
  onPaymentSuccess: () => void;
  bookingType: BookingValueTypes;
  isLoading: boolean;
  setIsLoading: Dispatch<SetStateAction<boolean>>;
  setDiscountCode: Dispatch<SetStateAction<string | null>>;
  setStripePaymentMethodId: (v: string) => void;
}) => {
  const stripe = useStripe();
  const elements = useElements();

  const handleSubmit = async (event: React.SubmitEvent) => {
    event.preventDefault();

    if (onPaymentConfirm) {
      const result = onPaymentConfirm();
      if (!result.proceedToPayment) {
        return;
      }
    }

    if (!stripe || !elements || isLoading) {
      //stripe hooks have not finished resolving yet
      return;
    }
    setIsLoading(true);

    const { error } = await elements.submit(); //Check form inputs
    if (error) {
      showNotifications.error(
        error.message ?? "Invalid payment information given",
      );
      setIsLoading(false);
      return;
    }

    const { error: confirmSetupError, setupIntent } = await stripe.confirmSetup(
      {
        //Confirm server's setup intent
        elements,
        clientSecret,
        confirmParams: {},
        redirect: "if_required", //shouldn't redirect after successful payment since everything is done in app
      },
    );
    if (confirmSetupError) {
      showNotifications.error(
        confirmSetupError.message ??
          "An error occurred while processing payment",
      );
      setIsLoading(false);
      return;
    } else if (setupIntent && typeof setupIntent.payment_method === "string") {
      setStripePaymentMethodId(setupIntent.payment_method);
    } else {
      showNotifications.error("Could not obtain stripe payment method ID");
      setIsLoading(false);
      return;
    }

    showNotifications.success("Payment successfully processed");
    onPaymentSuccess();
    setIsLoading(false);
  };

  return (
    <form onSubmit={handleSubmit}>
      <Stack>
        <PaymentElement />
        <PaymentFooter
          bookingType={bookingType}
          isLoading={isLoading}
          paymentMethod={PaymentMethods.CREDIT_CARD}
          setDiscountCode={setDiscountCode}
        />
      </Stack>
    </form>
  );
};

const PaymentForm = ({
  onPaymentSuccess,
  paymentMethod,
  numberOfRides,
  paymentFooter,
}: {
  onPaymentSuccess: () => void;
  paymentMethod: PaymentMethods;
  numberOfRides?: number;
  paymentFooter: JSX.Element;
}) => {
  const handlePaymentSubmit = async (event: React.SubmitEvent) => {
    event.preventDefault();

    if (paymentMethod === PaymentMethods.RIDES && numberOfRides === 0) {
      showNotifications.error("Not enough Ride credits to cover this trip");
      return;
    } else {
      onPaymentSuccess();
    }
  };

  return (
    <form onSubmit={handlePaymentSubmit}>
      <Stack>{paymentFooter}</Stack>
    </form>
  );
};

export default function PaymentModal({
  asideContent,
  modalOpened,
  onClose,
  onPaymentConfirm,
  onPaymentSuccess,
  closeModal,
  asideTabName,
  asideTabIcon,
  bookingType,
  paymentMethod,
  setDiscountCode,
  setStripePaymentMethodId,
}:
  | {
      asideContent?: never;
      modalOpened: boolean;
      onClose?: () => void;
      onPaymentConfirm?: () => { proceedToPayment: boolean };
      onPaymentSuccess: () => void;
      closeModal: () => void;
      asideTabName?: never;
      asideTabIcon?: never;
      bookingType: BookingValueTypes;
      paymentMethod: PaymentMethods;
      setDiscountCode: Dispatch<SetStateAction<string | null>>;
      setStripePaymentMethodId: (v: string) => void;
    }
  | {
      asideContent: JSX.Element;
      modalOpened: boolean;
      onClose?: () => void;
      onPaymentConfirm?: () => { proceedToPayment: boolean };
      onPaymentSuccess: () => void;
      closeModal: () => void;
      asideTabName: string;
      asideTabIcon: JSX.Element;
      bookingType: BookingValueTypes;
      paymentMethod: PaymentMethods;
      setDiscountCode: Dispatch<SetStateAction<string | null>>;
      setStripePaymentMethodId: (v: string) => void;
    }) {
  const [customerSecret, setCustomerSecret] = useState<string | undefined>(
    undefined,
  );
  const [customerSessionSecret, setCustomerSessionSecret] = useState<
    string | undefined
  >(undefined);
  const [firstLoad, setFirstLoad] = useState(true);
  const isMobile = useMediaQuery("(max-width: 800px)");
  const [tabView, setTabView] = useState("payment");
  const [isLoading, setIsLoading] = useState(false);
  const [rideCount, setRideCount] = useState(0);

  const getRideCount = api.profile.getNumberOfRides.useQuery(undefined, {
    //Forces manual fetching
    enabled: false,
  });

  useEffect(() => {
    if (modalOpened && paymentMethod === PaymentMethods.RIDES) {
      getRideCount.refetch();
    }
  }, [modalOpened, paymentMethod, getRideCount.refetch]);

  useEffect(() => {
    if (!getRideCount.isFetching && getRideCount.error) {
      showNotifications.error(
        getRideCount.error.message ??
          "An error occurred while fetching ride count",
      );
    } else if (!getRideCount.isFetching && getRideCount.data) {
      setRideCount(getRideCount.data.numberOfRides);
    }
  }, [getRideCount.error, getRideCount.isFetching, getRideCount.data]);

  const createSetupIntentMutation = api.payment.createSetupIntent.useMutation({
    onSuccess: (data) => {
      setCustomerSecret(data.clientSecret);
      setCustomerSessionSecret(data.clientSessionSecret);
    },
    onError: (error) => {
      showNotifications.error(error.message);
    },
  });

  if (
    modalOpened &&
    firstLoad &&
    paymentMethod === PaymentMethods.CREDIT_CARD
  ) {
    setFirstLoad(false);
    createSetupIntentMutation.mutate();
  }

  const onCloseCleanup = () => {
    if (onClose) {
      onClose();
    }
    setFirstLoad(true);
    closeModal();
  };

  return (
    <Modal
      centered
      onClose={onCloseCleanup}
      opened={modalOpened}
      radius={"lg"}
      size={"100%"}
      withCloseButton={false}
    >
      <Stack gap={"lg"} p={"md"}>
        <Group justify="space-between">
          <Title order={4}>Confirm Payment</Title>
          <CloseButton onClick={onCloseCleanup} />
        </Group>
        {isMobile && asideContent && (
          <SegmentedControl
            data={[
              {
                value: "aside_tab",
                label: (
                  <Center style={{ gap: 10 }}>
                    {asideTabIcon}
                    {asideTabName}
                  </Center>
                ),
              },
              {
                value: "payment",
                label: (
                  <Center style={{ gap: 10 }}>
                    <CreditCardIcon size={19} />
                    <Text>Payment</Text>
                  </Center>
                ),
              },
            ]}
            onChange={setTabView}
            value={tabView}
          />
        )}
        <Flex
          align="flex-start"
          direction="row"
          gap={"md"}
          justify="flex-start"
        >
          {asideContent && (
            <>
              {((isMobile && tabView === "aside_tab") || !isMobile) && (
                <ScrollArea.Autosize flex={1} mah={"70dvh"}>
                  <Stack>{asideContent}</Stack>
                </ScrollArea.Autosize>
              )}
              {!isMobile && <Divider orientation="vertical" size="xl" />}
            </>
          )}
          {((isMobile && tabView === "payment") || !isMobile) && (
            <Box flex={1}>
              {customerSecret &&
                paymentMethod === PaymentMethods.CREDIT_CARD && (
                  <Elements
                    options={{
                      clientSecret: customerSecret,
                      customerSessionClientSecret: customerSessionSecret,
                    }}
                    stripe={stripePromise}
                  >
                    <CreditCardPayment
                      bookingType={bookingType}
                      clientSecret={customerSecret}
                      isLoading={isLoading}
                      onPaymentConfirm={onPaymentConfirm}
                      onPaymentSuccess={() => {
                        onPaymentSuccess();
                        closeModal();
                        setFirstLoad(true);
                      }}
                      setDiscountCode={setDiscountCode}
                      setIsLoading={setIsLoading}
                      setStripePaymentMethodId={setStripePaymentMethodId}
                    />
                  </Elements>
                )}
              {!customerSecret &&
                paymentMethod === PaymentMethods.CREDIT_CARD && <TripLoading />}
              {paymentMethod !== PaymentMethods.CREDIT_CARD && (
                <PaymentForm
                  numberOfRides={rideCount}
                  onPaymentSuccess={() => {
                    onPaymentSuccess();
                    closeModal();
                    setFirstLoad(true);
                  }}
                  paymentFooter={
                    <PaymentFooter
                      bookingType={bookingType}
                      isLoading={isLoading}
                      numberOfRides={rideCount}
                      paymentMethod={paymentMethod}
                      setDiscountCode={setDiscountCode}
                    />
                  }
                  paymentMethod={paymentMethod}
                />
              )}
            </Box>
          )}
        </Flex>
      </Stack>
    </Modal>
  );
}
