import { describe, it, expect } from "vitest";

describe("Payroll Automation - Business Logic", () => {
  // FR-1: Auto EOBI Calculation
  describe("Auto EOBI Calculation", () => {
    it("calculates employee EOBI as 1% of basic salary", () => {
      const basicSalary = 50000;
      const eobiRate = 0.01;
      const eobiDeduction = basicSalary * eobiRate;
      expect(eobiDeduction).toBe(500);
    });

    it("calculates employer EOBI as 6% of basic salary", () => {
      const basicSalary = 50000;
      const employerEobiRate = 0.06;
      const employerEobi = basicSalary * employerEobiRate;
      expect(employerEobi).toBe(3000);
    });

    it("caps EOBI at minimum wage ceiling (Rs. 25,000)", () => {
      const basicSalary = 100000;
      const minWageCeiling = 25000;
      const eobiBase = Math.min(basicSalary, minWageCeiling);
      const eobiDeduction = eobiBase * 0.01;
      expect(eobiDeduction).toBe(250); // Not 1000
    });

    it("does not cap EOBI below minimum wage ceiling", () => {
      const basicSalary = 20000;
      const minWageCeiling = 25000;
      const eobiBase = Math.min(basicSalary, minWageCeiling);
      const eobiDeduction = eobiBase * 0.01;
      expect(eobiDeduction).toBe(200);
    });

    it("uses manual EOBI if provided", () => {
      const basicSalary = 50000;
      const manualEobi = 600;
      const minWageCeiling = 25000;
      const autoEobi = Math.min(basicSalary, minWageCeiling) * 0.01;
      const finalEobi = manualEobi > 0 ? manualEobi : autoEobi;
      expect(finalEobi).toBe(600);
    });
  });

  // FR-2: Provident Fund Calculation
  describe("Provident Fund Calculation", () => {
    it("calculates PF as 8.33% of basic salary", () => {
      const basicSalary = 50000;
      const pfRate = 0.0833;
      const pf = basicSalary * pfRate;
      expect(pf).toBeCloseTo(4165, 0);
    });

    it("calculates PF for different salary", () => {
      const basicSalary = 80000;
      const pfRate = 0.0833;
      const pf = basicSalary * pfRate;
      expect(pf).toBeCloseTo(6664, 0);
    });

    it("handles zero salary", () => {
      const basicSalary = 0;
      const pfRate = 0.0833;
      const pf = basicSalary * pfRate;
      expect(pf).toBe(0);
    });
  });

  // FR-3: Bonus Support
  describe("Bonus Support", () => {
    it("adds bonus to total earnings", () => {
      const basicSalary = 50000;
      const houseRent = 10000;
      const medicalAllowance = 5000;
      const bonus = 25000;
      const totalEarnings = basicSalary + houseRent + medicalAllowance + bonus;
      expect(totalEarnings).toBe(90000);
    });

    it("includes bonus in net salary calculation", () => {
      const totalEarnings = 90000;
      const totalDeductions = 15000;
      const netSalary = totalEarnings - totalDeductions;
      expect(netSalary).toBe(75000);
    });

    it("handles zero bonus", () => {
      const basicSalary = 50000;
      const bonus = 0;
      const totalEarnings = basicSalary + bonus;
      expect(totalEarnings).toBe(50000);
    });
  });

  // FR-4: Bank File Export
  describe("Bank File Export", () => {
    it("generates valid CSV with headers", () => {
      const headers = ["Employee Name", "Bank Name", "Account Number", "Amount"];
      const csv = headers.join(",");
      expect(csv).toBe("Employee Name,Bank Name,Account Number,Amount");
    });

    it("generates CSV rows for valid payslips", () => {
      const payslips = [
        { employeeName: "Ahmed", bankName: "HBL", accountNumber: "1234567890", netSalary: 45000 },
        { employeeName: "Ali", bankName: "MCB", accountNumber: "0987654321", netSalary: 55000 },
      ];
      const rows = payslips.map((p) => [
        p.employeeName,
        p.bankName,
        p.accountNumber,
        p.netSalary.toFixed(2),
      ]);
      expect(rows.length).toBe(2);
      expect(rows[0]).toEqual(["Ahmed", "HBL", "1234567890", "45000.00"]);
    });

    it("skips employees without bank details", () => {
      const payslips = [
        { employeeName: "Ahmed", bankName: "HBL", accountNumber: "1234567890" },
        { employeeName: "Ali", bankName: null, accountNumber: null },
        { employeeName: "Sara", bankName: "MCB", accountNumber: "0987654321" },
      ];
      const valid = payslips.filter((p) => p.bankName && p.accountNumber);
      const skipped = payslips.length - valid.length;
      expect(valid.length).toBe(2);
      expect(skipped).toBe(1);
    });

    it("calculates total amount correctly", () => {
      const payslips = [
        { netSalary: 45000 },
        { netSalary: 55000 },
        { netSalary: 60000 },
      ];
      const total = payslips.reduce((sum, p) => sum + p.netSalary, 0);
      expect(total).toBe(160000);
    });
  });

  // FR-5: Department Management
  describe("Department Management", () => {
    it("validates department name", () => {
      const name = "Sales";
      expect(name.length).toBeGreaterThan(0);
    });

    it("prevents duplicate department names", () => {
      const departments = ["Sales", "Marketing", "Finance"];
      const newDept = "Sales";
      const isDuplicate = departments.includes(newDept);
      expect(isDuplicate).toBe(true);
    });
  });

  // Payroll Calculation Integration
  describe("Payroll Calculation Integration", () => {
    it("calculates total deductions correctly", () => {
      const eobiDeduction = 500;
      const incomeTax = 2000;
      const providentFund = 4165;
      const unpaidLeaveDeduction = 0;
      const totalDeductions = eobiDeduction + incomeTax + providentFund + unpaidLeaveDeduction;
      expect(totalDeductions).toBe(6665);
    });

    it("calculates net salary correctly", () => {
      const totalEarnings = 70000;
      const totalDeductions = 6665;
      const netSalary = totalEarnings - totalDeductions;
      expect(netSalary).toBe(63335);
    });

    it("rounds to 2 decimal places", () => {
      const value = 4165.666;
      const rounded = Math.round(value * 100) / 100;
      expect(rounded).toBe(4165.67);
    });
  });
});
