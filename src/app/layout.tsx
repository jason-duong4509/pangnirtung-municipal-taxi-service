import "~/styles/globals.css";
import {
  ColorSchemeScript,
  createTheme,
  MantineProvider,
  mantineHtmlProps,
} from "@mantine/core"; // Wrap project in mantine as part of mantine setup process
import "@mantine/core/styles.css"; //Import mandatory mantine default styles
import "@mantine/dates/styles.css"; //Import mandatory mantine styles for its dates library
import "@mantine/notifications/styles.css"; //Mandatory import for notification styles

import { Notifications } from "@mantine/notifications";
import type { Metadata } from "next";
import { Geist } from "next/font/google";

import { TRPCReactProvider } from "~/trpc/react";

export const metadata: Metadata = {
  title: "Pangnirtung Taxi App",
  description:
    "Municipal taxi app for the Inuit hamlet Pangnirtung in Nunavut.",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

const mantineTheme = createTheme({
  colors: {
    //Mantine theme declarations, requires 10 shades and does not allow 1
    primaryColor: [
      "#FFFFFF",
      "#FFFFFF",
      "#FFFFFF",
      "#FFFFFF",
      "#FFFFFF",
      "#FFFFFF",
      "#FFFFFF",
      "#FFFFFF",
      "#FFFFFF",
      "#FFFFFF",
    ],
    buttonColor: [
      "#D9D9D9",
      "#D9D9D9",
      "#D9D9D9",
      "#f5f5f5",
      "#eae9e9",
      "#e4e4e4",
      "#D9D9D9",
      "#c8c8c8",
      "#b1b1b1",
      "#a1a1a1",
    ],
    backgroundColor: [
      "#DDDDDD",
      "#DDDDDD",
      "#DDDDDD",
      "#DDDDDD",
      "#DDDDDD",
      "#DDDDDD",
      "#DDDDDD",
      "#DDDDDD",
      "#DDDDDD",
      "#DDDDDD",
    ],
    customWhite: [
      "#ffffff",
      "#ffffff",
      "#ffffff",
      "#ffffff",
      "#ffffff",
      "#ffffff",
      "#ffffff", //when used on buttons, chooses this color by default
      "#e7e7e7", //shades after
      "#cdcdcd",
      "#b2b2b2",
    ],
  },

  breakpoints: {
    smMd: "51em",
  },
});

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html className={`${geist.variable}`} lang="en" {...mantineHtmlProps}>
      <head>
        <ColorSchemeScript />
      </head>

      <body>
        <MantineProvider theme={mantineTheme}>
          <Notifications />
          <TRPCReactProvider>{children}</TRPCReactProvider>
        </MantineProvider>
      </body>
    </html>
  );
}
