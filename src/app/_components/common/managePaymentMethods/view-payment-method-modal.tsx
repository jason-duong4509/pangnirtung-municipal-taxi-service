"use client";

import {
  Button,
  Checkbox,
  CloseButton,
  Group,
  Modal,
  ScrollArea,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { type JSX, useEffect, useState } from "react";
import { showNotifications } from "~/lib/mantine-notifications-system";
import { api } from "~/trpc/react";
import AlertPopup from "../alert/alert";
import TripLoading from "../trips/trip-loading";
import AddPaymentMethodsModal from "./add-payment-method-modal";
import checkboxCardStyles from "./MantineCheckboxCardGroup.module.css";

export default function ViewPaymentMethodsModal({
  modalOpened,
  closeModal,
  openModal,
}: {
  modalOpened: boolean;
  closeModal: () => void;
  openModal: () => void;
}) {
  const [
    addPaymentMethodModalOpened,
    { open: openAddPaymentMethodModal, close: closeAddPaymentMethodModal },
  ] = useDisclosure(false);
  const [alertModalOpened, { open: openAlertModal, close: closeAlertModal }] =
    useDisclosure(false);
  const [alertBodyComponent, setAlertBodyComponent] = useState<JSX.Element>(
    <Text />,
  );
  const [isLoading, setIsLoading] = useState(false);
  const [deletedMethodId, setDeletedMethodId] = useState<string | undefined>(
    undefined,
  );

  const getMethodsQuery = api.payment.getPaymentMethods.useQuery(undefined, {
    //Forces manual fetching
    enabled: false,
  });

  const deleteMethodMutation = api.payment.deletePaymentMethod.useMutation({
    onSuccess: () => {
      showNotifications.success("Deleted successfully");
      setIsLoading(false);
      getMethodsQuery.refetch();
      closeAlertModal();
    },
    onError: (error) => {
      showNotifications.error(error.message);
      setIsLoading(false);
    },
  });

  useEffect(() => {
    if (modalOpened) {
      getMethodsQuery.refetch();
    }
  }, [modalOpened, getMethodsQuery.refetch]);

  let paymentMethods = [] as JSX.Element[];
  if (!getMethodsQuery.isLoading && getMethodsQuery.data) {
    for (const card of getMethodsQuery.data) {
      paymentMethods = [
        ...paymentMethods,
        <Group key={`${card.brand}+${card.last4}`}>
          <CloseButton
            aria-label="Delete card"
            onClick={() => {
              setAlertBodyComponent(
                <Stack>
                  <Text>Deleting:</Text>
                  <div>
                    <Text>Card: {`${card.brand}`}</Text>
                    <Text>Ending in: {`${card.last4}`}</Text>
                    <Text>Expires: {`${card.expiry}`}</Text>
                  </div>
                  <Text>Are you sure?</Text>
                </Stack>,
              );
              setDeletedMethodId(card.id);
              openAlertModal();
            }}
          />
          <Checkbox.Card
            className={checkboxCardStyles.root}
            flex={1}
            key={card.id}
            radius="md"
            value={card.id}
          >
            <Group align="flex-start" wrap="nowrap">
              <div>
                <Text
                  className={checkboxCardStyles.label}
                >{`${card.brand} ${card.last4}`}</Text>
                <Text className={checkboxCardStyles.description}>
                  Expiry: {`${card.expiry}`}
                </Text>
              </div>
            </Group>
          </Checkbox.Card>
        </Group>,
      ];
    }
  }

  const deletePaymentMethod = async (value: string | undefined) => {
    if (isLoading || !value) {
      //If form is already submitting
      return;
    }
    setIsLoading(true);
    setDeletedMethodId(undefined);

    deleteMethodMutation.mutate({
      payment_id: value,
    });
  };

  return (
    <>
      <AlertPopup
        abortButtonText={"Cancel"}
        body={alertBodyComponent}
        closeModal={() => {
          closeAlertModal();
          setDeletedMethodId(undefined);
        }}
        confirmButtonText={"Delete"}
        isLoading={isLoading}
        modalOpened={alertModalOpened}
        onConfirm={() => deletePaymentMethod(deletedMethodId)}
        titleText={"Deleting Preset"}
      />
      <AddPaymentMethodsModal
        closeModal={closeAddPaymentMethodModal}
        modalOpened={addPaymentMethodModalOpened}
        openMainModal={openModal}
      />
      <Modal
        centered
        onClose={closeModal}
        opened={modalOpened}
        radius={"lg"}
        size={"md"}
        withCloseButton={false}
        zIndex={299}
      >
        <Stack gap={"lg"} p={"md"}>
          <header>
            <Group justify="space-between">
              <Title order={4}>Edit Payment Methods</Title>
              <CloseButton onClick={closeModal} />
            </Group>
          </header>
          <main>
            <ScrollArea.Autosize mah={"400px"}>
              <Checkbox.Group onChange={() => {}} value={undefined}>
                <Stack gap="xs">
                  {getMethodsQuery.isLoading ? (
                    <TripLoading />
                  ) : paymentMethods.length === 0 ? (
                    "No payment methods found"
                  ) : (
                    paymentMethods
                  )}
                </Stack>
              </Checkbox.Group>
            </ScrollArea.Autosize>
          </main>
          <footer>
            <Group grow>
              <Button
                c={"black"}
                color="buttonColor"
                onClick={() => {
                  closeModal();
                  openAddPaymentMethodModal();
                }}
                p={0}
                size="compact-sm"
                type="submit"
                variant="filled"
              >
                Add a Card
              </Button>
            </Group>
          </footer>
        </Stack>
      </Modal>
    </>
  );
}
