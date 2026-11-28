"use client";

import {
  ActionIcon,
  AppShell,
  Badge,
  Button,
  Card,
  Flex,
  Group,
  Modal,
  ScrollArea,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { HouseIcon } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import PangSeal from "~/assets/icons/pang";
import RideTicket from "~/assets/icons/ride-ticket";
import { showNotifications } from "~/lib/mantine-notifications-system";
import type { RouterOutputs } from "~/server/api/root";
import { authClient } from "~/server/better-auth/client";
import { api } from "~/trpc/react";
import { RIDE_CREDIT_COST, UserRoles } from "~/types/types";
import AlertPopup from "../_components/common/alert/alert";
import LoadingScreen from "../_components/common/loadingScreen/loading-screen";
import PaymentModalRideCredit from "../_components/common/payment/buy-rides-payment";

type userData = RouterOutputs["users"]["getSelf"][0];

const ItemModal = ({
  itemModalOpened,
  closeItemModal,
  numberOfRidesOwned,
}: {
  itemModalOpened: boolean;
  closeItemModal: () => void;
  numberOfRidesOwned: number;
}) => {
  const [buyRideNum, setBuyRideNum] = useState<number>(0);
  const [alertModalOpened, { open: openAlertModal, close: closeAlertModal }] =
    useDisclosure(false);
  const [
    paymentModalOpened,
    { open: openPaymentModal, close: closePaymentModal },
  ] = useDisclosure(false);

  return (
    <>
      <PaymentModalRideCredit
        closeModal={closePaymentModal}
        modalOpened={paymentModalOpened}
        numberOfRidesPurchased={buyRideNum}
      />
      <AlertPopup
        abortButtonText={"Back"}
        body={
          <Text>
            Buying {buyRideNum} Rides for ${RIDE_CREDIT_COST * buyRideNum}. Are
            you sure?
          </Text>
        }
        closeModal={closeAlertModal}
        confirmButtonText={"Confirm"}
        isLoading={false}
        modalOpened={alertModalOpened}
        onConfirm={() => {
          openPaymentModal();
          closeAlertModal();
          closeItemModal();
        }}
        titleText={"Confirm Purchase"}
      />
      <Modal
        centered
        onClose={closeItemModal}
        opened={itemModalOpened}
        radius={"lg"}
        size={"sm"}
        withCloseButton={true}
        zIndex={299}
      >
        <Flex
          align="center"
          direction="column"
          gap={"xl"}
          justify="center"
          pb={"xl"}
          wrap="wrap"
        >
          <RideTicket height={"50px"} width={"100px"} />
          <div>
            <Title order={4} ta={"center"}>
              Ride x1
            </Title>
            <Text ta={"center"}>Owned: {numberOfRidesOwned}</Text>
          </div>
          <Stack gap={"xs"} w={"100%"}>
            <Text>Quantity (${RIDE_CREDIT_COST}/Ride)</Text>
            <Group justify="flex-end">
              <Group flex={1} gap={"xs"} grow>
                <ActionIcon
                  color="black"
                  onClick={() => {
                    setBuyRideNum(1);
                    openAlertModal();
                  }}
                  variant="outline"
                >
                  +1 Ride
                </ActionIcon>
                <ActionIcon
                  color="black"
                  onClick={() => {
                    setBuyRideNum(5);
                    openAlertModal();
                  }}
                  variant="outline"
                >
                  +5 Rides
                </ActionIcon>
                <ActionIcon
                  color="black"
                  onClick={() => {
                    setBuyRideNum(10);
                    openAlertModal();
                  }}
                  variant="outline"
                >
                  +10 Rides
                </ActionIcon>
              </Group>
            </Group>
          </Stack>
        </Flex>
      </Modal>
    </>
  );
};

const ShopItem = ({ numberOfRidesOwned }: { numberOfRidesOwned: number }) => {
  const [itemModalOpened, { open: openItemModal, close: closeItemModal }] =
    useDisclosure(false);

  return (
    <>
      <ItemModal
        closeItemModal={closeItemModal}
        itemModalOpened={itemModalOpened}
        numberOfRidesOwned={numberOfRidesOwned}
      />
      <Card h={300} padding="lg" radius="md" shadow="sm" w={250} withBorder>
        <Stack gap={0} h={"100%"}>
          <Card.Section bg={"grey"} flex={1}>
            <Flex align="center" h={"100%"} justify="center">
              <RideTicket height={"50px"} width={"100px"} />
            </Flex>
          </Card.Section>

          <Group justify="space-between" mb="xs" mt="md">
            <Text fw={500}>Ride</Text>
            <Badge color="pink">Residents Only</Badge>
          </Group>

          <Text c="dimmed" size="sm">
            Ride credits cover trip in-town ride costs at a discounted price!
          </Text>

          <Button
            autoContrast
            color="buttonColor"
            fullWidth
            mt="md"
            onClick={openItemModal}
            radius="md"
          >
            Purchase
          </Button>
        </Stack>
      </Card>
    </>
  );
};

export default function BuyRidesPage() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const [showLoadingUI, setShowLoadingUI] = useState(true);
  const [userData, setUserData] = useState<userData>();

  const getUsersQuery = api.users.getSelf.useQuery(undefined, {
    //Forces manual fetching
    enabled: false,
  });

  useEffect(() => {
    if (session && session.user.role === UserRoles.MEMBER) {
      getUsersQuery.refetch();
    } else if (
      (session && session.user.role !== UserRoles.MEMBER) ||
      (!isPending && !session)
    ) {
      router.replace("/");
    }
  }, [session, router, isPending, getUsersQuery.refetch]);

  useEffect(() => {
    if (!getUsersQuery.isFetching && getUsersQuery.error) {
      showNotifications.error(
        getUsersQuery.error.message ??
          "An error occurred while fetching user data",
      );
    } else if (
      !getUsersQuery.isFetching &&
      getUsersQuery.data &&
      getUsersQuery.data[0]
    ) {
      const notAResident = !getUsersQuery.data[0].profile.isResident;
      if (notAResident) {
        router.replace("/");
      } else {
        setShowLoadingUI(false);
        setUserData(getUsersQuery.data[0]);
      }
    }
  }, [
    getUsersQuery.isFetching,
    getUsersQuery.error,
    getUsersQuery.data,
    router,
  ]);

  if (showLoadingUI) {
    return <LoadingScreen />;
  }

  return (
    <AppShell header={{ height: 60 }}>
      <AppShell.Header>
        <Flex
          align="center"
          gap={"md"}
          h={"100%"}
          justify="flex-start"
          p={"md"}
          w={"100%"}
        >
          <ActionIcon
            aria-label="Home button"
            color="black"
            onClick={() => router.push("/")}
            variant="transparent"
          >
            <HouseIcon size={35} />
          </ActionIcon>
          <PangSeal height={"35px"} width={"35px"} />
          <Title order={3}>Buy Rides</Title>
        </Flex>
      </AppShell.Header>
      <AppShell.Main>
        <Flex bg={"backgroundColor"} h={"calc(100dvh - 60px)"} px={"xl"}>
          <ScrollArea.Autosize
            mah={"calc(100dvh - 60px)"}
            type="never"
            w={"100dvw"}
          >
            <Flex
              align="flex-start"
              gap={"xl"}
              justify="flex-start"
              py={"xl"}
              wrap="wrap"
            >
              <ShopItem
                numberOfRidesOwned={userData?.profile.numberOfRides ?? 0}
              />
            </Flex>
          </ScrollArea.Autosize>
        </Flex>
      </AppShell.Main>
    </AppShell>
  );
}
