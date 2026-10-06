"use client";

import {
  Box,
  Button,
  CloseButton,
  Flex,
  Group,
  Input,
  Loader,
  Modal,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { useState } from "react";
import { showNotifications } from "~/lib/mantine-notifications-system";
import { stripePromise } from "~/lib/stripe";
import { api } from "~/trpc/react";
import { RIDE_CREDIT_COST } from "~/types/types";
import TripLoading from "../trips/trip-loading";

const CreditCardPayment = ({
  clientSecret,
  numberOfRidesPurchased,
  onPaymentSuccess,
}: {
  clientSecret: string;
  numberOfRidesPurchased: number;
  onPaymentSuccess: () => void;
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event: React.SubmitEvent) => {
    event.preventDefault();
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

    const { error: confirmPaymentError } = await stripe.confirmPayment({
      //Confirm server's payment intent
      elements,
      clientSecret,
      confirmParams: {},
      redirect: "if_required", //shouldn't redirect after successful payment since everything is done in app
    });
    if (confirmPaymentError) {
      showNotifications.error(
        confirmPaymentError.message ??
          "An error occurred while processing payment",
      );
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

        <Group justify="space-between">
          <div>
            <Input.Label>Ride Credits</Input.Label>
            <Input.Description>{`Purchasing ${numberOfRidesPurchased}`}</Input.Description>
          </div>

          <Text>{`$${RIDE_CREDIT_COST * numberOfRidesPurchased}`}</Text>
        </Group>

        <Group justify="space-between">
          <Input.Label>Total</Input.Label>
          <Text>{`$${RIDE_CREDIT_COST * numberOfRidesPurchased}`}</Text>
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
      </Stack>
    </form>
  );
};

export default function PaymentModalRideCredit({
  modalOpened,
  closeModal,
  numberOfRidesPurchased,
}: {
  modalOpened: boolean;
  closeModal: () => void;
  numberOfRidesPurchased: number;
}) {
  const [customerSecret, setCustomerSecret] = useState<string | undefined>(
    undefined,
  );
  const [customerSessionSecret, setCustomerSessionSecret] = useState<
    string | undefined
  >(undefined);
  const [firstLoad, setFirstLoad] = useState(true);

  const createPaymentIntentMutation =
    api.payment.createPaymentIntent.useMutation({
      onSuccess: (data) => {
        setCustomerSecret(data.clientSecret);
        setCustomerSessionSecret(data.clientSessionSecret);
      },
      onError: (error) => {
        showNotifications.error(error.message);
      },
    });

  if (modalOpened && firstLoad) {
    setFirstLoad(false);
    createPaymentIntentMutation.mutate({
      numberOfRides: numberOfRidesPurchased,
    });
  }

  const onCloseCleanup = () => {
    setFirstLoad(true);
    closeModal();
    setCustomerSecret(undefined);
    setCustomerSessionSecret(undefined);
  };

  return (
    <Modal
      centered
      onClose={onCloseCleanup}
      opened={modalOpened}
      radius={"lg"}
      size={"md"}
      withCloseButton={false}
    >
      <Stack gap={"lg"} p={"md"}>
        <Group justify="space-between">
          <Title order={4}>Confirm Payment</Title>
          <CloseButton onClick={onCloseCleanup} />
        </Group>
        {customerSecret && (
          <Elements
            options={{
              clientSecret: customerSecret,
              customerSessionClientSecret: customerSessionSecret,
            }}
            stripe={stripePromise}
          >
            <CreditCardPayment
              clientSecret={customerSecret}
              numberOfRidesPurchased={numberOfRidesPurchased}
              onPaymentSuccess={() => onCloseCleanup()}
            />
          </Elements>
        )}
        {!customerSecret && <TripLoading />}
      </Stack>
    </Modal>
  );
}
