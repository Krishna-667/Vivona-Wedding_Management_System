"use client";

import * as React from "react";
import { toast } from "sonner";
import { updatePasswordAction } from "@/app/actions/auth";

export function ChangePasswordDialog({
  triggerText = "Security & Password",
  variant = "link",
}: {
  triggerText?: string;
  variant?: "button" | "link";
}) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [currentPassword, setCurrentPassword] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (newPassword.length < 8) {
      setErrorMsg("New password must be at least 8 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg("New passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const res = await updatePasswordAction({
        currentPassword: currentPassword || undefined,
        newPassword,
      });

      if (!res.ok) {
        setErrorMsg(res.error || "Failed to update password.");
        setLoading(false);
        return;
      }

      toast.success("Your password has been updated securely!");
      setIsOpen(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setLoading(false);
    } catch {
      setErrorMsg("An unexpected error occurred while updating your password.");
      setLoading(false);
    }
  };

  return (
    <>
      {variant === "button" ? (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-background border border-border hover:border-maroon/50 text-charcoal hover:text-maroon transition-all shadow-xs cursor-pointer"
        >
          <span>🔑</span>
          <span>{triggerText}</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="text-xs text-charcoal/70 hover:text-maroon font-medium py-1 transition-colors flex items-center gap-1.5 cursor-pointer"
        >
          <span className="text-[11px]">🔑</span>
          <span>{triggerText}</span>
        </button>
      )}

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal/50 backdrop-blur-xs animate-in fade-in">
          <div className="relative w-full max-w-md rounded-2xl bg-card border border-border p-6 shadow-xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div>
                <h3 className="font-serif text-lg font-semibold text-maroon">
                  Change Password
                </h3>
                <p className="text-xs text-charcoal/60">
                  Update your authentication credentials
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-charcoal/50 hover:text-charcoal p-1 rounded-md text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 text-xs rounded-xl bg-destructive/10 border border-destructive/20 text-destructive font-medium animate-in fade-in">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-charcoal/80 mb-1">
                  Current Password (Optional if first time)
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-charcoal/80 mb-1">
                  New Password (Minimum 8 Characters)
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={8}
                  placeholder="••••••••••••"
                  className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-charcoal/80 mb-1">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={8}
                  placeholder="••••••••••••"
                  className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="flex gap-2 justify-end pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-charcoal/70 hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 rounded-xl bg-maroon text-ivory text-xs font-semibold hover:bg-maroon-600 disabled:opacity-50 transition-all shadow-xs cursor-pointer"
                >
                  {loading ? "Updating..." : "Save New Password"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
