"use client";

import {
  Box,
  Button,
  Center,
  CloseButton,
  Divider,
  Flex,
  Group,
  Loader,
  Modal,
  ScrollArea,
  SegmentedControl,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { CreditCardIcon } from "@phosphor-icons/react";
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { type JSX, useState } from "react";
import { showNotifications } from "~/lib/mantine-notifications-system";
import { stripePromise } from "~/lib/stripe";
import { api } from "~/trpc/react";
import TripLoading from "../trips/trip-loading";

const PaymentForm = ({
  clientSecret,
  onPaymentConfirm,
  onPaymentSuccess,
}: {
  clientSecret: string;
  onPaymentConfirm?: () => { proceedToPayment: boolean };
  onPaymentSuccess: () => void;
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isLoading, setIsLoading] = useState(false);

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

    showNotifications.success("Payment successful");
    onPaymentSuccess();
    setIsLoading(false);
  };

  return (
    <form onSubmit={handleSubmit}>
      <Stack>
        <PaymentElement />

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

export default function PaymentModal({
  asideContent,
  modalOpened,
  onClose,
  onPaymentConfirm,
  onPaymentSuccess,
  closeModal,
  asideTabName,
  asideTabIcon,
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
      pack: "100", //todo: change this to be an actual valid price
    });
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
              {customerSecret && (
                <Elements
                  options={{
                    clientSecret: customerSecret,
                    customerSessionClientSecret: customerSessionSecret,
                  }}
                  stripe={stripePromise}
                >
                  <PaymentForm
                    clientSecret={customerSecret}
                    onPaymentConfirm={onPaymentConfirm}
                    onPaymentSuccess={() => {
                      onPaymentSuccess();
                      closeModal();
                      setFirstLoad(true);
                    }}
                  />
                </Elements>
              )}
              {!customerSecret && <TripLoading />}
            </Box>
          )}
        </Flex>
      </Stack>
    </Modal>
  );
}
