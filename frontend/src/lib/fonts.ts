import { Baloo_2, Be_Vietnam_Pro } from 'next/font/google';

// Display font for headings, buttons, and brand wordmark
export const baloo2 = Baloo_2({
  subsets: ['latin', 'vietnamese'],
  weight: ['500', '600', '700'],
  variable: '--font-baloo',
});

// Body font for everything else
export const beVietnamPro = Be_Vietnam_Pro({
  subsets: ['latin', 'vietnamese'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-be-vietnam',
});
