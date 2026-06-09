import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Menu, X, Phone, Mail, MapPin, Clock } from "lucide-react";
import { toast } from "sonner";

export default function Contact() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.email || !formData.phone || !formData.subject || !formData.message) {
      toast.error("Please fill in all fields");
      return;
    }

    setIsSubmitting(true);
    
    // Simulate form submission
    setTimeout(() => {
      toast.success("Message sent successfully! We'll get back to you soon.");
      setFormData({
        name: "",
        email: "",
        phone: "",
        subject: "",
        message: "",
      });
      setIsSubmitting(false);
    }, 1000);
  };

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
              <Link href="/about" className="text-gray-700 hover:text-green-700 font-medium transition">
                About
              </Link>
              <Link href="/menu" className="text-gray-700 hover:text-green-700 font-medium transition">
                Menu
              </Link>
              <Link href="/track-order" className="text-gray-700 hover:text-green-700 font-medium transition">
                Track Order
              </Link>
              <Link href="/contact" className="text-green-700 font-bold border-b-2 border-green-700">
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
              <Link href="/about" className="block rounded-md px-3 py-2 text-gray-700 hover:bg-green-50 hover:text-green-700">
                About
              </Link>
              <Link href="/menu" className="block rounded-md px-3 py-2 text-gray-700 hover:bg-green-50 hover:text-green-700">
                Menu
              </Link>
              <Link href="/track-order" className="block rounded-md px-3 py-2 text-gray-700 hover:bg-green-50 hover:text-green-700">
                Track Order
              </Link>
              <Link href="/contact" className="block rounded-md px-3 py-2 font-bold text-green-700 hover:bg-green-50">
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
      <section className="py-10 sm:py-12 bg-gradient-to-r from-green-600 to-green-700">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h1 className="responsive-page-title text-white mb-2">Contact Us</h1>
          <p className="text-base text-green-100 sm:text-xl">
            We'd love to hear from you! Get in touch with us today.
          </p>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 py-10 sm:py-14 lg:py-16">
        <div className="grid gap-10 lg:grid-cols-2 lg:gap-12">
          {/* Contact Information */}
          <div>
            <h2 className="responsive-section-title text-green-700 mb-6 sm:mb-8">Get in Touch</h2>

            {/* Address */}
            <div className="mb-8">
              <div className="flex items-start gap-4">
                <MapPin className="text-yellow-500 flex-shrink-0 mt-1" size={24} />
                <div>
                  <h3 className="text-xl font-bold text-gray-800 mb-2">Address</h3>
                  <p className="text-gray-600 leading-relaxed">
                    8HC6+P98, Sriram Nagar Colony<br />
                    Balaji Colony Phase 2<br />
                    B.N Reddy Nagar<br />
                    Hyderabad, Telangana 500070<br />
                    India
                  </p>
                </div>
              </div>
            </div>

            {/* Phone */}
            <div className="mb-8">
              <div className="flex items-start gap-4">
                <Phone className="text-yellow-500 flex-shrink-0 mt-1" size={24} />
                <div>
                  <h3 className="text-xl font-bold text-gray-800 mb-2">Phone</h3>
                  <p className="text-gray-600 text-lg font-semibold">
                    +91 8008800467
                  </p>
                  <p className="text-gray-500 text-sm mt-1">For bulk orders and inquiries</p>
                </div>
              </div>
            </div>

            {/* Email */}
            <div className="mb-8">
              <div className="flex items-start gap-4">
                <Mail className="text-yellow-500 flex-shrink-0 mt-1" size={24} />
                <div>
                  <h3 className="text-xl font-bold text-gray-800 mb-2">Email</h3>
                  <p className="text-gray-600">
                    <a href="mailto:info@chittinaidu.com" className="hover:text-green-700 transition">
                      info@chittinaidu.com
                    </a>
                  </p>
                </div>
              </div>
            </div>

            {/* Hours */}
            <div className="mb-8">
              <div className="flex items-start gap-4">
                <Clock className="text-yellow-500 flex-shrink-0 mt-1" size={24} />
                <div>
                  <h3 className="text-xl font-bold text-gray-800 mb-2">Business Hours</h3>
                  <p className="text-gray-600">
                    Monday - Sunday<br />
                    11:00 AM - 9:00 PM<br />
                    <span className="text-yellow-600 font-semibold">Pickup from Store Only</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Social Media */}
            <div className="mt-12 pt-8 border-t-2 border-green-100">
              <h3 className="text-xl font-bold text-gray-800 mb-4">Follow Us</h3>
              <div className="flex flex-wrap gap-4">
                <a
                  href="https://www.instagram.com/chittinaidu_pulavs/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-full hover:shadow-lg transition transform hover:scale-110"
                  title="Instagram"
                >
                  📷
                </a>
                <a
                  href="https://www.zomato.com/hyderabad/chitti-naidu-pulav-vanasthalipuram"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center w-12 h-12 bg-red-500 text-white rounded-full hover:shadow-lg transition transform hover:scale-110"
                  title="Zomato"
                >
                  🍽️
                </a>
                <a
                  href="https://www.swiggy.com/city/hyderabad/chitti-naidu-pulav-vanasthalipuram-rest1143864"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center w-12 h-12 bg-orange-500 text-white rounded-full hover:shadow-lg transition transform hover:scale-110"
                  title="Swiggy"
                >
                  🛵
                </a>
                <a
                  href="https://maps.google.com/?q=8HC6+P98,+Sriram+Nagar+Colony,+Hyderabad"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center w-12 h-12 bg-blue-500 text-white rounded-full hover:shadow-lg transition transform hover:scale-110"
                  title="Google Maps"
                >
                  📍
                </a>
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <div>
            <div className="bg-green-50 rounded-lg p-5 sm:p-8">
              <h2 className="text-2xl font-bold text-green-700 mb-6">Send us a Message</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Name */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Your Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="Enter your name"
                    className="w-full px-4 py-2 border-2 border-green-200 rounded-lg focus:outline-none focus:border-green-500 transition"
                    required
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="Enter your email"
                    className="w-full px-4 py-2 border-2 border-green-200 rounded-lg focus:outline-none focus:border-green-500 transition"
                    required
                  />
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    placeholder="Enter your phone number"
                    className="w-full px-4 py-2 border-2 border-green-200 rounded-lg focus:outline-none focus:border-green-500 transition"
                    required
                  />
                </div>

                {/* Subject */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Subject *
                  </label>
                  <input
                    type="text"
                    name="subject"
                    value={formData.subject}
                    onChange={handleInputChange}
                    placeholder="What is this about?"
                    className="w-full px-4 py-2 border-2 border-green-200 rounded-lg focus:outline-none focus:border-green-500 transition"
                    required
                  />
                </div>

                {/* Message */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Message *
                  </label>
                  <textarea
                    name="message"
                    value={formData.message}
                    onChange={handleInputChange}
                    placeholder="Tell us more about your inquiry..."
                    rows={5}
                    className="w-full px-4 py-2 border-2 border-green-200 rounded-lg focus:outline-none focus:border-green-500 transition resize-none"
                    required
                  />
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-green-700 hover:bg-green-800 text-white font-bold py-3 rounded-lg transition transform hover:scale-105"
                >
                  {isSubmitting ? "Sending..." : "Send Message"}
                </Button>
              </form>

              <p className="text-xs text-gray-500 text-center mt-4">
                We'll get back to you as soon as possible!
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Map Section */}
      <section className="py-10 sm:py-12 bg-green-50">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="responsive-section-title text-green-700 mb-6 text-center sm:mb-8">Find Us on the Map</h2>
          <div className="h-72 overflow-hidden rounded-lg shadow-lg sm:h-96">
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3804.8947642944506!2d78.48826!3d17.3645!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3bcb93c6e6e6e6e7%3A0x1234567890abcdef!2s8HC6%2BP98%2C%20Sriram%20Nagar%20Colony%2C%20Balaji%20Nagar%2C%20Vanasthalipuram%2C%20Hyderabad%2C%20Telangana%20500070!5e0!3m2!1sen!2sin!4v1234567890"
              width="100%"
              height="100%"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
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
