import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import { IANA_TIME_ZONE } from "~/types/constants";

//--Add UTC and timezone conversion features for dayjs--
dayjs.extend(utc);
dayjs.extend(timezone);
//------------------------------------------------------

//Takes a string written as "a_b" and converts it into a string "A B"
export const formatString = (text: string) =>
  text
    .split("_")
    .map((value, _) => `${value.at(0)?.toUpperCase()}${value.substring(1)}`)
    .join(" ");

//Takes a Date object from the DB and converts it into a string for mantine's DateTimePicker
export const dbTimeToLocalTime = (date: Date): string =>
  dayjs(date).tz(IANA_TIME_ZONE).format("YYYY-MM-DD HH:mm:ss");

//Takes a Date object from the DB and converts it into a presentable string
export const dbTimeToPrettyString = (date: Date) =>
  dayjs(date).tz(IANA_TIME_ZONE).format("ddd[,] MMM D [at] h:mm A");
