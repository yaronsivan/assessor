import { useState } from 'react';

function ContactModal({ isOpen, onClose }) {
  const [view, setView] = useState('options'); // 'options', 'form'
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    message: '',
    consent: false
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState('');

  if (!isOpen) return null;

  const handleWhatsApp = () => {
    const message = encodeURIComponent("I came from the level assessments page and I'd like to get more information");
    window.open(`https://wa.me/972555578088?text=${message}`, '_blank');
    onClose();
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();

    if (!formData.consent) {
      setSubmitError('Please consent to receive emails and marketing materials');
      return;
    }

    setIsSubmitting(true);
    setSubmitError('');

    try {
      const response = await fetch('https://hook.eu1.make.com/8xynd14g6qgte9sgole2rocaq3y5k3hm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        setSubmitSuccess(true);
        setTimeout(() => {
          onClose();
          // Reset form
          setFormData({ name: '', email: '', phone: '', message: '', consent: false });
          setSubmitSuccess(false);
          setView('options');
        }, 2000);
      } else {
        setSubmitError('Failed to send message. Please try again.');
      }
    } catch (error) {
      setSubmitError('Failed to send message. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-purple-100 border-8 border-purple-900 shadow-pixel-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-purple-600 border-b-8 border-purple-900 p-6 flex justify-between items-center">
          <h2 className="text-3xl font-bold text-white">Contact Us</h2>
          <button
            onClick={onClose}
            className="bg-red-500 hover:bg-red-600 text-white font-bold px-4 py-2 border-4 border-red-700 shadow-pixel-sm active:translate-y-1 active:shadow-none transition-all"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-8">
          {view === 'options' && (
            <div className="space-y-6">
              <p className="text-xl text-purple-900 text-center font-semibold mb-8">
                How would you like to reach us?
              </p>

              {/* WhatsApp Option */}
              <button
                onClick={handleWhatsApp}
                className="w-full bg-green-500 hover:bg-green-600 text-white text-xl font-bold px-8 py-6 border-4 border-green-700 shadow-pixel active:translate-y-1 active:shadow-pixel-sm transition-all"
              >
                💬 Send us a message on WhatsApp
              </button>

              {/* Message Form Option */}
              <button
                onClick={() => setView('form')}
                className="w-full bg-purple-500 hover:bg-purple-600 text-white text-xl font-bold px-8 py-6 border-4 border-purple-700 shadow-pixel active:translate-y-1 active:shadow-pixel-sm transition-all"
              >
                ✉️ Leave us a message
              </button>
            </div>
          )}

          {view === 'form' && (
            <div>
              {submitSuccess ? (
                <div className="bg-green-100 border-4 border-green-500 p-6 text-center">
                  <p className="text-2xl font-bold text-green-800">Message sent successfully!</p>
                  <p className="text-green-700 mt-2">We'll get back to you soon.</p>
                </div>
              ) : (
                <form onSubmit={handleFormSubmit} className="space-y-6">
                  {/* Back button */}
                  <button
                    type="button"
                    onClick={() => setView('options')}
                    className="text-purple-600 hover:text-purple-800 font-bold flex items-center gap-2"
                  >
                    ← Back to options
                  </button>

                  {/* Name */}
                  <div>
                    <label className="block text-purple-900 text-lg mb-2 font-semibold">
                      Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-3 text-lg border-4 border-purple-300 focus:border-purple-500 focus:outline-none shadow-pixel-sm"
                      placeholder="Your name"
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-purple-900 text-lg mb-2 font-semibold">
                      Email *
                    </label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-4 py-3 text-lg border-4 border-purple-300 focus:border-purple-500 focus:outline-none shadow-pixel-sm"
                      placeholder="your.email@example.com"
                    />
                  </div>

                  {/* Phone (optional) */}
                  <div>
                    <label className="block text-purple-900 text-lg mb-2 font-semibold">
                      Phone (optional)
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-4 py-3 text-lg border-4 border-purple-300 focus:border-purple-500 focus:outline-none shadow-pixel-sm"
                      placeholder="+972-XX-XXXXXXX"
                    />
                  </div>

                  {/* Message */}
                  <div>
                    <label className="block text-purple-900 text-lg mb-2 font-semibold">
                      Message * ({formData.message.length}/600)
                    </label>
                    <textarea
                      required
                      value={formData.message}
                      onChange={(e) => {
                        if (e.target.value.length <= 600) {
                          setFormData({ ...formData, message: e.target.value });
                        }
                      }}
                      className="w-full px-4 py-3 text-lg border-4 border-purple-300 focus:border-purple-500 focus:outline-none shadow-pixel-sm min-h-[150px]"
                      placeholder="Tell us how we can help you..."
                    />
                  </div>

                  {/* Consent */}
                  <div className="bg-purple-200/50 border-4 border-purple-300 p-4">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        required
                        checked={formData.consent}
                        onChange={(e) => setFormData({ ...formData, consent: e.target.checked })}
                        className="mt-1 w-5 h-5 border-4 border-purple-500"
                      />
                      <span className="text-purple-900 font-semibold">
                        I consent to receive emails and marketing materials from Ulpan Bayit *
                      </span>
                    </label>
                  </div>

                  {/* Error message */}
                  {submitError && (
                    <div className="bg-red-100 border-4 border-red-500 p-4 text-red-800 font-semibold">
                      {submitError}
                    </div>
                  )}

                  {/* Submit button */}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-purple-500 hover:bg-purple-600 disabled:bg-gray-400 text-white text-xl font-bold px-8 py-4 border-4 border-purple-700 disabled:border-gray-600 shadow-pixel active:translate-y-1 active:shadow-pixel-sm transition-all"
                  >
                    {isSubmitting ? 'Sending...' : 'Send Message'}
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ContactModal;
