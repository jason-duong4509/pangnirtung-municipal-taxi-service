"use client";
import { Box } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import DesktopLandingPage from "./_components/landingPage/desktop-view/desktop-landing-page";
import MobileLandingPage from "./_components/landingPage/mobile-view/mobile-landing-page";
import LoginModal from "./_components/login/login";

export default function Home() {
  const [loginModalOpened, { open: openLoginModal, close: closeLoginModal }] =
    useDisclosure(false);
  return (
    <>
      <LoginModal
        closeLoginModal={closeLoginModal}
        loginModalOpened={loginModalOpened}
      />
      <Box hiddenFrom="smMd">
        <MobileLandingPage openLoginModal={openLoginModal} />
      </Box>
      <Box visibleFrom="smMd">
        <DesktopLandingPage openLoginModal={openLoginModal} />
      </Box>
    </>
  );
}
