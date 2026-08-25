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
import type { JSX, MouseEventHandler } from "react";

export default function AlertPopup({
  titleText,
  body,
  abortButtonText,
  confirmButtonText,
  onConfirm,
  modalOpened,
  closeModal,
  isLoading,
}: {
  titleText: string;
  body: JSX.Element;
  abortButtonText: string;
  confirmButtonText: string;
  onConfirm: MouseEventHandler<HTMLButtonElement>;
  modalOpened: boolean;
  closeModal: () => void;
  isLoading: boolean;
}) {
  return (
    <Modal
      centered
      onClose={closeModal}
      opened={modalOpened}
      radius={"lg"}
      size={"sm"}
      withCloseButton={false}
      zIndex={300}
    >
      <Stack gap={"lg"} p={"md"}>
        <Group justify="space-between">
          <Title order={4}>{titleText}</Title>
          <CloseButton onClick={closeModal} />
        </Group>
        {body}
        <Group grow>
          <Button
            c={"black"}
            color="buttonColor"
            onClick={closeModal}
            p={0}
            size="compact-sm"
            type="button"
            variant="outline"
          >
            {abortButtonText}
          </Button>
          <Button
            c={"black"}
            color="buttonColor"
            form="register-form"
            onClick={onConfirm}
            p={0}
            size="compact-sm"
            type="submit"
            variant="filled"
          >
            {!isLoading && confirmButtonText}
            {isLoading && <Loader color="black" size={20} />}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
