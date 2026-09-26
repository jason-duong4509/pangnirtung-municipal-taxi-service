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
import { authClient } from "~/server/better-auth/client";
import { UserRoles } from "~/types/types";
import AlertPopup from "../_components/common/alert/alert";
import LoadingScreen from "../_components/common/loadingScreen/loading-screen";

const ItemDrawer = ({
  drawerOpened,
  closeDrawer,
}: {
  drawerOpened: boolean;
  closeDrawer: () => void;
}) => {
  const [
    buyRideNum,
    { increment: increaseRideNum, decrement: decreaseRideNum },
  ] = useCounter(1, { min: 1, max: 50 });
  const [alertModalOpened, { open: openAlertModal, close: closeAlertModal }] =
    useDisclosure(false);

  return (
    <>
      <AlertPopup
        abortButtonText={"Back"}
        body={
          <Text>
            Buying {buyRideNum} Rides for ${10 * buyRideNum}. Are you sure?
          </Text>
        }
        closeModal={closeAlertModal}
        confirmButtonText={"Confirm"}
        isLoading={false}
        modalOpened={alertModalOpened}
        onConfirm={() => console.log("buying rides")}
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
            <Title order={4}>Ride x1</Title>
            <Text>Owned: 5</Text>
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
              <Text>{`$${10 * buyRideNum}`}</Text>
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

const ShopItem = () => {
  const [drawerOpened, { open: openDrawer, close: closeDrawer }] =
    useDisclosure(false);

  return (
    <>
      <ItemDrawer closeDrawer={closeDrawer} drawerOpened={drawerOpened} />
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
          Rides cover trip costs at a discounted price!
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

  useEffect(() => {
    if (!isPending && session?.user.role !== UserRoles.MEMBER) {
      router.replace("/");
    } else if (!isPending && session?.user.role === UserRoles.MEMBER) {
      setShowLoadingUI(false);
    }
  }, [session, router, isPending]);

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
              <ShopItem />
            </Flex>
          </ScrollArea.Autosize>
        </Flex>
      </AppShell.Main>
    </AppShell>
  );
}
