function Header() {
  return (
    <header className="sticky top-0 z-50 backdrop-blur bg-white/90 border-b-4 border-gray-800 shadow-pixel">
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-3 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <a href="https://ulpan.co.il" className="inline-block" aria-label="Ulpan Bayit home" target="_blank" rel="noopener noreferrer">
            <img
              src="https://ulpan.co.il/wp-content/uploads/logo-full-320.png"
              alt="Ulpan Bayit logo"
              className="h-8 w-auto"
            />
          </a>
        </div>

        {/* Navigation */}
        <nav className="flex items-center gap-6 text-sm">
          <a
            href="https://ulpan.co.il#programs"
            className="text-gray-800 hover:text-purple-600 font-bold transition-colors"
            target="_blank"
            rel="noopener noreferrer"
          >
            Courses
          </a>
          <a
            href="https://ulpan.co.il#contact"
            className="bg-purple-500 hover:bg-purple-600 text-white font-bold px-6 py-2 border-4 border-purple-700 shadow-pixel-sm active:translate-y-1 active:shadow-none transition-all"
            target="_blank"
            rel="noopener noreferrer"
          >
            Contact Us
          </a>
        </nav>
      </div>
    </header>
  );
}

export default Header;
