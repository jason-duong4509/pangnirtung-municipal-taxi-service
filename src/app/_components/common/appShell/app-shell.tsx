"use client";
import {
  AppShell,
  Burger,
  Flex,
  Group,
  ScrollArea,
  Stack,
  Title,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { ArrowsOutSimpleIcon } from "@phosphor-icons/react";
import type { JSX } from "react";
import PangSeal from "~/assets/icons/pang";
import AsideButton from "./aside-button";

export default function CustomAppShell({
  navbarComponent,
  mainComponent,
  headerText,
  asideComponent,
  expandAside,
  setExpandAside,
}: {
  navbarComponent: JSX.Element;
  mainComponent: JSX.Element;
  headerText: string;
  asideComponent?: JSX.Element;
  expandAside?: boolean;
  setExpandAside?: (_: boolean) => void;
}) {
  const [opened, { toggle }] = useDisclosure();

  return (
    <AppShell
      aside={
        asideComponent && expandAside !== undefined && setExpandAside
          ? {
              width: expandAside ? 200 : 70,
              breakpoint: 0,
              collapsed: { desktop: false, mobile: false },
            }
          : undefined
      }
      header={{ height: 60 }}
      navbar={{
        width: 200,
        breakpoint: "xs",
        collapsed: { mobile: !opened, desktop: !opened },
      }}
    >
      <AppShell.Header>
        <Group h="100%" px="md">
          <Burger onClick={toggle} opened={opened} size="sm" />
          <PangSeal height={"35px"} width={"35px"} />
          <Title order={3}>{headerText}</Title>
        </Group>
      </AppShell.Header>
      <AppShell.Navbar p="md">
        <AppShell.Section component={ScrollArea}>
          {navbarComponent}
        </AppShell.Section>
      </AppShell.Navbar>
      <AppShell.Main>
        <Flex
          align={"center"}
          bg={"backgroundColor"}
          direction={{ base: "column", smMd: "row" }}
          h={"calc(100dvh - 60px)"}
          justify={"center"}
        >
          {mainComponent}
        </Flex>
      </AppShell.Main>
      {asideComponent && expandAside !== undefined && setExpandAside ? (
        <AppShell.Aside p="md">
          <Stack>
            <AsideButton
              buttonIcon={<ArrowsOutSimpleIcon size={20} />}
              buttonText={"Collapse"}
              expandButton={expandAside}
              onClick={() => setExpandAside(!expandAside)}
            />
            {asideComponent}
          </Stack>
        </AppShell.Aside>
      ) : undefined}
    </AppShell>
  );
}
