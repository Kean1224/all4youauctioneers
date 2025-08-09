"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from 'next/navigation';
import ModernAdminLayout from "../../../components/ModernAdminLayout";
import AdminSidebar from "../../../components/AdminSidebar";

export default function AdminAuctionsPage() {
  const router = useRouter();
  useEffect(() => {
    const token = localStorage.getItem('admin_jwt');
    if (!token) {
      router.push('/admin/login');
      return;
    }
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (payload.role !== 'admin' || !payload.email || !payload.exp || Date.now() / 1000 > payload.exp) {
        router.push('/admin/login');
        return;
      }
    } catch {
      router.push('/admin/login');
      return;
    }
  }, [router]);
  const [auctions, setAuctions] = useState<any[]>([]);
  const [form, setForm] = useState({
    title: "",
    location: "",
    startTime: "",
    endTime: "",
    increment: 100,
    depositRequired: false,
    depositAmount: 0,
  });
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchAuctions();
  }, []);

  const fetchAuctions = async () => {
    try {
      const res = await fetch("/api/auctions");
      const data = await res.json();
      setAuctions(data);
    } catch (e) {
      // handle error
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("title", form.title);
      formData.append("location", form.location);
      formData.append("startTime", form.startTime);
      formData.append("endTime", form.endTime);
      formData.append("increment", String(form.increment));
      formData.append("depositRequired", String(form.depositRequired));
      formData.append("depositAmount", String(form.depositAmount));
      if (selectedImage) formData.append("image", selectedImage);
      const res = await fetch("/api/auctions", {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        setForm({
          title: "",
          location: "",
          startTime: "",
          endTime: "",
          increment: 100,
          depositRequired: false,
          depositAmount: 0,
        });
        setSelectedImage(null);
        fetchAuctions();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this auction?")) return;
    await fetch(`/api/auctions/${id}`, { method: "DELETE" });
    fetchAuctions();
  };

  const isAuctionCompleted = (auction: any) => {
    const now = new Date().getTime();
    const end = new Date(auction.endTime).getTime();
    return now > end;
  };

  return (
    <ModernAdminLayout>
      <div className="flex">
        <AdminSidebar />
        <main className="flex-1 px-8 py-8">
          <div className="p-6 max-w-7xl mx-auto">
            <h1 className="text-3xl font-bold mb-8 text-green-400">Auction Manager</h1>
            {/* Create New Auction */}
            <form onSubmit={handleCreate} className="bg-[#1a2a2f]/80 backdrop-blur rounded-2xl shadow-lg mb-10 p-8 space-y-6 border border-white/10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-green-200 font-semibold mb-1">Title</label>
                  <input
                    type="text"
                    required
                    value={form.title}
                    onChange={e => setForm({ ...form, title: e.target.value })}
                    className="w-full border border-green-700 bg-[#22343a] text-white px-4 py-3 rounded-lg focus:ring-2 focus:ring-green-400"
                  />
                </div>
                <div>
                  <label className="block text-green-200 font-semibold mb-1">Location</label>
                  <input
                    type="text"
                    value={form.location}
                    onChange={e => setForm({ ...form, location: e.target.value })}
                    className="w-full border border-green-700 bg-[#22343a] text-white px-4 py-3 rounded-lg focus:ring-2 focus:ring-green-400"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-green-200 font-semibold mb-1">Start Time</label>
                  <input
                    type="datetime-local"
                    value={form.startTime}
                    onChange={e => setForm({ ...form, startTime: e.target.value })}
                    className="w-full border border-green-700 bg-[#22343a] text-white px-4 py-3 rounded-lg focus:ring-2 focus:ring-green-400"
                  />
                </div>
                <div>
                  <label className="block text-green-200 font-semibold mb-1">End Time</label>
                  <input
                    type="datetime-local"
                    value={form.endTime}
                    onChange={e => setForm({ ...form, endTime: e.target.value })}
                    className="w-full border border-green-700 bg-[#22343a] text-white px-4 py-3 rounded-lg focus:ring-2 focus:ring-green-400"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-green-200 font-semibold mb-1">Bid Increment</label>
                  <input
                    type="number"
                    min={1}
                    value={form.increment}
                    onChange={e => setForm({ ...form, increment: Number(e.target.value) })}
                    className="w-full border border-green-700 bg-[#22343a] text-white px-4 py-3 rounded-lg focus:ring-2 focus:ring-green-400"
                  />
                </div>
                <div className="flex items-center gap-4 mt-8">
                  <label className="block text-green-200 font-semibold">Deposit Required</label>
                  <input
                    type="checkbox"
                    checked={form.depositRequired}
                    onChange={e => setForm({ ...form, depositRequired: e.target.checked })}
                    className="accent-green-500 w-5 h-5"
                  />
                  {form.depositRequired && (
                    <input
                      type="number"
                      min={0}
                      value={form.depositAmount}
                      onChange={e => setForm({ ...form, depositAmount: Number(e.target.value) })}
                      className="w-40 border border-green-700 bg-[#22343a] text-white px-4 py-3 rounded-lg focus:ring-2 focus:ring-green-400"
                      placeholder="Deposit Amount"
                    />
                  )}
                </div>
              </div>
              <div>
                <label className="block text-green-200 font-semibold mb-1">Auction Image</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={e => setSelectedImage(e.target.files?.[0] || null)}
                  className="w-full border border-green-700 bg-[#22343a] text-white px-4 py-3 rounded-lg focus:ring-2 focus:ring-green-400"
                />
                {selectedImage && (
                  <p className="text-green-300 mt-2">Selected: {selectedImage.name}</p>
                )}
              </div>
              <button
                type="submit"
                className="bg-gradient-to-r from-green-500 to-green-700 text-white px-8 py-3 rounded-xl font-bold hover:from-green-600 hover:to-green-800 shadow-lg transition-colors"
                disabled={loading}
              >
                {loading ? "Creating..." : "Create Auction"}
              </button>
            </form>
            <h2 className="text-2xl font-bold mb-6 text-green-300">All Auctions</h2>
            {auctions.length === 0 ? (
              <p className="text-green-200">No auctions found.</p>
            ) : (
              <div className="overflow-x-auto rounded-2xl shadow-lg">
                <table className="w-full text-base bg-[#1a2a2f]/80 backdrop-blur border border-white/20 rounded-2xl">
                  <thead>
                    <tr className="bg-gradient-to-r from-green-800/90 to-green-600/90 text-white text-left text-sm uppercase tracking-wider">
                      <th className="p-5">Title</th>
                      <th className="p-5">Location</th>
                      <th className="p-5">Start Time</th>
                      <th className="p-5">End Time</th>
                      <th className="p-5">Lots</th>
                      <th className="p-5">Status</th>
                      <th className="p-5">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auctions.map((auction, idx) => (
                      <tr
                        key={auction.id}
                        className={`border-t border-white/10 ${idx % 2 === 0 ? 'bg-[#22343a]/80' : 'bg-[#182325]/80'} hover:bg-green-900/60 transition-colors`}
                      >
                        <td className="p-5 font-bold text-white text-lg">{auction.title}</td>
                        <td className="p-5 text-green-200 font-semibold">{auction.location}</td>
                        <td className="p-5 text-green-100 font-mono">{auction.startTime}</td>
                        <td className="p-5 text-green-100 font-mono">{auction.endTime}</td>
                        <td className="p-5 text-green-200 font-bold">{auction.lots?.length || 0}</td>
                        <td className="p-5">
                          {isAuctionCompleted(auction) ? (
                            <span className="text-blue-400 font-bold">Completed</span>
                          ) : (
                            <span className="text-green-400 font-bold">Active</span>
                          )}
                        </td>
                        <td className="p-5 flex gap-2">
                          <button
                            className="bg-gradient-to-r from-green-500 to-green-700 text-white px-4 py-2 rounded-lg font-bold hover:from-green-600 hover:to-green-800 shadow"
                            onClick={() => window.location.href = `/auctions/${auction.id}`}
                          >
                            View
                          </button>
                          <button
                            className="bg-red-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-red-700 shadow"
                            onClick={() => handleDelete(auction.id)}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      </div>
    </ModernAdminLayout>
  );
}
