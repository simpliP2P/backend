export enum PaymentTerms {
  PIA = "pia", // "Payment in Advance"
  COD = "cod", // "Cash on Delivery"
  LOC = "loc", // "Line of Credit"
  NT00 = "nt00", // "Payment Immediately"
  NT15 = "nt15", // "15 days payment after invoice"
  NT30 = "nt30", // "30 days payment after invoice"
  NT45 = "nt45", // "45 days payment after invoice"
  NT60 = "nt60", // "60 days payment after invoice"
  NT90 = "nt90", // "90 days payment after invoice"
  NT120 = "nt120", // "120 days payment after invoice"
}

export enum NotificationChannels {
  SMS = "sms",
  Email = "email",
}
