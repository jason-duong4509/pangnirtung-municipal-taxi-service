//Takes a string written as "a_b" and converts it into a string "A B"
export const formatString = (text: string) =>
  text
    .split("_")
    .map((value, _) => `${value.at(0)?.toUpperCase()}${value.substring(1)}`)
    .join(" ");

//Takes a Date object made by mantine and converts it into a readable string
export const formatDate = (date: Date | string) =>
  `${new Date(date).toDateString()} at ${new Date(date).toLocaleTimeString()}`;
