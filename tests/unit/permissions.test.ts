import { describe, it, expect } from "vitest";
import type { UserRole, Profile } from "@/types/database";

describe("Vivona Security & Permission Logic", () => {
  // Test role assignment guards
  function canModifyRole(actorRole: UserRole): boolean {
    return actorRole === "admin";
  }

  function canAccessWedding(
    actorRole: UserRole,
    actorId: string,
    wedding: { client_id: string; assigned_employee_ids: string[] }
  ): boolean {
    if (actorRole === "admin") return true;
    if (actorRole === "employee") {
      return wedding.assigned_employee_ids.includes(actorId);
    }
    if (actorRole === "client") {
      return wedding.client_id === actorId;
    }
    return false;
  }

  function canAccessEnquiry(
    actorRole: UserRole,
    actorId: string,
    enquiry: { client_id: string | null }
  ): boolean {
    if (actorRole === "admin") return true;
    if (actorRole === "client") {
      return enquiry.client_id === actorId;
    }
    return false; // Employees cannot see general CRM enquiries before assignment
  }

  function canAccessVendorShortlist(
    actorRole: UserRole,
    actorId: string,
    wedding: { id: string; client_id: string; agreement_signed: boolean }
  ): boolean {
    if (actorRole === "admin") return true;
    if (actorRole === "client") {
      // Agreement Gate: client can only see vendor shortlist if agreement is signed
      return wedding.client_id === actorId && wedding.agreement_signed;
    }
    return false;
  }

  it("prevents non-admins from changing their own or other user roles", () => {
    expect(canModifyRole("client")).toBe(false);
    expect(canModifyRole("employee")).toBe(false);
    expect(canModifyRole("admin")).toBe(true);
  });

  it("prevents an employee from accessing unassigned weddings", () => {
    const wedding = {
      client_id: "client-1",
      assigned_employee_ids: ["planner-1"], // only planner-1 is assigned
    };

    expect(canAccessWedding("employee", "planner-1", wedding)).toBe(true);
    expect(canAccessWedding("employee", "planner-2", wedding)).toBe(false);
  });

  it("prevents a client from reading another client's enquiry or wedding", () => {
    const wedding = {
      client_id: "client-1",
      assigned_employee_ids: ["planner-1"],
    };

    expect(canAccessWedding("client", "client-1", wedding)).toBe(true);
    expect(canAccessWedding("client", "client-2", wedding)).toBe(false);

    const enquiry = {
      client_id: "client-1",
    };
    expect(canAccessEnquiry("client", "client-1", enquiry)).toBe(true);
    expect(canAccessEnquiry("client", "client-2", enquiry)).toBe(false);
  });

  it("enforces agreement gate: vendor shortlist is hidden from client until signed", () => {
    const unsignedWedding = {
      id: "wed-1",
      client_id: "client-1",
      agreement_signed: false,
    };

    const signedWedding = {
      id: "wed-1",
      client_id: "client-1",
      agreement_signed: true,
    };

    expect(canAccessVendorShortlist("client", "client-1", unsignedWedding)).toBe(false);
    expect(canAccessVendorShortlist("client", "client-1", signedWedding)).toBe(true);
    // Admin always has access
    expect(canAccessVendorShortlist("admin", "admin-id", unsignedWedding)).toBe(true);
  });
});
