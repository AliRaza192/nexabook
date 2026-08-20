/**
 * Payroll Event Handlers
 *
 * Handles events related to payroll processing.
 */

import { eventBus } from "../event-bus";
import { EVENT_TYPES, PayrollRunEvent } from "../types";

/**
 * Register all payroll event handlers
 */
export function registerPayrollHandlers(): void {
  // When payroll is run → generate payslips and journal entry
  eventBus.on(EVENT_TYPES.PAYROLL_RUN, async (event) => {
    const { payrollRunId, month, year, totalEmployees, totalGross, totalNet } =
      event.data as PayrollRunEvent["data"];
    console.log(
      `[PayrollHandler] Payroll run ${payrollRunId}: ${totalEmployees} employees, gross Rs. ${totalGross}`
    );
    // TODO: Generate payslip PDFs
    // TODO: Create journal entry (Salary Expense, Deductions Payable, Bank)
    // TODO: Send payslips to employees via email
    // TODO: Generate bank transfer file
  });
}
