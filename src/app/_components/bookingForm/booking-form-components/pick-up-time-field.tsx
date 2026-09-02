import { DateTimePicker } from "@mantine/dates";
import type { UseFormReturnType } from "@mantine/form";
import { CalendarBlankIcon } from "@phosphor-icons/react";
import dayjs from "dayjs";

export default function PickupTimeInput({
  form,
  formField,
  useLabel,
  withAsterisk,
}: {
  form: UseFormReturnType<any>;
  formField: string;
  useLabel?: boolean;
  withAsterisk?: boolean;
}) {
  return (
    <DateTimePicker
      aria-label="Pick-up Time Selection"
      clearable
      leftSection={<CalendarBlankIcon size={19} />}
      maxDate={dayjs().add(1, "month").toDate()}
      minDate={new Date()}
      placeholder="Pick-up Time"
      presets={[{ value: dayjs().format("YYYY-MM-DD HH:mm:ss"), label: "Now" }]}
      timePickerProps={{
        withDropdown: true,
        format: "12h",
        popoverProps: { withinPortal: false },
      }}
      valueFormat={"ddd[,] MMM D [at] h:mm A"}
      {...form.getInputProps(formField)}
      label={useLabel ? "Pick-up Time" : undefined}
      withAsterisk={withAsterisk}
    />
  );
}
