import Link from 'next/link';
import { Phone, MapPin, Mail } from 'lucide-react';

export function Footer() {
  return (
    <footer className="bg-gray-900 text-white py-12 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-3 gap-8">
          <div>
            <h3 className="text-lg font-semibold mb-4">Fastget</h3>
            <p className="text-gray-400 text-sm">
              Urgent building materials delivered to your site in 30-60 minutes.
              Serving Andheri, Goregaon, and Malad.
            </p>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/catalog" className="text-gray-400 hover:text-white text-sm">
                  Browse Products
                </Link>
              </li>
              <li>
                <Link href="/order" className="text-gray-400 hover:text-white text-sm">
                  Track Your Order
                </Link>
              </li>
              <li>
                <Link href="/cart" className="text-gray-400 hover:text-white text-sm">
                  Shopping Cart
                </Link>
              </li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-4">Contact</h3>
            <ul className="space-y-2">
              <li className="flex items-center gap-2 text-gray-400 text-sm">
                <Phone className="w-4 h-4" />
                <span>Support: Coming Soon</span>
              </li>
              <li className="flex items-center gap-2 text-gray-400 text-sm">
                <MapPin className="w-4 h-4" />
                <span>Mumbai, Maharashtra</span>
              </li>
              <li className="flex items-center gap-2 text-gray-400 text-sm">
                <Mail className="w-4 h-4" />
                <span>support@fastget.in</span>
              </li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-500 text-sm">
          © {new Date().getFullYear()} Fastget. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
