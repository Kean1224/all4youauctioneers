
"use client";
import React, { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    if (!confirmPassword) {
      setPasswordError("");
    } else if (password !== confirmPassword) {
      setPasswordError("Passwords do not match");
    } else {
      setPasswordError("");
    }
  }, [password, confirmPassword]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("");
    if (!password || !confirmPassword) {
      setStatus("❌ Please fill in all fields.");
      return;
    }
    if (password !== confirmPassword) {
      setPasswordError("Passwords do not match");
      setStatus("❌ Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      if (res.ok) {
        setStatus("✅ Password reset! You may now log in.");
      } else {
        setStatus("❌ Reset failed. Link may be invalid or expired.");
      }
    } catch {
      setStatus("❌ Server error. Try again.");
    }
    setLoading(false);
  };

  return (
    <main className="max-w-md mx-auto mt-10 p-6 bg-white rounded shadow">
      <h1 className="text-3xl font-bold text-yellow-600 mb-6 text-center">Reset Password</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium">New Password</label>
          <input
            type="password"
            required
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full px-4 py-2 border rounded shadow-sm"
            autoComplete="new-password"
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Confirm Password</label>
          <input
            type="password"
            required
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            className="w-full px-4 py-2 border rounded shadow-sm"
            autoComplete="new-password"
          />
          {passwordError && (
            <p className="text-red-600 text-xs mt-1">{passwordError}</p>
          )}
        </div>
        <button
          type="submit"
          className="w-full bg-yellow-500 hover:bg-yellow-600 text-white font-semibold py-2 px-4 rounded"
          disabled={!!passwordError || !password || !confirmPassword || loading}
        >
          {loading ? "Resetting..." : "Reset Password"}
        </button>
        {status && <p className="text-center mt-2 text-green-600">{status}</p>}
      </form>
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="text-center mt-10">Loading...</div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
