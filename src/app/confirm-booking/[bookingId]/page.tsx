import { Flex } from "@mantine/core";
import ShowRevisedBookingModal from "~/app/_components/confirmBookingComponents/show-revised-booking-modal";

export default async function ConfirmBookingPage({
  params,
}: {
  params: Promise<{ bookingId: string }>;
}) {
  const { bookingId } = await params;

  return (
    <Flex
      align={"center"}
      bg={"backgroundColor"}
      h={"100dvh"}
      justify={"center"}
      w={"100dvw"}
    >
      <ShowRevisedBookingModal bookingIdString={bookingId} />
    </Flex>
  );
}
