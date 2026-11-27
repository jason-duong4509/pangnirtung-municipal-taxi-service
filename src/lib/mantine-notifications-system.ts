import { notifications } from "@mantine/notifications";

export const showNotifications = {
  success: (message: string) =>
    notifications.show({
      message: message,
      color: "green",
    }),
  error: (message: string) =>
    notifications.show({
      message: message,
      color: "red",
    }),
  warning: (message: string) =>
    notifications.show({
      message: message,
      color: "yellow",
    }),
};
