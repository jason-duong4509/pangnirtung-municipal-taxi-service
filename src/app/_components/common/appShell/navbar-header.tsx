"use client";
import { Title } from "@mantine/core";

export default function NavbarHeader({ text }: { text: string }) {
  return (
    <Title
      order={5}
      style={{
        borderBottom: "2px solid black",
      }}
    >
      {text}
    </Title>
  );
}
