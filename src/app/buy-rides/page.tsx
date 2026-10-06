"use client";

import {
  ActionIcon,
  AppShell,
  Badge,
  Button,
  Card,
  Drawer,
  Flex,
  Grid,
  Group,
  ScrollArea,
  Text,
  Title,
} from "@mantine/core";
import { useCounter, useDisclosure } from "@mantine/hooks";
import { HouseIcon, MinusIcon, PlusIcon } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import PangSeal from "~/assets/icons/pang";
import RideTicket from "~/assets/icons/ride-ticket";
import { showNotifications } from "~/lib/mantine-notifications-system";
import type { RouterOutputs } from "~/server/api/root";
import { authClient } from "~/server/better-auth/client";
import { api } from "~/trpc/react";
import {
  MAX_NUMBER_OF_RIDES_BOUGHT_PER_PURCHASE,
  RIDE_CREDIT_COST,
  UserRoles,
} from "~/types/types";
import AlertPopup from "../_components/common/alert/alert";
import LoadingScreen from "../_components/common/loadingScreen/loading-screen";
import PaymentModalRideCredit from "../_components/common/payment/buy-rides-payment";

type userData = RouterOutputs["users"]["getSelf"][0];

const ItemDrawer = ({
  drawerOpened,
  closeDrawer,
  numberOfRidesOwned,
}: {
  drawerOpened: boolean;
  closeDrawer: () => void;
  numberOfRidesOwned: number;
}) => {
  const [
    buyRideNum,
    { increment: increaseRideNum, decrement: decreaseRideNum },
  ] = useCounter(1, { min: 1, max: MAX_NUMBER_OF_RIDES_BOUGHT_PER_PURCHASE });
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
          <>
            <Text>
              Buying {buyRideNum} Rides for ${RIDE_CREDIT_COST * buyRideNum}.
              Are you sure?
            </Text>
            <Text>This cannot be refunded!</Text>
          </>
        }
        closeModal={closeAlertModal}
        confirmButtonText={"Confirm"}
        isLoading={false}
        modalOpened={alertModalOpened}
        onConfirm={() => {
          openPaymentModal();
          closeAlertModal();
          closeDrawer();
        }}
        titleText={"Confirm Purchase"}
      />
      <Drawer
        offset={8}
        onClose={closeDrawer}
        opened={drawerOpened}
        position="right"
        radius="md"
        size={"xs"}
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
            <Text c={"red"} ta={"center"}>
              Rides cannot be refunded after purchased
            </Text>
          </div>
          <ActionIcon.Group>
            <ActionIcon
              onClick={decreaseRideNum}
              radius="md"
              size="lg"
              variant="default"
            >
              <MinusIcon size={20} />
            </ActionIcon>
            <ActionIcon.GroupSection
              bg="var(--mantine-color-body)"
              miw={60}
              size="lg"
              variant="default"
            >
              {buyRideNum}
            </ActionIcon.GroupSection>
            <ActionIcon
              onClick={increaseRideNum}
              radius="md"
              size="lg"
              variant="default"
            >
              <PlusIcon size={20} />
            </ActionIcon>
          </ActionIcon.Group>
          <Grid>
            <Grid.Col span={6}>
              <Text>{`$${RIDE_CREDIT_COST * buyRideNum}`}</Text>
            </Grid.Col>
            <Grid.Col span={6}>
              <Button
                autoContrast
                color="buttonColor"
                onClick={() => openAlertModal()}
                px={"xl"}
                radius="md"
              >
                Purchase
              </Button>
            </Grid.Col>
          </Grid>
        </Flex>
      </Drawer>
    </>
  );
};

const ShopItem = ({ numberOfRidesOwned }: { numberOfRidesOwned: number }) => {
  const [drawerOpened, { open: openDrawer, close: closeDrawer }] =
    useDisclosure(false);

  return (
    <>
      <ItemDrawer
        closeDrawer={closeDrawer}
        drawerOpened={drawerOpened}
        numberOfRidesOwned={numberOfRidesOwned}
      />
      <Card h={300} padding="lg" radius="md" shadow="sm" w={250} withBorder>
        <Card.Section bg={"grey"} h={200}>
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
          onClick={openDrawer}
          radius="md"
        >
          Purchase
        </Button>
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
