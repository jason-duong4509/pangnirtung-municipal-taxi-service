"use client";
import {
  Button,
  Checkbox,
  Flex,
  Group,
  PasswordInput,
  ScrollArea,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useRouter } from "next/navigation";
import { useState } from "react";
import PangSeal from "~/assets/icons/pang";

export default function ResetAccountPage() {
  const [showSuccessUI, changeShowSuccess] = useState(false);
  const router = useRouter();

  //Form used to track what account data the user wants to change
  const form = useForm<{
    accountFields: ("username" | "password")[];
    newUsername: string;
    newPassword: string;
  }>({
    mode: "controlled",

    //Initial field values of form
    initialValues: {
      accountFields: [],
      newUsername: "",
      newPassword: "",
    },

    //Frontend field checks
    validate: {
      accountFields: (value) => {
        if (value.length === 0) {
          //User selected nothing
          return "At least one field must be selected";
        }
        return null;
      },
      newUsername: (newUsername, formValues) => {
        if (formValues.accountFields.includes("username")) {
          //selected username to change
          if (newUsername.length === 0) {
            //Blank field
            return "Field cannot be blank";
          }
          //More checks will be added later (ex. regex)
        }
        return null;
      },
      newPassword: (newPassword, formValues) => {
        if (formValues.accountFields.includes("password")) {
          //selected password to change
          if (newPassword.length === 0) {
            //Blank field
            return "Field cannot be blank";
          }
          //More checks will be added later (ex. regex)
        }
        return null;
      },
    },
  });

  const handleOnSubmit = async (values: typeof form.values) => {
    console.log(values);
    changeShowSuccess(true);
  };

  return (
    <Flex
      align={"center"}
      bg={"backgroundColor"}
      h={"100dvh"}
      justify={"center"}
    >
      <ScrollArea.Autosize
        bg={"primaryColor"}
        mah={"70vh"}
        maw={"80vw"}
        p={"32px"}
        style={{
          boxShadow: "0 12px 32px rgba(0, 0, 0, 0.08)",
          borderRadius: "16px",
        }}
      >
        <form
          onSubmit={showSuccessUI ? () => {} : form.onSubmit(handleOnSubmit)}
        >
          <Stack>
            <Group wrap="nowrap">
              <PangSeal
                height={"clamp(2.2rem, 3vh, 3rem)"}
                width={"clamp(2.2rem, 3vh, 3rem)"}
              />
              <Title order={4}>Municipal Taxi Service</Title>
            </Group>
            <Title order={5}>
              {showSuccessUI ? "Success" : "Reset Account Information"}
            </Title>
            {!showSuccessUI && (
              <>
                <Checkbox.Group
                  error={form.errors.accountFields ?? ""}
                  onChange={(selectedOptions) =>
                    form.setFieldValue(
                      "accountFields",
                      selectedOptions as ("username" | "password")[],
                    )
                  }
                >
                  <Stack pb={"md"}>
                    <Checkbox
                      color="buttonColor"
                      label="Reset Username"
                      value={"username"}
                    />
                    {form.getValues().accountFields.includes("username") && (
                      <TextInput
                        error={form.errors.newUsername ?? ""}
                        onChange={(event) =>
                          form.setFieldValue(
                            "newUsername",
                            event.currentTarget.value,
                          )
                        }
                        placeholder="New Username"
                        value={form.getValues().newUsername}
                        withAsterisk
                      />
                    )}
                    <Checkbox
                      color="buttonColor"
                      label="Reset Password"
                      value={"password"}
                    />
                    {form.getValues().accountFields.includes("password") && (
                      <PasswordInput
                        error={form.errors.newPassword ?? ""}
                        onChange={(event) =>
                          form.setFieldValue(
                            "newPassword",
                            event.currentTarget.value,
                          )
                        }
                        placeholder="New Password"
                        value={form.getValues().newPassword}
                        withAsterisk
                      />
                    )}
                  </Stack>
                </Checkbox.Group>
                <Button c={"black"} color="buttonColor" type="submit">
                  Confirm
                </Button>
              </>
            )}
            {showSuccessUI && (
              <>
                <Text>
                  You can now log in with your new account credentials
                </Text>
                <Button
                  c={"black"}
                  color="buttonColor"
                  onClick={() => router.push("/")}
                  type="button"
                >
                  Log in
                </Button>
              </>
            )}
          </Stack>
        </form>
      </ScrollArea.Autosize>
    </Flex>
  );
}
