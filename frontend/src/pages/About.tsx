import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { useState } from "react";

export default function About() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white border-b-2 border-green-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between gap-3">
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <img
                src="/chitti-naidu-logo.png"
                alt="Chitti Naidu Pulao logo"
                className="h-14 w-14 rounded-full bg-white object-cover ring-2 ring-yellow-300 lg:h-16 lg:w-16"
              />
              <div className="min-w-0">
                <h1 className="responsive-brand-title">చిట్టి నాయుడు పులావ్</h1>
                <p className="responsive-brand-subtitle text-yellow-600">Authentic Village Taste</p>
              </div>
            </div>

            <div className="hidden lg:flex items-center gap-8">
              <Link href="/" className="text-gray-700 hover:text-green-700 font-medium transition">
                Home
              </Link>
              <Link href="/about" className="text-green-700 font-bold border-b-2 border-green-700">
                About
              </Link>
              <Link href="/menu" className="text-gray-700 hover:text-green-700 font-medium transition">
                Menu
              </Link>
              <Link href="/track-order" className="text-gray-700 hover:text-green-700 font-medium transition">
                Track Order
              </Link>
              <Link href="/contact" className="text-gray-700 hover:text-green-700 font-medium transition">
                Contact
              </Link>
            </div>

            <div className="hidden lg:block">
              <Link href="/menu" asChild>
                <Button className="bg-yellow-500 hover:bg-yellow-600 text-gray-900 font-bold">
                  Order Now
                </Button>
              </Link>
            </div>

            <button
              type="button"
              aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
              aria-expanded={mobileMenuOpen}
              className="shrink-0 rounded-md p-2 hover:bg-green-50 lg:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-7 w-7 lg:h-8 lg:w-8" /> : <Menu className="h-7 w-7 lg:h-8 lg:w-8" />}
            </button>
          </div>

          {mobileMenuOpen && (
            <div className="space-y-1 border-t border-gray-200 py-4 lg:hidden">
              <Link href="/" className="block rounded-md px-3 py-2 text-gray-700 hover:bg-green-50 hover:text-green-700">
                Home
              </Link>
              <Link href="/about" className="block rounded-md px-3 py-2 font-bold text-green-700 hover:bg-green-50">
                About
              </Link>
              <Link href="/menu" className="block rounded-md px-3 py-2 text-gray-700 hover:bg-green-50 hover:text-green-700">
                Menu
              </Link>
              <Link href="/track-order" className="block rounded-md px-3 py-2 text-gray-700 hover:bg-green-50 hover:text-green-700">
                Track Order
              </Link>
              <Link href="/contact" className="block rounded-md px-3 py-2 text-gray-700 hover:bg-green-50 hover:text-green-700">
                Contact
              </Link>
              <Link href="/menu" asChild>
                <Button className="mt-3 w-full bg-yellow-500 font-bold text-gray-900 hover:bg-yellow-600">
                  Order Now
                </Button>
              </Link>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-10 sm:py-14 lg:py-16 bg-gradient-to-r from-green-600 to-green-700">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h1 className="responsive-page-title text-white mb-3 sm:mb-4">Our Story</h1>
          <p className="text-base text-green-100 sm:text-xl">
            A passion for authentic South Indian cuisine, served with love and tradition
          </p>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-10 sm:py-14 lg:py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4">
          {/* Story Section 1 */}
          <div className="mb-12">
            <h2 className="responsive-section-title text-green-700 mb-5 sm:mb-6">Our Heritage</h2>
            <div className="grid gap-6 md:grid-cols-2 md:gap-8 items-center">
              <div>
                <p className="text-base text-gray-700 mb-4 leading-relaxed sm:text-lg">
                  Chitti Naidu Pulao is more than just a restaurant—it's a celebration of authentic South Indian village cuisine. Our journey began with a simple belief: that traditional recipes, when prepared with love and the finest ingredients, can transport you to the heart of a South Indian village.
                </p>
                <p className="text-base text-gray-700 mb-4 leading-relaxed sm:text-lg">
                  Every pulao we serve is a testament to generations of culinary wisdom. We honor the traditional methods of cooking, using slow-cooked techniques that bring out the true essence of spices and flavors.
                </p>
              </div>
              <div className="rounded-lg overflow-hidden shadow-lg">
                <img
                  src="/restaurant_vibe.png"
                  alt="Our Restaurant"
                  className="h-64 w-full object-cover sm:h-80"
                />
              </div>
            </div>
          </div>

          {/* Story Section 2 */}
          <div className="mb-12">
            <h2 className="responsive-section-title text-green-700 mb-5 sm:mb-6">Our Passion</h2>
            <div className="grid gap-6 md:grid-cols-2 md:gap-8 items-center">
              <div className="rounded-lg overflow-hidden shadow-lg">
                <img
                  src="/pulao_leaf.png"
                  alt="Our Food"
                  className="h-64 w-full object-cover sm:h-80"
                />
              </div>
              <div>
                <p className="text-base text-gray-700 mb-4 leading-relaxed sm:text-lg">
                  We believe that food is a language of love. Each grain of rice, each piece of meat, each spice is carefully selected and prepared to create an unforgettable dining experience. Our commitment to quality is unwavering.
                </p>
                <p className="text-base text-gray-700 mb-4 leading-relaxed sm:text-lg">
                  What makes us special is our dedication to authenticity. We don't compromise on quality or taste. Every order is prepared fresh, ensuring that you get the most aromatic and flavorful pulao every single time.
                </p>
                <p className="text-base text-gray-700 leading-relaxed sm:text-lg">
                  Our pulao is served on traditional banana leaves (vistaraku), just as it's done in South Indian villages. This isn't just a serving style—it's a connection to our roots and a promise of authenticity.
                </p>
              </div>
            </div>
          </div>

          {/* Why Choose Us */}
          <div className="bg-green-50 rounded-lg p-5 sm:p-8 mb-12">
            <h2 className="responsive-section-title text-green-700 mb-6 text-center sm:mb-8">Why Choose Chitti Naidu Pulao?</h2>
            <div className="grid gap-6 md:grid-cols-2 md:gap-8">
              <div>
                <h3 className="text-xl font-bold text-green-700 mb-3 flex items-center gap-2">
                  <span className="text-2xl">🌾</span> Authentic Recipes
                </h3>
                <p className="text-gray-700">
                  Traditional South Indian recipes prepared exactly as they should be, with no shortcuts or compromises.
                </p>
              </div>
              <div>
                <h3 className="text-xl font-bold text-green-700 mb-3 flex items-center gap-2">
                  <span className="text-2xl">✨</span> Fresh Ingredients
                </h3>
                <p className="text-gray-700">
                  We source the finest, freshest ingredients daily to ensure every pulao is prepared with the best quality.
                </p>
              </div>
              <div>
                <h3 className="text-xl font-bold text-green-700 mb-3 flex items-center gap-2">
                  <span className="text-2xl">🔥</span> Slow Cooked Perfection
                </h3>
                <p className="text-gray-700">
                  Our pulao is slow-cooked using traditional methods that bring out the true essence of every spice and ingredient.
                </p>
              </div>
              <div>
                <h3 className="text-xl font-bold text-green-700 mb-3 flex items-center gap-2">
                  <span className="text-2xl">💚</span> Made with Love
                </h3>
                <p className="text-gray-700">
                  Every pulao is prepared with passion and care, ensuring that you taste the love in every bite.
                </p>
              </div>
            </div>
          </div>

          {/* Our Commitment */}
          <div className="text-center mb-12">
            <h2 className="responsive-section-title text-green-700 mb-5 sm:mb-6">Our Commitment to You</h2>
            <p className="text-base text-gray-700 mb-4 leading-relaxed sm:text-lg">
              We are committed to serving you the most authentic, delicious, and fresh South Indian pulao. Every order is prepared on-demand, ensuring that you always get the freshest food possible.
            </p>
            <p className="text-base text-gray-700 leading-relaxed sm:text-lg">
              Your satisfaction is our priority. We believe in quality over quantity, and we're proud to serve customers who appreciate authentic, traditional cuisine.
            </p>
          </div>

          {/* CTA */}
          <div className="text-center">
            <Link href="/menu" asChild>
              <Button className="w-full rounded-lg bg-yellow-500 px-8 py-6 text-base font-bold text-gray-900 shadow-lg transition hover:bg-yellow-600 sm:w-auto sm:text-lg">
                Explore Our Menu
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-10 sm:py-12">
        <div className="max-w-6xl mx-auto px-4">
            <div className="grid gap-8 mb-8 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <h3 className="text-xl font-bold text-yellow-500 mb-4">Chitti Naidu Pulao</h3>
              <p className="text-gray-400">
                Authentic South Indian village cuisine, prepared with love and tradition.
              </p>
            </div>

            <div>
              <h4 className="text-lg font-bold text-yellow-500 mb-4">Quick Links</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/" className="hover:text-yellow-500 transition">Home</Link></li>
                <li><Link href="/about" className="hover:text-yellow-500 transition">About</Link></li>
                <li><Link href="/menu" className="hover:text-yellow-500 transition">Menu</Link></li>
                <li><Link href="/track-order" className="hover:text-yellow-500 transition">Track Order</Link></li>
                <li><Link href="/contact" className="hover:text-yellow-500 transition">Contact</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="text-lg font-bold text-yellow-500 mb-4">Contact</h4>
              <p className="text-gray-400 mb-2">Phone: +91 8008800467</p>
              <p className="text-gray-400 mb-2">Email: info@chittinaidu.com</p>
              <p className="text-gray-400">Pickup Only</p>
            </div>

            <div>
              <h4 className="text-lg font-bold text-yellow-500 mb-4">Hours</h4>
              <p className="text-gray-400 mb-2">Mon - Sun</p>
              <p className="text-gray-400">11:00 AM - 9:00 PM</p>
              <p className="text-gray-400 text-sm mt-2">Closed on Holidays</p>
            </div>
          </div>

          <div className="border-t border-gray-700 pt-8 text-center text-gray-400">
            <p>&copy; 2026 Chitti Naidu Pulao. All rights reserved. | Pickup from Store Only</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
