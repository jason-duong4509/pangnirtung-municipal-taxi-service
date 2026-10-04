"use client";
import { Box } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { authClient } from "~/server/better-auth/client";
import { api } from "~/trpc/react";
import { UserRoles } from "~/types/types";
import LoadingScreen from "./_components/common/loadingScreen/loading-screen";
import DesktopLandingPage from "./_components/landingPage/desktop-view/desktop-landing-page";
import MobileLandingPage from "./_components/landingPage/mobile-view/mobile-landing-page";
import LoginModal from "./_components/login/login";

export default function Home() {
  const [loginModalOpened, { open: openLoginModal, close: closeLoginModal }] =
    useDisclosure(false);
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const [showLoadingUI, setShowLoadingUI] = useState(true);
  const [isMember, setIsMember] = useState(false);

  const getAdjustmentRequestedBookingQuery =
    api.bookings.getAdjustmentRequestedBooking.useQuery(undefined, {
      enabled: false,
    });

  useEffect(() => {
    const result = getAdjustmentRequestedBookingQuery.data;
    if (
      !getAdjustmentRequestedBookingQuery.isFetching &&
      result !== undefined
    ) {
      if (result) {
        router.replace(result);
      } else {
        setShowLoadingUI(false);
      }
    }
  }, [
    getAdjustmentRequestedBookingQuery.isFetching,
    getAdjustmentRequestedBookingQuery.data,
    router.replace,
  ]);

  useEffect(() => {
    if (session?.user.role === UserRoles.ADMIN) {
      router.replace("/admin");
    } else if (session?.user.role === UserRoles.DRIVER) {
      router.replace("/driver");
    } else if (session?.user.role === UserRoles.MEMBER) {
      setIsMember(true);
    } else if (!isPending && showLoadingUI) {
      setShowLoadingUI(false);
    }
  }, [session, router, showLoadingUI, isPending]);

  useEffect(() => {
    if (isMember) {
      getAdjustmentRequestedBookingQuery.refetch();
    }
  }, [isMember, getAdjustmentRequestedBookingQuery.refetch]);

  if (showLoadingUI) {
    return <LoadingScreen />;
  }

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
