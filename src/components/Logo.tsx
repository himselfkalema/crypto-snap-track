import logo from '@/assets/bitbite-logo.jpg.asset.json';

export function Logo({ className = 'h-8 w-8', alt = 'BitBite logo' }: { className?: string; alt?: string }) {
  return (
    <img
      src={logo.url}
      alt={alt}
      className={`${className} rounded-lg object-cover ring-1 ring-border/40`}
      loading="eager"
      decoding="async"
    />
  );
}
