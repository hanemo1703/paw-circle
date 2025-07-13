import { Roboto } from 'next/font/google';

export const roboto = Roboto({
  subsets: ['latin', 'vietnamese'],
  weight: ['400', '500', '700', '900'],
  variable: '--font-roboto',
});
