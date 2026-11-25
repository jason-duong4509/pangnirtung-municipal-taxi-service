export enum BookingStatus {
  PENDING = "pending",
  IN_PROGRESS = "in_progress",
  CANCELLED = "cancelled",
  COMPLETED = "completed",
}

export enum RideCodeStatus {
  ACTIVE = "active",
  EXPIRED = "expired",
}

export const BOOKING_COSTS = {
  in_town: 15,
  out_of_town: 25,
};

export const RIDE_CREDIT_COST = 12;
export const MAX_NUMBER_OF_RIDES_BOUGHT_PER_PURCHASE = 50;

export enum BookingValueTypes {
  IN_TOWN = "in_town",
  OUT_OF_TOWN = "out_of_town",
}

export const BookingTypes = [
  {
    label: `In Town ($${BOOKING_COSTS["in_town"]})`,
    value: BookingValueTypes.IN_TOWN,
  },
  {
    label: `Out of Town ($${BOOKING_COSTS["out_of_town"]})`,
    value: BookingValueTypes.OUT_OF_TOWN,
  },
];

export enum PaymentMethods {
  CREDIT_CARD = "credit_card",
  RIDES = "rides",
  CASH = "cash",
}

export enum UserRoles {
  ADMIN = "admin",
  DRIVER = "driver",
  MEMBER = "member",
}

export const PriorityRatingTypesString = ["1", "2", "3", "4", "5"];
export const PriorityRatingTypesNumber = [1, 2, 3, 4, 5];
