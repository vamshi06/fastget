'use client';

import { useRouter } from 'next/navigation';
import { CategoryCard } from '@/components/CategoryCard';
import { SearchBar } from '@/components/SearchBar';
import { categories } from '@/data/products';
import { ArrowRight, Clock, Shield, MapPin, Truck } from 'lucide-react';
import Link from 'next/link';

export default function Home() {
  const router = useRouter();

  const handleSearch = (query: string) => {
    if (query.trim()) {
      router.push(`/catalog?q=${encodeURIComponent(query)}`);
    }
  };

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-600 to-blue-800 text-white py-16 lg:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="w-5 h-5 text-blue-200" />
              <span className="text-blue-200 text-sm font-medium">
                Serving Andheri, Goregaon & Malad
              </span>
            </div>
            
            <h1 className="text-4xl lg:text-5xl font-bold mb-6 leading-tight">
              Site Material Delivered<br />
              Before Work Stops
            </h1>
            
            <p className="text-xl text-blue-100 mb-8 max-w-2xl">
              Urgent building materials delivered to your Mumbai site in 30-60 minutes. 
              Keep your project moving without leaving the job site.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 mb-8">
              <Link
                href="/catalog"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-blue-600 rounded-lg font-semibold hover:bg-blue-50 transition-colors"
              >
                Browse Products
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                href="/order"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 border-2 border-white text-white rounded-lg font-semibold hover:bg-white/10 transition-colors"
              >
                Track Your Order
              </Link>
            </div>

            <div className="flex flex-wrap gap-6 text-sm">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-200" />
                <span>30-60 min delivery</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-blue-200" />
                <span>Pay on delivery</span>
              </div>
              <div className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-blue-200" />
                <span>No app required</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Search Section */}
      <section className="py-8 bg-gray-50 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SearchBar
            onSearch={handleSearch}
            placeholder="Search for plywood, hinges, plumbing fittings..."
          />
        </div>
      </section>

      {/* Categories Section */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Shop by Category
          </h2>
          <p className="text-gray-600 mb-8">
            Essential materials for carpentry, plumbing, and site work
          </p>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map((category) => (
              <CategoryCard
                key={category.id}
                category={category}
                onClick={() => router.push(`/catalog?category=${category.id}`)}
              />
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">
            How It Works
          </h2>
          <p className="text-gray-600 mb-12 text-center max-w-2xl mx-auto">
            Get the materials you need without stopping work
          </p>

          <div className="grid md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-xl font-bold text-blue-600">1</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Browse</h3>
              <p className="text-sm text-gray-600">
                Find the urgent materials you need from our catalog
              </p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-xl font-bold text-blue-600">2</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Add to Cart</h3>
              <p className="text-sm text-gray-600">
                Select quantities and add items to your cart
              </p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-xl font-bold text-blue-600">3</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Checkout</h3>
              <p className="text-sm text-gray-600">
                Enter your site address and choose pay on delivery
              </p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-xl font-bold text-blue-600">4</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Track</h3>
              <p className="text-sm text-gray-600">
                Get ETA and track your order until delivery
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Service Area */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-blue-50 rounded-2xl p-8 lg:p-12">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  Service Area
                </h2>
                <p className="text-gray-600 mb-6 max-w-xl">
                  Currently delivering to construction sites in Andheri, Goregaon, and Malad. 
                  Our 30-60 minute delivery promise covers the densest parts of these areas.
                </p>
                <div className="flex flex-wrap gap-3">
                  {['Andheri East', 'Andheri West', 'Goregaon East', 'Goregaon West', 'Malad East', 'Malad West'].map((area) => (
                    <span
                      key={area}
                      className="px-3 py-1 bg-white rounded-full text-sm font-medium text-blue-700"
                    >
                      {area}
                    </span>
                  ))}
                </div>
              </div>
              <div className="lg:text-right">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 text-green-800 rounded-lg text-sm font-medium">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  Accepting Orders
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold mb-4">
            Ready to keep your work moving?
          </h2>
          <p className="text-gray-400 mb-8 max-w-2xl mx-auto">
            Join contractors and workers who trust Fastget for urgent site materials. 
            No app download required.
          </p>
          <Link
            href="/catalog"
            className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors text-lg"
          >
            Start Ordering
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>
    </div>
  );
}
