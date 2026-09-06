export enum BookingStatus {
  PENDING = "pending",
  IN_PROGRESS = "in_progress",
  CANCELLED = "cancelled",
  COMPLETED = "completed",
}

export enum PaymentMethods {
  CREDIT_CARD = "credit_card",
  REDEEM_CODE = "redeem_code",
  RIDES = "rides",
}

export enum UserRoles {
  ADMIN = "admin",
  DRIVER = "driver",
  MEMBER = "member",
}

export const ReportAppIssueChipTypes = [
  {
    chip_color: "grape",
    label: "Read",
  },
  {
    chip_color: "red",
    label: "Complaint",
  },
  {
    chip_color: "cyan",
    label: "Suggestion",
  },
  {
    chip_color: "yellow",
    label: "In Progress",
  },
  {
    chip_color: "pink",
    label: "To Do",
  },
  {
    chip_color: "green",
    label: "Done",
  },
];

export const PriorityRatingTypesString = ["1", "2", "3", "4", "5"];
export const PriorityRatingTypesNumber = [1, 2, 3, 4, 5];
