import Image from "next/image";
import Link from "next/link";

export default function Navbar() {
  return (
    <header className="w-full bg-[#f3ecdf]">
      <nav
        className="
          mx-auto flex h-[72px] max-w-[1600px]
          items-center justify-between
          px-4 sm:px-6
          md:h-[88px] md:px-10
          lg:px-14
        "
      >
        {/* Logo */}
        <Link
          href="/"
          aria-label="Mr Holmes Home"
          className="
            relative block shrink-0 overflow-hidden
            h-[38px] w-[112px]
            sm:h-[42px] sm:w-[130px]
            md:h-[45px] md:w-[150px]
          "
        >
          <Image
            src="/images/mr-holmes-logo.png"
            alt="Mr Holmes"
            fill
            priority
            sizes="(max-width: 640px) 112px, (max-width: 768px) 130px, 150px"
            className="scale-[2.6] object-contain"
          />
        </Link>

        {/* Navigation */}
        <div className="flex items-center gap-5 sm:gap-7 md:gap-12">

          <Link
            href="/"
            className="
              hidden sm:block
              text-[13px] md:text-[14px]
              tracking-[0.02em]
              text-black
              transition-opacity duration-300
              hover:opacity-50
            "
          >
            Home
          </Link>

          <Link
            href="/register"
            className="
              whitespace-nowrap
              border border-black/80
              px-3.5 py-2
              sm:px-4 sm:py-2
              md:px-5 md:py-2.5
              text-[10px] sm:text-[11px] md:text-[12px]
              tracking-[0.08em]
              text-black
              transition-all duration-300
              hover:bg-black
              hover:text-[#f3ecdf]
            "
          >
            JOIN THE RUN
          </Link>

        </div>
      </nav>
    </header>
  );
}