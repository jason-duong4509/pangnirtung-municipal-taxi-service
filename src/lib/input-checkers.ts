import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import { parsePhoneNumberWithError } from "libphonenumber-js";
import {
  addressRegex,
  colorHexRegex,
  emailRegex,
  IANA_TIME_ZONE,
  nameRegex,
  otpRegex,
  pickupTimeRegex,
  pickupTimeRegexDateOnly,
  usernameRegex,
} from "~/types/constants";
import {
  BookingValueTypes,
  PaymentMethods,
  PriorityRatingTypesNumber,
  PriorityRatingTypesString,
} from "~/types/types";

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

export const checkReportAppPriority = (
  input: number,
):
  | { isProper: false; errorMessage: string }
  | { isProper: true; formattedInput: number } => {
  if (PriorityRatingTypesNumber.includes(input)) {
    return {
      isProper: true,
      formattedInput: input,
    };
  } else {
    return {
      isProper: false,
      errorMessage: "Invalid priority value",
    };
  }
};

export const checkReportAppTags = (
  input: string[],
):
  | { isProper: false; errorMessage: string }
  | { isProper: true; formattedInput: string[] } => {
  let listOfTags = [] as string[];
  for (const tag of input) {
    const result = checkIssueTagName(tag);
    if (result.isProper) {
      listOfTags = [...listOfTags, result.formattedInput];
    } else {
      return {
        isProper: false,
        errorMessage: `Invalid tag "${tag}" with error: ${result.errorMessage}`,
      };
    }
  }

  return {
    isProper: true,
    formattedInput: listOfTags,
  };
};

export const checkBookingType = (
  input: string,
):
  | { isProper: false; errorMessage: string }
  | { isProper: true; formattedInput: BookingValueTypes } => {
  let bookingType = undefined as BookingValueTypes | undefined;

  Object.values(BookingValueTypes).forEach((type) => {
    if (type === input) {
      bookingType = type;
    }
  });

  if (bookingType) {
    return {
      isProper: true,
      formattedInput: bookingType,
    };
  } else {
    return {
      isProper: false,
      errorMessage: "Improper booking type given",
    };
  }
};

export const checkPaymentMethodType = (
  input: string,
):
  | { isProper: false; errorMessage: string }
  | { isProper: true; formattedInput: PaymentMethods } => {
  let paymentType = undefined as PaymentMethods | undefined;

  Object.values(PaymentMethods).forEach((type) => {
    if (type === input) {
      paymentType = type;
    }
  });

  if (paymentType) {
    return {
      isProper: true,
      formattedInput: paymentType,
    };
  } else {
    return {
      isProper: false,
      errorMessage: "Improper payment method given",
    };
  }
};

export const checkBookingTypeAndPaymentMethod = (
  bookingType: string,
  paymentMethod: string,
):
  | { isProper: false; errorMessage: string }
  | {
      isProper: true;
      formattedInput: {
        bookingType: BookingValueTypes;
        paymentMethod: PaymentMethods;
      };
    } => {
  const bookingTypeCheck = checkBookingType(bookingType);
  let formattedBookingType = undefined as undefined | BookingValueTypes;
  if (bookingTypeCheck.isProper) {
    formattedBookingType = bookingTypeCheck.formattedInput;
  } else {
    return {
      isProper: false,
      errorMessage: "Invalid booking type given",
    };
  }

  const paymentMethodCheck = checkPaymentMethodType(paymentMethod);
  let formattedPaymentMethod = undefined as undefined | PaymentMethods;
  if (paymentMethodCheck.isProper) {
    formattedPaymentMethod = paymentMethodCheck.formattedInput;
  } else {
    return {
      isProper: false,
      errorMessage: "Invalid payment method given",
    };
  }

  if (
    formattedBookingType === BookingValueTypes.OUT_OF_TOWN &&
    formattedPaymentMethod === PaymentMethods.RIDES
  ) {
    return {
      isProper: false,
      errorMessage: "Rides cannot be used on out of town trips",
    };
  } else {
    return {
      isProper: true,
      formattedInput: {
        bookingType: formattedBookingType,
        paymentMethod: formattedPaymentMethod,
      },
    };
  }
};

export const checkRedeemCode = (
  input: string,
):
  | { isProper: false; errorMessage: string }
  | { isProper: true; formattedInput: string } => {
  if (!usernameRegex.test(input)) {
    return {
      isProper: false,
      errorMessage: "Code can only be alphanumeric",
    };
  }

  return {
    isProper: true,
    formattedInput: input.toLowerCase(),
  };
};

export const checkNumberOfRidesToAdd = (
  balanceChange: number,
  currentTotal: number,
):
  | { isProper: false; errorMessage: string }
  | {
      isProper: true;
      formattedInput: { balanceChange: number; currentTotal: number };
    } => {
  if (!Number.isInteger(currentTotal) || !Number.isInteger(balanceChange)) {
    return {
      isProper: false,
      errorMessage: "Only integer values are accepted",
    };
  }

  if (balanceChange > 0 && currentTotal + balanceChange > 999) {
    return {
      isProper: false,
      errorMessage: `User has too many rides to add ${balanceChange} more rides (max is 999)`,
    };
  }

  if (balanceChange < 0 && currentTotal + balanceChange < 0) {
    return {
      isProper: false,
      errorMessage: `User has too few rides to remove ${balanceChange} rides (min is 0)`,
    };
  }

  return {
    isProper: true,
    formattedInput: {
      balanceChange: balanceChange,
      currentTotal: currentTotal,
    },
  };
};

export const checkPaginationPageNumber = (
  input: number,
):
  | { isProper: false; errorMessage: string }
  | { isProper: true; formattedInput: number } => {
  if (!Number.isInteger(input)) {
    return {
      isProper: false,
      errorMessage: "Only integer values are accepted",
    };
  }

  if (input < 1) {
    return {
      isProper: false,
      errorMessage: "Invalid page number",
    };
  }

  return {
    isProper: true,
    formattedInput: input,
  };
};

export const checkReportAppFilters = (
  input: string[],
):
  | { isProper: false; errorMessage: string }
  | {
      isProper: true;
      formattedInput: { priorityFilters: number[]; tagFilters: string[] };
    } => {
  let priorityFilters = [] as number[];
  let tagFilters = [] as string[];

  for (const filter of input) {
    let isValid = false;
    //Check chip types
    const result = checkIssueTagName(filter);
    if (result.isProper) {
      isValid = true;
      tagFilters = [...tagFilters, result.formattedInput];
    }
    //Check priorities
    if (PriorityRatingTypesString.includes(filter) && !isValid) {
      isValid = true;
      priorityFilters = [...priorityFilters, Number(filter)];
    }
    //Check if valid
    if (!isValid) {
      return {
        isProper: false,
        errorMessage: `Invalid filter type: ${filter}`,
      };
    }
  }

  return {
    isProper: true,
    formattedInput: {
      priorityFilters: priorityFilters,
      tagFilters: tagFilters,
    },
  };
};

export const checkEditUsersTableFilters = (
  input: Record<string, unknown>,
):
  | { isProper: false; errorMessage: string }
  | {
      isProper: true;
      formattedInput:
        | { filter: null }
        | { filter: "Name On Account"; filterKeyword: string }
        | { filter: "Primary Phone Number"; filterKeyword: string }
        | { filter: "Resident?"; filterKeyword: "No" | "Yes" }
        | { filter: "User Role"; filterKeyword: "admin" | "driver" | "member" };
    } => {
  if (
    input.filter === undefined ||
    input.filter === null ||
    input.filterKeyword === ""
  ) {
    return {
      isProper: true,
      formattedInput: {
        filter: null,
      },
    };
  } else if (input.filter === "Name On Account" && input.filterKeyword) {
    return {
      isProper: true,
      formattedInput: {
        filter: "Name On Account",
        filterKeyword: `${input.filterKeyword}`,
      },
    };
  } else if (input.filter === "Primary Phone Number" && input.filterKeyword) {
    return {
      isProper: true,
      formattedInput: {
        filter: "Primary Phone Number",
        filterKeyword: `${input.filterKeyword}`,
      },
    };
  } else if (input.filter === "Resident?" && input.filterKeyword) {
    if (`${input.filterKeyword}` === "Yes") {
      return {
        isProper: true,
        formattedInput: {
          filter: "Resident?",
          filterKeyword: "Yes",
        },
      };
    } else if (`${input.filterKeyword}` === "No") {
      return {
        isProper: true,
        formattedInput: {
          filter: "Resident?",
          filterKeyword: "No",
        },
      };
    } else {
      return {
        isProper: false,
        errorMessage: `Invalid filter keyword for Resident filter: ${input.filterKeyword}`,
      };
    }
  } else if (input.filter === "User Role" && input.filterKeyword) {
    if (`${input.filterKeyword}` === "admin") {
      return {
        isProper: true,
        formattedInput: {
          filter: "User Role",
          filterKeyword: "admin",
        },
      };
    } else if (`${input.filterKeyword}` === "driver") {
      return {
        isProper: true,
        formattedInput: {
          filter: "User Role",
          filterKeyword: "driver",
        },
      };
    } else if (`${input.filterKeyword}` === "member") {
      return {
        isProper: true,
        formattedInput: {
          filter: "User Role",
          filterKeyword: "member",
        },
      };
    } else {
      return {
        isProper: false,
        errorMessage: `Invalid filter keyword for User Role filter: ${input.filterKeyword}`,
      };
    }
  } else {
    return {
      isProper: false,
      errorMessage: `Invalid filter type (${input.filter}) or filter keyword (${input.filterKeyword}) given`,
    };
  }
};

export const checkTripTableFilters = (
  input: Record<string, unknown>,
):
  | { isProper: false; errorMessage: string }
  | {
      isProper: true;
      formattedInput:
        | { filter: null }
        | { filter: "Destination Address"; filterKeyword: string }
        | {
            filter: "Payment Method";
            filterKeyword: "credit_card" | "rides" | "cash";
          }
        | { filter: "Pick-up Address"; filterKeyword: string }
        | { filter: "Pick-up Time"; filterKeyword: Date }
        | { filter: "Reason For Trip"; filterKeyword: string }
        | { filter: "Requested Verification?"; filterKeyword: "Yes" | "No" };
    } => {
  if (
    input.filter === undefined ||
    input.filter === null ||
    input.filterKeyword === ""
  ) {
    return {
      isProper: true,
      formattedInput: {
        filter: null,
      },
    };
  } else if (input.filter === "Destination Address" && input.filterKeyword) {
    return {
      isProper: true,
      formattedInput: {
        filter: "Destination Address",
        filterKeyword: `${input.filterKeyword}`,
      },
    };
  } else if (input.filter === "Payment Method" && input.filterKeyword) {
    if (`${input.filterKeyword}` === "credit_card") {
      return {
        isProper: true,
        formattedInput: {
          filter: "Payment Method",
          filterKeyword: "credit_card",
        },
      };
    } else if (`${input.filterKeyword}` === "rides") {
      return {
        isProper: true,
        formattedInput: {
          filter: "Payment Method",
          filterKeyword: "rides",
        },
      };
    } else if (`${input.filterKeyword}` === "cash") {
      return {
        isProper: true,
        formattedInput: {
          filter: "Payment Method",
          filterKeyword: "cash",
        },
      };
    } else {
      return {
        isProper: false,
        errorMessage: `Invalid filter keyword for Payment Method filter: ${input.filterKeyword}`,
      };
    }
  } else if (input.filter === "Pick-up Address" && input.filterKeyword) {
    return {
      isProper: true,
      formattedInput: {
        filter: "Pick-up Address",
        filterKeyword: `${input.filterKeyword}`,
      },
    };
  } else if (input.filter === "Pick-up Time" && input.filterKeyword) {
    if (!pickupTimeRegexDateOnly.test(`${input.filterKeyword}`)) {
      return {
        isProper: false,
        errorMessage: `Invalid date format given: ${input.filterKeyword}`,
      };
    }
    return {
      isProper: true,
      formattedInput: {
        filter: "Pick-up Time",
        filterKeyword: dayjs
          .tz(`${input.filterKeyword}`, IANA_TIME_ZONE)
          .toDate(),
      },
    };
  } else if (input.filter === "Reason For Trip" && input.filterKeyword) {
    return {
      isProper: true,
      formattedInput: {
        filter: "Reason For Trip",
        filterKeyword: `${input.filterKeyword}`,
      },
    };
  } else if (
    input.filter === "Requested Verification?" &&
    input.filterKeyword
  ) {
    if (`${input.filterKeyword}` === "Yes") {
      return {
        isProper: true,
        formattedInput: {
          filter: "Requested Verification?",
          filterKeyword: "Yes",
        },
      };
    } else if (`${input.filterKeyword}` === "No") {
      return {
        isProper: true,
        formattedInput: {
          filter: "Requested Verification?",
          filterKeyword: "No",
        },
      };
    } else {
      return {
        isProper: false,
        errorMessage: `Invalid filter keyword for Requested Verification filter: ${input.filterKeyword}`,
      };
    }
  } else {
    return {
      isProper: false,
      errorMessage: `Invalid filter type (${input.filter}) or filter keyword (${input.filterKeyword}) given`,
    };
  }
};

export const checkRideCodeDiscount = (
  input: string,
):
  | { isProper: false; errorMessage: string }
  | { isProper: true; formattedInput: number } => {
  const trimmedInput = `${input}`.trim();
  if (trimmedInput === "" || !Number.isInteger(Number(trimmedInput))) {
    return {
      isProper: false,
      errorMessage: "Discount filter must be an integer",
    };
  }

  const discount = Number(trimmedInput);
  if (discount > 100 || discount < 1) {
    return {
      isProper: false,
      errorMessage: "Discount must be within 1-100",
    };
  }

  return {
    isProper: true,
    formattedInput: discount,
  };
};

export const checkRideCodeTableFilters = (
  input: Record<string, unknown>,
):
  | { isProper: false; errorMessage: string }
  | {
      isProper: true;
      formattedInput:
        | { filter: null }
        | { filter: "Code"; filterKeyword: string }
        | { filter: "Discount"; filterKeyword: number };
    } => {
  if (
    input.filter === undefined ||
    input.filter === null ||
    input.filterKeyword === ""
  ) {
    return {
      isProper: true,
      formattedInput: {
        filter: null,
      },
    };
  } else if (input.filter === "Code" && input.filterKeyword) {
    return {
      isProper: true,
      formattedInput: {
        filter: "Code",
        filterKeyword: `${input.filterKeyword}`,
      },
    };
  } else if (input.filter === "Discount" && input.filterKeyword) {
    const result = checkRideCodeDiscount(`${input.filterKeyword}`);
    if (result.isProper) {
      return {
        isProper: true,
        formattedInput: {
          filter: "Discount",
          filterKeyword: result.formattedInput,
        },
      };
    } else {
      return {
        isProper: false,
        errorMessage: result.errorMessage,
      };
    }
  } else {
    return {
      isProper: false,
      errorMessage: `Invalid filter type (${input.filter}) or filter keyword (${input.filterKeyword}) given`,
    };
  }
};

export const checkIssueTagName = (
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
  if (splitNames.length > 2) {
    return {
      isProper: false,
      errorMessage: "Name cannot have more than 1 space",
    };
  }

  if (trimmedInput.length > 15) {
    return {
      isProper: false,
      errorMessage: "Name too long (max 15 characters)",
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

export const checkIssueTagColor = (
  input: string,
):
  | { isProper: false; errorMessage: string }
  | { isProper: true; formattedInput: string } => {
  if (input.length === 0) {
    return {
      isProper: false,
      errorMessage: "Cannot be blank",
    };
  }

  const trimmedInput = input.trim();
  if (trimmedInput.length !== 7) {
    return {
      isProper: false,
      errorMessage: "Invalid color code length",
    };
  }

  if (!colorHexRegex.test(trimmedInput)) {
    return {
      isProper: false,
      errorMessage: "Invalid color code",
    };
  }

  return {
    isProper: true,
    formattedInput: trimmedInput,
  };
};
