import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Menu, X, Phone, MapPin, Clock } from "lucide-react";
import { getActiveOffers, type Offer } from "@/lib/offers";

export default function Home() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [isOffersLoading, setIsOffersLoading] = useState(true);
  const [offersError, setOffersError] = useState("");

  const scrollToOrderSection = () => {
    document.getElementById("order-now")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  useEffect(() => {
    let isMounted = true;

    getActiveOffers()
      .then((nextOffers) => {
        if (!isMounted) return;
        setOffers(nextOffers);
        setOffersError("");
      })
      .catch((error) => {
        if (!isMounted) return;
        console.error(error);
        setOffersError(error instanceof Error ? error.message : "Unable to load offers");
      })
      .finally(() => {
        if (isMounted) setIsOffersLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="min-h-screen bg-amber-50">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-amber-50 border-b-4 border-amber-900 shadow-lg" style={{ backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 2px, rgba(180,83,9,0.05) 2px, rgba(180,83,9,0.05) 4px)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between gap-3">
            {/* Logo */}
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <img
                src="/chitti-naidu-logo.png"
                alt="Chitti Naidu Pulao logo"
                className="h-14 w-14 rounded-full bg-white object-cover ring-2 ring-yellow-300 lg:h-16 lg:w-16"
              />
              <div className="min-w-0">
                <h1 className="responsive-brand-title">చిట్టి నాయుడు పులావ్</h1>
                <p className="responsive-brand-subtitle text-amber-700">🏘️ Authentic Village Taste</p>
              </div>
            </div>

            {/* Desktop Menu */}
            <div className="hidden lg:flex items-center gap-8">
              <Link href="/" className="text-amber-900 hover:text-amber-700 font-medium transition">
                Home
              </Link>
              <Link href="/menu" className="text-amber-900 hover:text-amber-700 font-medium transition">
                Menu
              </Link>
              <Link href="/cart" className="text-amber-900 hover:text-amber-700 font-medium transition">
                Cart
              </Link>
              <Link href="/checkout" className="text-amber-900 hover:text-amber-700 font-medium transition">
                Checkout
              </Link>
              <Link href="/track-order" className="text-amber-900 hover:text-amber-700 font-medium transition">
                Track Order
              </Link>
            </div>

            {/* CTA Button */}
            <div className="hidden lg:block">
              <Link href="/menu" asChild>
                <Button className="bg-amber-600 hover:bg-amber-700 text-white font-bold">
                  Order Now
                </Button>
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <button
              type="button"
              aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
              aria-expanded={mobileMenuOpen}
              className="shrink-0 rounded-md p-2 text-amber-900 hover:bg-amber-100 lg:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-7 w-7 lg:h-8 lg:w-8" /> : <Menu className="h-7 w-7 lg:h-8 lg:w-8" />}
            </button>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="space-y-1 border-t border-amber-200 py-4 lg:hidden">
              <Link href="/" className="block rounded-md px-3 py-2 text-amber-900 hover:bg-amber-100 hover:text-amber-700">
                Home
              </Link>
              <Link href="/menu" className="block rounded-md px-3 py-2 text-amber-900 hover:bg-amber-100 hover:text-amber-700">
                Menu
              </Link>
              <Link href="/cart" className="block rounded-md px-3 py-2 text-amber-900 hover:bg-amber-100 hover:text-amber-700">
                Cart
              </Link>
              <Link href="/checkout" className="block rounded-md px-3 py-2 text-amber-900 hover:bg-amber-100 hover:text-amber-700">
                Checkout
              </Link>
              <Link href="/track-order" className="block rounded-md px-3 py-2 text-amber-900 hover:bg-amber-100 hover:text-amber-700">
                Track Order
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
      <section className="relative aspect-[16/9] min-h-[210px] max-h-[min(760px,calc(100svh-4rem))] overflow-hidden bg-[#1c2609] sm:min-h-[360px] lg:min-h-[520px]">
        <img
          src="/chitti-naidu-hero-bagara-chicken-no-cta-text.png"
          alt="Chitti Naidu Pulao village-style hero with kunda biryani and pulao on banana leaf"
          className="pointer-events-none absolute -top-[7.4%] left-0 z-0 h-[107.4%] w-full object-cover object-[42%_center] sm:object-center"
        />
        <Button
          type="button"
          onClick={scrollToOrderSection}
          className="pointer-events-auto absolute bottom-[15%] left-1/2 z-30 min-h-8 max-w-[72%] -translate-x-1/2 rounded-md bg-yellow-500 px-3 py-1.5 text-[0.68rem] font-bold lowercase leading-tight text-gray-900 shadow-lg transition hover:bg-yellow-600 active:scale-95 sm:bottom-[17%] sm:min-h-10 sm:max-w-none sm:px-5 sm:py-3 sm:text-base"
        >
          our restaurant to your platle
        </Button>
      </section>

      {(isOffersLoading || offersError || offers.length > 0) && (
        <section className="bg-white py-10 sm:py-14">
          <div className="mx-auto max-w-6xl px-4">
            <h2 className="responsive-section-title mb-6 text-center text-green-700 sm:mb-8">Today&apos;s Offers</h2>
            {isOffersLoading ? (
              <div className="rounded-lg border border-green-100 bg-green-50 px-4 py-8 text-center text-gray-600">
                Loading offers...
              </div>
            ) : offersError ? (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-6 text-center text-sm font-semibold text-red-700">
                {offersError}
              </div>
            ) : (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {offers.map((offer) => (
                  <article key={offer.id} className="overflow-hidden rounded-lg border border-green-100 bg-green-50 shadow-sm">
                    {offer.imageUrl && (
                      <img src={offer.imageUrl} alt={offer.title} className="aspect-[16/10] w-full object-cover" />
                    )}
                    <div className="p-5">
                      <p className="mb-2 inline-flex rounded-full bg-yellow-500 px-3 py-1 text-sm font-bold text-gray-900">
                        {offer.discountText}
                      </p>
                      <h3 className="mb-2 text-xl font-bold text-green-700">{offer.title}</h3>
                      <p className="text-sm text-gray-600">{offer.description}</p>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Gallery Section */}
      <section className="py-10 sm:py-14 lg:py-16 bg-gradient-to-b from-amber-50 to-green-50">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="responsive-section-title text-center text-amber-900 mb-8 sm:mb-12">Our Signature Dishes & Ambiance</h2>
          <div className="grid gap-5 sm:gap-8 md:grid-cols-2 items-center">
            {/* Pulao Image */}
            <div className="rounded-lg overflow-hidden shadow-xl transform hover:scale-105 transition">
              <img 
                src="/bagara-rice-chicken-fry.png"
                alt="White bagara rice on banana leaf topped with one crispy chicken fry piece" 
                className="aspect-[4/3] w-full object-cover sm:aspect-[16/11]"
              />
            </div>

            {/* Restaurant Image */}
            <div className="rounded-lg overflow-hidden shadow-xl transform hover:scale-105 transition">
              <img 
                src="/restaurant_vibe.png" 
                alt="Traditional Restaurant Ambiance" 
                className="aspect-[4/3] w-full object-cover sm:aspect-[16/11]"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-10 sm:py-14 lg:py-16 bg-white">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {/* Feature 1 */}
            <div className="text-center">
              <div className="text-5xl mb-4">🌾</div>
              <h3 className="text-2xl font-bold text-green-700 mb-2">Authentic Recipes</h3>
              <p className="text-gray-600">
                Traditional South Indian recipes passed down through generations, prepared with love and care.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="text-center">
              <div className="text-5xl mb-4">✨</div>
              <h3 className="text-2xl font-bold text-green-700 mb-2">Fresh Ingredients</h3>
              <p className="text-gray-600">
                We use only the finest, freshest ingredients sourced locally to ensure quality in every bite.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="text-center">
              <div className="text-5xl mb-4">🏪</div>
              <h3 className="text-2xl font-bold text-green-700 mb-2">Pickup Only</h3>
              <p className="text-gray-600">
                Fresh pulao prepared on-demand. Order now and pick up from our store at your convenience.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Restaurant Info Section */}
      <section className="py-10 sm:py-14 lg:py-16 bg-white">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="responsive-section-title text-center text-green-700 mb-8 sm:mb-12">Visit Us</h2>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {/* Address */}
            <div className="flex flex-col items-center text-center">
              <MapPin className="text-yellow-500 mb-4" size={40} />
              <h3 className="text-xl font-bold text-gray-800 mb-2">Address</h3>
              <p className="text-gray-600">
                8HC6+P98, Sriram Nagar Colony<br />
                Balaji Colony Phase 2<br />
                B.N Reddy Nagar, Hyderabad<br />
                Telangana 500070
              </p>
            </div>

            {/* Phone */}
            <div className="flex flex-col items-center text-center">
              <Phone className="text-yellow-500 mb-4" size={40} />
              <h3 className="text-xl font-bold text-gray-800 mb-2">Contact</h3>
              <p className="text-gray-600 text-lg font-semibold">
                +91 8008800467
              </p>
              <p className="text-gray-500 text-sm mt-2">For bulk orders</p>
            </div>

            {/* Hours */}
            <div className="flex flex-col items-center text-center">
              <Clock className="text-yellow-500 mb-4" size={40} />
              <h3 className="text-xl font-bold text-gray-800 mb-2">Hours</h3>
              <p className="text-gray-600">
                Monday - Sunday<br />
                11:00 AM - 9:00 PM<br />
                <span className="text-sm text-yellow-600">Pickup Only</span>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section id="order-now" className="scroll-mt-20 py-10 sm:py-14 lg:py-16 bg-gradient-to-r from-green-700 to-green-600">
        <div className="max-w-4xl mx-auto text-center px-4">
          <h2 className="responsive-section-title text-white mb-4 sm:mb-6">Ready to Taste Authentic Pulao?</h2>
          <p className="text-base text-green-100 mb-6 sm:text-xl sm:mb-8">
            Order now and pick up fresh, aromatic pulao prepared just for you!
          </p>
          <Link href="/menu" asChild>
            <Button  className="w-full rounded-lg bg-yellow-500 px-8 py-6 text-base font-bold text-gray-900 shadow-lg transition hover:bg-yellow-600 sm:w-auto sm:text-lg">
              Order Now
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-10 sm:py-12">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid gap-8 mb-8 sm:grid-cols-2 lg:grid-cols-4">
            {/* About */}
            <div>
              <h3 className="text-xl font-bold text-yellow-500 mb-4">Chitti Naidu Pulao</h3>
              <p className="text-gray-400">
                Authentic South Indian village cuisine, prepared with love and tradition.
              </p>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="text-lg font-bold text-yellow-500 mb-4">Quick Links</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/" className="hover:text-yellow-500 transition">Home</Link></li>
                <li><Link href="/menu" className="hover:text-yellow-500 transition">Menu</Link></li>
                <li><Link href="/cart" className="hover:text-yellow-500 transition">Cart</Link></li>
                <li><Link href="/checkout" className="hover:text-yellow-500 transition">Checkout</Link></li>
                <li><Link href="/track-order" className="hover:text-yellow-500 transition">Track Order</Link></li>
              </ul>
            </div>

            {/* Contact */}
            <div>
              <h4 className="text-lg font-bold text-yellow-500 mb-4">Contact</h4>
              <p className="text-gray-400 mb-2">Phone: +91 8008800467</p>
              <p className="text-gray-400 mb-2">Email: info@chittinaidu.com</p>
              <p className="text-gray-400">Pickup Only</p>
            </div>

            {/* Hours */}
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
