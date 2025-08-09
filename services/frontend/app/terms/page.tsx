'use client';

import React from 'react';

export default function TermsPage() {
  return (
    <main className="max-w-4xl mx-auto py-12 px-6 bg-white rounded shadow">
      <h1 className="text-3xl font-bold text-yellow-600 mb-6">Terms & Conditions</h1>

      <section className="space-y-6 text-gray-800 leading-relaxed text-sm md:text-base">
        <div>
          <h2 className="text-xl font-semibold mb-2">1. Introduction</h2>
          <p>
            By using All4You Auctioneers, you agree to abide by these Terms and Conditions. Please read them carefully before participating in any auction or using our platform.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-2">2. Registration</h2>
          <p>
            All users must register before bidding. You must provide accurate and truthful information. All bidders must upload valid FICA documents to comply with South African law.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-2">3. Bidding</h2>
          <p>
            Bids are legally binding. Once placed, bids cannot be withdrawn. Auction start and end times, as well as bid increments, are determined by the admin and may include sniper protection.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-2">4. Winning & Payment</h2>
          <p>
            Winners will receive an invoice upon auction close. Full payment is due within 48 hours. Failure to pay may result in a permanent ban and legal action.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-2">5. Buyer & Seller Responsibility</h2>
          <p>
            Buyers must inspect items before bidding. All sales are final. Sellers must provide accurate descriptions. All4You Auctioneers is not liable for private agreements between users.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-2">6. Fees</h2>
          <p>
            There are no buyer’s fees unless stated otherwise. Sellers may be subject to a commission based on final sale price, as discussed prior to listing.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-2">7. Disclaimer</h2>
          <p>
            All items are sold “as is.” All4You Auctioneers does not guarantee condition or performance. Users bid at their own risk.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-2">8. Contact</h2>
          <p>
            For questions or disputes, please reach out to us via the <a href="/contact" className="text-yellow-600 underline">Contact page</a>.
          </p>
        </div>
      </section>
    </main>
  );
}
