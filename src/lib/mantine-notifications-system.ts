import { notifications } from "@mantine/notifications";

export const showNotifications = {
  success: (message: string) =>
    notifications.show({
      title: "Success",
      message: message,
      color: "green",
    }),
  error: (message: string) =>
    notifications.show({
      title: "Server Error",
      message: message,
      color: "red",
    }),
  warning: (message: string) =>
    notifications.show({
      title: "Warning",
      message: message,
      color: "yellow",
    }),
};
