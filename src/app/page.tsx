"use client";
import { Box, Button } from "@mantine/core";
import PangSeal from "~/assets/icons/pang";

export default function Home() {
  return (
    <div className="bg-background-color">
      <Button variant="filled" color="orange">hi</Button>
      <Box bg={"buttonColor"}>d</Box>
      <PangSeal width="200px" height="100px"></PangSeal>
    </div>
  );
}
