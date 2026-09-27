"use client";

import {
  Button,
  CloseButton,
  Group,
  Loader,
  Modal,
  Stack,
  Title,
} from "@mantine/core";
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { type Dispatch, type SetStateAction, useState } from "react";
import { showNotifications } from "~/lib/mantine-notifications-system";
import { stripePromise } from "~/lib/stripe";
import { api } from "~/trpc/react";
import TripLoading from "../trips/trip-loading";

const PaymentMethodForm = ({
  clientSecret,
  closeModal,
  openMainModal,
  setFirstLoad,
}: {
  clientSecret: string;
  closeModal: () => void;
  openMainModal: () => void;
  setFirstLoad: Dispatch<SetStateAction<boolean>>;
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event: React.SubmitEvent) => {
    event.preventDefault();

    if (!stripe || !elements || isLoading || !clientSecret) {
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

    const { error: confirmSetupError } = await stripe.confirmSetup({
      //Confirm server's setup intent
      elements,
      clientSecret,
      confirmParams: {},
      redirect: "if_required", //shouldn't redirect after successful payment since everything is done in app
    });
    if (confirmSetupError) {
      showNotifications.error(
        confirmSetupError.message ??
          "An error occurred while adding payment method",
      );
      setIsLoading(false);
      return;
    }

    showNotifications.success("Added successfully");
    setIsLoading(false);
    closeModal();
    openMainModal();
    setFirstLoad(true);
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
          {!isLoading && "Add Card"}
          {isLoading && <Loader color="black" size={20} />}
        </Button>
      </Stack>
    </form>
  );
};

export default function AddPaymentMethodsModal({
  modalOpened,
  closeModal,
  openMainModal,
}: {
  modalOpened: boolean;
  closeModal: () => void;
  openMainModal: () => void;
}) {
  const [clientSecret, setClientSecret] = useState<string | undefined>(
    undefined,
  );
  const [firstLoad, setFirstLoad] = useState(true);

  const createSetupIntentMutation = api.payment.createSetupIntent.useMutation({
    onSuccess: (data) => {
      setClientSecret(data.clientSecret);
    },
    onError: (error) => {
      showNotifications.error(error.message);
    },
  });

  if (modalOpened && firstLoad) {
    setFirstLoad(false);
    createSetupIntentMutation.mutate();
    setClientSecret(undefined);
  }

  return (
    <>
      <Modal
        centered
        onClose={() => {
          closeModal();
          openMainModal();
          setFirstLoad(true);
        }}
        opened={modalOpened}
        radius={"lg"}
        size={"md"}
        withCloseButton={false}
        zIndex={299}
      >
        <Stack gap={"lg"} p={"md"}>
          <header>
            <Group justify="space-between">
              <Title order={4}>Add a Card</Title>
              <CloseButton
                onClick={() => {
                  closeModal();
                  openMainModal();
                  setFirstLoad(true);
                }}
              />
            </Group>
          </header>
          <main>
            {clientSecret && (
              <Elements
                options={{
                  clientSecret: clientSecret,
                }}
                stripe={stripePromise}
              >
                <PaymentMethodForm
                  clientSecret={clientSecret}
                  closeModal={closeModal}
                  openMainModal={openMainModal}
                  setFirstLoad={setFirstLoad}
                />
              </Elements>
            )}
            {!clientSecret && <TripLoading />}
          </main>
        </Stack>
      </Modal>
    </>
  );
}
