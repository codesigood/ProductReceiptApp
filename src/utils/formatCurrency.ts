/**
 * Format a number into Nigerian Naira currency style.
 * Examples:
 *  - 43000 -> ₦43,000.00
 *  - 1500.5 -> ₦1,500.50
 *  - "2000" -> ₦2,000.00
 */
export function formatNaira(amount: number | string): string {
  const value = typeof amount === 'string' ? parseFloat(amount) : amount;

  if (isNaN(value)) {
    return "₦0.00";
  }

  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 2,
  }).format(value);
}
