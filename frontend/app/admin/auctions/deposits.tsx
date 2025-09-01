"use client";
import React, { useEffect, useState } from "react";
import { getApiUrl } from "../../../lib/api";
import AdminSidebar from "../../../components/AdminSidebar";
import { getToken } from "../../../utils/auth";

export default function AdminAuctionDepositsPage() {
  const [auctions, setAuctions] = useState<any[]>([]);
  const [selectedAuction, setSelectedAuction] = useState<string>("");
  const [deposits, setDeposits] = useState<any[]>([]);

  useEffect(() => {
    const token = getToken();
    const headers = {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    };
    
    fetch(`${getApiUrl()}/api/auctions`, { headers })
      .then((res) => res.json())
      .then(setAuctions);
  }, []);

  useEffect(() => {
    if (!selectedAuction) return;
    const token = getToken();
    const headers = {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    };
    
    fetch(`${getApiUrl()}/api/deposits/auction/${selectedAuction}`, { headers })
      .then((res) => res.json())
      .then(setDeposits);
  }, [selectedAuction]);

  const handleApprove = async (email: string) => {
    const token = getToken();
    const headers = {
      "Content-Type": "application/json",
      ...(token && { "Authorization": `Bearer ${token}` })
    };
    
    await fetch(`${getApiUrl()}/api/deposits/${selectedAuction}/${email}`, {
      method: "PUT",
      headers,
      body: JSON.stringify({ status: "approved" }),
    });
    fetch(`${getApiUrl()}/api/deposits/auction/${selectedAuction}`, { headers })
      .then((res) => res.json())
      .then(setDeposits);
  };

  return (
    <div className="flex min-h-screen">
      <AdminSidebar />
      <main className="flex-1 px-8 py-8 bg-white">
        <div className="p-6 max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-6 text-yellow-600">Auction Deposits</h1>
          <div className="mb-6">
            <label className="block mb-2 font-semibold">Select Auction:</label>
            <select
              className="border rounded px-3 py-2"
              value={selectedAuction}
              onChange={(e) => setSelectedAuction(e.target.value)}
            >
              <option value="">-- Select Auction --</option>
              {auctions
                .filter((a) => a.depositRequired)
                .map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.title} (R{a.depositAmount})
                  </option>
                ))}
            </select>
          </div>
          {selectedAuction && (
            <div className="bg-white p-4 rounded shadow">
              <h2 className="text-xl font-bold mb-4">Deposits for Auction</h2>
              {deposits.length === 0 ? (
                <p>No deposit requests yet.</p>
              ) : (
                <table className="w-full text-sm border">
                  <thead>
                    <tr className="bg-yellow-100">
                      <th className="p-2 border">Email</th>
                      <th className="p-2 border">Status</th>
                      <th className="p-2 border">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deposits.map((d) => (
                      <tr key={d.email}>
                        <td className="p-2 border">{d.email}</td>
                        <td className="p-2 border">{d.status}</td>
                        <td className="p-2 border">
                          {d.status !== "approved" && (
                            <button
                              onClick={() => handleApprove(d.email)}
                              className="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600"
                            >
                              Approve
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
