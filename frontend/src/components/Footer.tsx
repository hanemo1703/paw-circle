import Image from 'next/image';
import Link from 'next/link';
import { NAV_ITEMS } from '../lib/nav';
import styles from './Footer.module.scss';

const FOOTER_LINKS = [...NAV_ITEMS, { href: '/about', label: 'Về chúng tôi' }, { href: '/contact', label: 'Liên hệ' }];

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={`container ${styles.inner}`}>
        <Link href="/" className={styles.brand}>
          <Image src="/logo.jpg" alt="PawCircle" width={34} height={34} className={styles.brandLogo} />
          <span>PawCircle</span>
        </Link>
        <nav className={styles.links}>
          {FOOTER_LINKS.map((item) => (
            <Link key={item.href} href={item.href} className={styles.link}>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className={styles.copyright}>
          © {new Date().getFullYear()} PawCircle. Mỗi bé đều xứng đáng có một mái nhà.
        </div>
      </div>
    </footer>
  );
}
