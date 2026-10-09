import Image from 'next/image';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

/**
 * Header for the auth screens (login, signup, password reset, email
 * verification). Pair with a form panel carrying the `auth-panel` class.
 *
 * Phones: a plain white header - brand mark + title, no photo, no back
 * button (the system/browser Back does that). Inside the app shell the title
 * is hidden too, since the native top bar already shows it.
 * Desktop: the photo panel beside the form.
 */
export function AuthHero({ title }: { title: string }) {
  return (
    <>
      {/* native-title-dup: in the app the native top bar shows the title, and
          the form should start right under it */}
      <div className="native-title-dup md:hidden bg-white px-6 pt-8 pb-1">
        <div className="relative w-12 h-12 mb-4">
          <Image src="/fastget-logo-clear.png" alt="FastGet" fill sizes="48px" className="object-contain" priority />
        </div>
        <h1 className="text-2xl font-black text-brand-charcoal tracking-tight">{title}</h1>
      </div>

      <div className="hidden md:block relative md:min-h-[560px] md:w-[45%] flex-shrink-0">
        <Image
          src="/construction-background.jpg"
          alt=""
          fill
          priority
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-black/5" />
        <Link
          href="/"
          className="absolute top-6 left-6 z-10 w-9 h-9 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center hover:bg-black/40 transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-white" />
        </Link>
        <h1 className="absolute bottom-10 left-10 text-4xl font-black text-white tracking-tight">{title}</h1>
      </div>
    </>
  );
}
