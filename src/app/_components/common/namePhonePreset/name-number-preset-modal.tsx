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
import { useDisclosure, useMediaQuery } from "@mantine/hooks";
import {
  type Dispatch,
  type JSX,
  type SetStateAction,
  useEffect,
  useState,
} from "react";
import { showNotifications } from "~/lib/mantine-notifications-system";
import { api } from "~/trpc/react";
import AlertPopup from "../alert/alert";
import TripLoading from "../trips/trip-loading";
import AddNameNumberPresetModal from "./add-name-number-preset-modal";
import checkboxCardStyles from "./MantineCheckboxCardGroup.module.css";

export default function NameNumberPresetModal({
  modalOpened,
  closeModal,
  openModal,
  setPhoneNumber,
  setName,
  loadPreset,
}:
  | {
      modalOpened: boolean;
      closeModal: () => void;
      openModal: () => void;
      setPhoneNumber: Dispatch<SetStateAction<string | undefined>>;
      setName: Dispatch<SetStateAction<string | undefined>>;
      loadPreset: true;
    }
  | {
      modalOpened: boolean;
      closeModal: () => void;
      openModal: () => void;
      setPhoneNumber: never;
      setName: never;
      loadPreset: false;
    }) {
  const [value, setValue] = useState<string[]>([]);
  const isMobile = useMediaQuery("(max-width: 470px)");
  const [isEditing, setIsEditing] = useState(false);
  const [
    addPresetModalOpened,
    { open: openAddPresetModal, close: closeAddPresetModal },
  ] = useDisclosure(false);
  const [alertModalOpened, { open: openAlertModal, close: closeAlertModal }] =
    useDisclosure(false);
  const [alertBodyComponent, setAlertBodyComponent] = useState<JSX.Element>(
    <Text />,
  );
  const [alertBodyOnSubmit, setAlertBodyonSubmit] = useState<() => void>(
    () => {},
  );
  const [isLoading, setIsLoading] = useState(false);

  const getPresetsQuery = api.profile.getNameNumberPresets.useQuery(undefined, {
    //Forces manual fetching
    enabled: false,
  });

  const deletePresetMutation = api.profile.deletePreset.useMutation({
    onSuccess: () => {
      showNotifications.success("Deleted successfully");
      setIsLoading(false);
      getPresetsQuery.refetch();
      closeAlertModal();
    },
    onError: (error) => {
      showNotifications.error(error.message);
      setIsLoading(false);
    },
  });

  useEffect(() => {
    if (modalOpened) {
      getPresetsQuery.refetch();
    }
  }, [modalOpened, getPresetsQuery.refetch]);

  useEffect(() => {
    if (!loadPreset) {
      setIsEditing(true);
    }
  }, [loadPreset]);

  let presets = [] as JSX.Element[];
  if (!getPresetsQuery.isLoading && getPresetsQuery.data) {
    for (const preset of getPresetsQuery.data) {
      presets = [
        ...presets,
        <Group key={`${preset.name}+${preset.phoneNumber}`}>
          {isEditing && (
            <CloseButton
              aria-label="Delete preset"
              onClick={() => {
                setAlertBodyComponent(
                  <Stack>
                    <Text>Deleting:</Text>
                    <div>
                      <Text>Name: {preset.name}</Text>
                      <Text>Number: {preset.phoneNumber}</Text>
                    </div>
                    <Text>Are you sure?</Text>
                  </Stack>,
                );
                setAlertBodyonSubmit(
                  () => () =>
                    deletePreset(`${preset.name}+${preset.phoneNumber}`),
                );
                openAlertModal();
              }}
            />
          )}
          <Checkbox.Card
            className={checkboxCardStyles.root}
            flex={1}
            key={`${preset.name}+${preset.phoneNumber}`}
            radius="md"
            value={`${preset.name}+${preset.phoneNumber}`}
          >
            <Group align="flex-start" wrap="nowrap">
              {!isEditing && <Checkbox.Indicator color="black" />}
              <div>
                <Text className={checkboxCardStyles.label}>{preset.name}</Text>
                <Text className={checkboxCardStyles.description}>
                  {preset.phoneNumber}
                </Text>
              </div>
            </Group>
          </Checkbox.Card>
        </Group>,
      ];
    }
  }

  const deletePreset = async (value: string) => {
    if (isLoading) {
      //If form is already submitting
      return;
    }
    setIsLoading(true);

    const [name, phoneNumber] = value.split("+");

    if (name && phoneNumber) {
      deletePresetMutation.mutate({
        name: name,
        phoneNumber: phoneNumber,
      });
    }
  };

  return (
    <>
      <AlertPopup
        abortButtonText={"Cancel"}
        body={alertBodyComponent}
        closeModal={closeAlertModal}
        confirmButtonText={"Delete"}
        isLoading={isLoading}
        modalOpened={alertModalOpened}
        onConfirm={alertBodyOnSubmit}
        titleText={"Deleting Preset"}
      />
      <AddNameNumberPresetModal
        closeModal={closeAddPresetModal}
        modalOpened={addPresetModalOpened}
        openMainModal={openModal}
      />
      <Modal
        centered
        onClose={() => {
          closeModal();
          setIsEditing(false);
        }}
        opened={modalOpened}
        radius={"lg"}
        size={"md"}
        withCloseButton={false}
      >
        <Stack gap={"lg"} p={"md"}>
          <header>
            <Group justify="space-between">
              <Title order={4}>
                {loadPreset ? "Load " : "View "}
                {!isMobile ? "Name + Phone Number " : ""}Preset
              </Title>
              <CloseButton onClick={closeModal} />
            </Group>
            <Group justify="space-between">
              <Text>Presets</Text>
              <Button
                c={"black"}
                fw={"normal"}
                onClick={() => {
                  setIsEditing(!isEditing);
                  setValue([]);
                }}
                p={0}
                size="compact-sm"
                style={{ textDecoration: "underline" }}
                type="button"
                variant="transparent"
              >
                {!isEditing && "Edit Presets"}
                {isEditing && "Finish"}
              </Button>
            </Group>
          </header>
          <main>
            <ScrollArea.Autosize mah={"400px"}>
              <Checkbox.Group
                onChange={(valueList) => {
                  if (!isEditing) {
                    setValue([valueList[valueList.length - 1] ?? ""]);
                  }
                }}
                value={value}
              >
                <Stack gap="xs">
                  {getPresetsQuery.isLoading ? (
                    <TripLoading />
                  ) : presets.length === 0 ? (
                    "No presets found"
                  ) : (
                    presets
                  )}
                </Stack>
              </Checkbox.Group>
            </ScrollArea.Autosize>
          </main>
          {loadPreset && !isEditing && (
            <footer>
              <Group grow>
                <Button
                  c={
                    value.length === 0 ||
                    (value.length === 1 && value[0] === "")
                      ? undefined
                      : "black"
                  }
                  color="buttonColor"
                  disabled={
                    value.length === 0 ||
                    (value.length === 1 && value[0] === "")
                  }
                  onClick={() => {
                    if (value[0]) {
                      const [name, phoneNumber] = value[0].split("+");
                      if (name && phoneNumber) {
                        setName(name);
                        setPhoneNumber(phoneNumber);
                        closeModal();
                        setIsEditing(false);
                      }
                    }
                  }}
                  p={0}
                  size="compact-sm"
                  type="submit"
                  variant="filled"
                >
                  Load
                </Button>
              </Group>
            </footer>
          )}
          {isEditing && (
            <footer>
              <Group grow>
                <Button
                  c={"black"}
                  color="buttonColor"
                  onClick={() => {
                    closeModal();
                    openAddPresetModal();
                  }}
                  p={0}
                  size="compact-sm"
                  type="submit"
                  variant="filled"
                >
                  Add a Preset
                </Button>
              </Group>
            </footer>
          )}
        </Stack>
      </Modal>
    </>
  );
}
