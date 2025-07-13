import styles from './Footer.module.scss';

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className="container">
        © {new Date().getFullYear()} PawCircle — Kết nối cộng đồng yêu chó mèo.
      </div>
    </footer>
  );
}
