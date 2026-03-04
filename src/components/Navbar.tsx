export default function Navbar() {
  return (
    <header className="flex flex-col md:flex-row justify-between items-center px-4 sm:px-8 md:px-12 py-4 md:py-6 bg-white w-full overflow-x-hidden">
      <h1 className="text-xl md:text-3xl font-bold">GrowMore</h1>
      <nav className="flex flex-col sm:flex-row gap-4 md:gap-8 mt-4 md:mt-0">
        <a href="/" className="hover:text-primary transition-colors">Home</a>
        <a href="/plants" className="hover:text-primary transition-colors">Plants</a>
      </nav>
    </header>
  );
}