import Image from "next/image";
import Link from "next/link";

export default function Body() {
  return (
    <main className="bg-[#f3ecdf] text-[#171512] overflow-hidden">
      <section
        className="
          relative mx-auto max-w-[1600px]
          min-h-[calc(100vh-88px)]
          px-5 sm:px-8 md:px-10 lg:px-14
          flex flex-col lg:flex-row
          items-center
        "
      >
        {/* TEXT */}
        <div
          className="
            relative z-10
            w-full lg:w-[42%]
            pt-14 pb-8
            sm:pt-16
            lg:py-20
          "
        >
          <p className="mb-5 text-[10px] sm:text-[11px] uppercase tracking-[0.3em] text-black/55">
            Mr Holmes Run Club
          </p>

          <h1
            className="
              text-[clamp(3.8rem,8vw,8rem)]
              leading-[0.82]
              tracking-[-0.055em]
              font-medium
            "
          >
            RUN
            <br />
            WITH US.
          </h1>

          <div className="mt-8 sm:mt-10 max-w-[390px]">
            <p className="text-[14px] sm:text-[15px] leading-7 text-black/60">
              More than a run. A community built around movement,
              connection and the road ahead.
            </p>

            <Link
              href="/register"
              className="
                group mt-8
                inline-flex items-center gap-4
                text-[11px] sm:text-xs
                uppercase tracking-[0.18em]
              "
            >
              <span className="border-b border-black pb-1">
                Register Now
              </span>

              <span className="transition-transform duration-300 group-hover:translate-x-1">
                →
              </span>
            </Link>
          </div>
        </div>

        {/* IMAGE */}
        <div
          className="
            relative
            w-full lg:w-[58%]
            h-[380px]
            sm:h-[480px]
            lg:h-[650px]
            xl:h-[720px]
          "
        >
          <Image
            src="/images/home/runner.png"
            alt="Mr Holmes Run Club"
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 58vw"
            className="object-contain object-center"
          />
        </div>

        {/* Bottom detail */}
        <div className="hidden lg:flex absolute bottom-8 left-14 right-14 items-center justify-between">
          <span className="text-[9px] uppercase tracking-[0.25em] text-black/40">
            Run • Connect • Repeat
          </span>

        </div>
      </section>
    </main>
  );
}