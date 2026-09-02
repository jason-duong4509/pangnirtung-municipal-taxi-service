import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import { parsePhoneNumberWithError } from "libphonenumber-js";
import {
  addressRegex,
  emailRegex,
  IANA_TIME_ZONE,
  nameRegex,
  otpRegex,
  pickupTimeRegex,
  usernameRegex,
} from "~/types/constants";

//--Add UTC and timezone conversion features for dayjs--
dayjs.extend(utc);
dayjs.extend(timezone);
//------------------------------------------------------

export const checkName = (
  input: string,
):
  | { isProper: false; errorMessage: string }
  | { isProper: true; formattedInput: string } => {
  if (input.length === 0) {
    return {
      isProper: false,
      errorMessage: "Name cannot be blank",
    };
  }

  const trimmedInput = input.trim();
  const splitNames = trimmedInput.split(" ");
  if (splitNames.length > 3) {
    return {
      isProper: false,
      errorMessage: "Name cannot have more than 2 spaces",
    };
  }

  if (trimmedInput.length > 30) {
    return {
      isProper: false,
      errorMessage: "Name too long (max 30 characters)",
    };
  }

  if (splitNames.map((name) => nameRegex.test(name)).includes(false)) {
    return {
      isProper: false,
      errorMessage: "Only alphabetical names are accepted",
    };
  }

  return {
    isProper: true,
    formattedInput: trimmedInput,
  };
};

export const checkUsername = (
  input: string,
):
  | { isProper: false; errorMessage: string }
  | { isProper: true; formattedInput: string } => {
  if (input.length === 0) {
    return {
      isProper: false,
      errorMessage: "Username cannot be blank",
    };
  }

  if (input.length < 6) {
    return {
      isProper: false,
      errorMessage: "Username too short (min. 6 characters)",
    };
  }

  if (input.length > 20) {
    return {
      isProper: false,
      errorMessage: "Username too long (max. 20 characters)",
    };
  }

  if (!usernameRegex.test(input)) {
    return {
      isProper: false,
      errorMessage: "Username can only be alphanumeric",
    };
  }

  return {
    isProper: true,
    formattedInput: input,
  };
};

export const checkPassword = (
  input: string,
):
  | { isProper: false; errorMessage: string }
  | { isProper: true; formattedInput: string } => {
  if (input.length === 0) {
    return {
      isProper: false,
      errorMessage: "Password cannot be blank",
    };
  }

  if (input.length < 9) {
    return {
      isProper: false,
      errorMessage: "Password too short (min. 9 characters)",
    };
  }

  return {
    isProper: true,
    formattedInput: input,
  };
};

export const checkEmail = (
  input: string,
):
  | { isProper: false; errorMessage: string }
  | { isProper: true; formattedInput: string } => {
  if (!emailRegex.test(input)) {
    return {
      isProper: false,
      errorMessage: "Invalid email",
    };
  }

  return {
    isProper: true,
    formattedInput: input,
  };
};

export const checkPhoneNumber = (
  input: string,
):
  | { isProper: false; errorMessage: string }
  | { isProper: true; formattedInput: string } => {
  try {
    const phoneNumber = parsePhoneNumberWithError(input, "CA");

    if (!phoneNumber.isValid()) {
      throw new Error();
    }

    return {
      isProper: true,
      formattedInput: phoneNumber.formatNational(),
    };
  } catch (error) {
    if (error instanceof Error) {
      return {
        isProper: false,
        errorMessage: "Invalid phone number given",
      };
    } else {
      return {
        isProper: false,
        errorMessage: `An unexpected error occurred: ${error}`,
      };
    }
  }
};

export const checkAddress = (
  input: string,
):
  | { isProper: false; errorMessage: string }
  | { isProper: true; formattedInput: string } => {
  const trimmedInput = input.trim();
  if (trimmedInput.length === 0) {
    return {
      isProper: false,
      errorMessage: "Address cannot be empty",
    };
  }

  if (trimmedInput.length > 100) {
    return {
      isProper: false,
      errorMessage: "Max 100 characters allowed",
    };
  }

  if (!addressRegex.test(trimmedInput)) {
    return {
      isProper: false,
      errorMessage: "Only A-Z, a-z, @, #, 0-9 and spaces are allowed",
    };
  }

  return {
    isProper: true,
    formattedInput: trimmedInput,
  };
};

export const checkPickUpTime = (
  input: string | null,
):
  | { isProper: false; errorMessage: string }
  | { isProper: true; formattedInput: Date } => {
  if (input === null) {
    //No date provided
    return {
      isProper: true,
      formattedInput: new Date(),
    };
  }

  if (!pickupTimeRegex.test(input)) {
    return {
      isProper: false,
      errorMessage: "Invalid date format",
    };
  }

  const localDateTime = dayjs.tz(input, IANA_TIME_ZONE); //Take the input and add the local time zone to it

  if (!localDateTime.isAfter(dayjs().tz(IANA_TIME_ZONE))) {
    //Date is behind current time
    return {
      isProper: true,
      formattedInput: new Date(),
    };
  }

  const inputAfterOneMonth = !(
    localDateTime.isBefore(dayjs().tz(IANA_TIME_ZONE).add(1, "month")) ||
    localDateTime.isSame(dayjs().tz(IANA_TIME_ZONE).add(1, "month"))
  );
  if (inputAfterOneMonth) {
    //Given input is outside of acceptable range of one month from current date
    return {
      isProper: false,
      errorMessage: "Date is outside acceptable range",
    };
  }

  return {
    isProper: true,
    formattedInput: localDateTime.toDate(),
  };
};

export const checkOTP = (
  input: string,
):
  | { isProper: false; errorMessage: string }
  | { isProper: true; formattedInput: string } => {
  if (!otpRegex.test(input)) {
    return {
      isProper: false,
      errorMessage: "Incorrect OTP format",
    };
  }

  return {
    isProper: true,
    formattedInput: input,
  };
};

export const checkTripReason = (
  input: string,
):
  | { isProper: false; errorMessage: string }
  | { isProper: true; formattedInput: string } => {
  const trimmedInput = input.trim();
  if (trimmedInput.length > 500) {
    return {
      isProper: false,
      errorMessage: "Max 500 characters allowed",
    };
  }

  return {
    isProper: true,
    formattedInput: trimmedInput,
  };
};

export const checkRedeemedCode = (
  input: string,
):
  | { isProper: false; errorMessage: string }
  | { isProper: true; formattedInput: string } => {
  //TODO: implement

  return {
    isProper: true,
    formattedInput: input.trim(),
  };
};

export const checkReportAppComments = (
  input: string,
):
  | { isProper: false; errorMessage: string }
  | { isProper: true; formattedInput: string } => {
  const trimmedInput = input.trim();

  if (trimmedInput.length === 0) {
    return {
      isProper: false,
      errorMessage: "Field cannot be blank",
    };
  }

  if (trimmedInput.length > 1000) {
    return {
      isProper: false,
      errorMessage: "Max 1,000 characters are accepted",
    };
  }

  return {
    isProper: true,
    formattedInput: trimmedInput,
  };
};

export const checkReportAppTitle = (
  input: string,
):
  | { isProper: false; errorMessage: string }
  | { isProper: true; formattedInput: string } => {
  const trimmedInput = input.trim();

  if (trimmedInput.length === 0) {
    return {
      isProper: false,
      errorMessage: "Title cannot be blank",
    };
  }

  if (trimmedInput.length > 100) {
    return {
      isProper: false,
      errorMessage: "Max 100 characters are accepted",
    };
  }

  return {
    isProper: true,
    formattedInput: trimmedInput,
  };
};
