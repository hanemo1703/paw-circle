import { useState } from 'react';
import { CheckCircle2, Mail, MapPin, MessageCircle, Phone } from 'lucide-react';
import styles from './index.module.scss';

const TOPICS = ['Hỗ trợ kỹ thuật', 'Góp ý sản phẩm', 'Báo cáo vi phạm', 'Khác'];

const CONTACT_ITEMS = [
  { icon: Mail, iconClass: 'iconEmail', label: 'Email', value: 'hello@pawcircle.vn' },
  { icon: Phone, iconClass: 'iconHotline', label: 'Hotline', value: '1900 8686 (8:00 – 21:00)' },
  { icon: MapPin, iconClass: 'iconOffice', label: 'Văn phòng', value: 'Quận 7, TP. Hồ Chí Minh' },
  { icon: MessageCircle, iconClass: 'iconSocial', label: 'Mạng xã hội', value: 'Facebook · Zalo · Instagram' },
];

function isValidEmail(value: string): boolean {
  return /^\S+@\S+\.\S+$/.test(value);
}

export default function ContactPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [topic, setTopic] = useState(TOPICS[0]);
  const [message, setMessage] = useState('');
  const [showError, setShowError] = useState(false);
  const [sent, setSent] = useState(false);

  function handleSubmit() {
    if (!name.trim() || !isValidEmail(email) || !message.trim()) {
      setShowError(true);
      return;
    }
    setShowError(false);
    setSent(true);
  }

  function handleReset() {
    setName('');
    setEmail('');
    setTopic(TOPICS[0]);
    setMessage('');
    setShowError(false);
    setSent(false);
  }

  return (
    <div className={`container ${styles.wrapper}`}>
      <div className={styles.header}>
        <h1 className={styles.title}>Liên hệ với chúng tôi</h1>
        <p className={styles.subtitle}>Có câu hỏi, góp ý hay cần hỗ trợ? Gửi tin nhắn cho chúng tôi bên dưới.</p>
      </div>

      <div className={styles.layout}>
        <div className={styles.infoColumn}>
          {CONTACT_ITEMS.map(({ icon: Icon, iconClass, label, value }) => (
            <div key={label} className={styles.contactItem}>
              <div className={`${styles.contactIcon} ${styles[iconClass]}`}>
                <Icon size={18} />
              </div>
              <div>
                <div className={styles.contactLabel}>{label}</div>
                <div className={styles.contactValue}>{value}</div>
              </div>
            </div>
          ))}
        </div>

        {sent ? (
          <div className={`${styles.card} ${styles.successCard}`}>
            <div className={styles.successIcon}>
              <CheckCircle2 size={28} />
            </div>
            <div className={styles.successTitle}>Đã gửi tin nhắn!</div>
            <p className={styles.successDesc}>Chúng tôi sẽ phản hồi qua email trong vòng 24 giờ.</p>
            <button type="button" className="btn btn-outline" onClick={handleReset}>
              Gửi tin nhắn khác
            </button>
          </div>
        ) : (
          <div className={styles.card}>
            <div className={styles.fieldRow}>
              <div className={styles.field}>
                <label htmlFor="name">
                  Họ tên<span className={styles.requiredMark}>*</span>
                </label>
                <input
                  id="name"
                  placeholder="Nguyễn Văn A"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={showError && !name.trim() ? styles.inputError : ''}
                />
              </div>
              <div className={styles.field}>
                <label htmlFor="email">
                  Email<span className={styles.requiredMark}>*</span>
                </label>
                <input
                  id="email"
                  placeholder="ban@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={showError && !isValidEmail(email) ? styles.inputError : ''}
                />
              </div>
            </div>
            <div className={styles.field}>
              <label htmlFor="topic">Chủ đề</label>
              <select id="topic" value={topic} onChange={(e) => setTopic(e.target.value)}>
                {TOPICS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.field}>
              <label htmlFor="message">
                Nội dung<span className={styles.requiredMark}>*</span>
              </label>
              <textarea
                id="message"
                rows={5}
                placeholder="Bạn cần chúng tôi giúp gì?"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className={showError && !message.trim() ? styles.inputError : ''}
              />
            </div>
            {showError && (
              <div className={styles.errorBanner}>
                Vui lòng điền đầy đủ họ tên, email hợp lệ và nội dung.
              </div>
            )}
            <button type="button" className={`btn btn-primary ${styles.submitBtn}`} onClick={handleSubmit}>
              Gửi tin nhắn
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
