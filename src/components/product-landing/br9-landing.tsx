"use client";

import { useEffect, useRef } from "react";
import { Cormorant_Garamond, Jost } from "next/font/google";
import { formatVND } from "@/lib/currency";
import { getPricing } from "@/lib/pricing";

// Bespoke landing page for exactly one product (today: "sanarey-br9") — see
// the branch in ./page.tsx. Ported from a hand-designed reference file the
// user supplied, same integration pattern as aria/activa/simetra-landing.tsx:
// page-chrome photography is static under public/product-landing/br9/,
// price/salePrice/cv wired to the real Product row. The reference file had
// a real Zalo deep-link + phone number for direct ordering (a genuinely
// different, non-placeholder CTA from the other three pages) — the user
// explicitly chose to drop that in favor of matching the established
// login-gated + "checkout not wired yet" placeholder-button convention, so
// this component has no live external contact info. Font sizes were bumped
// ~20-25% across the board per explicit user request ("chưa tối ưu về
// chữ"), applied up front this time rather than after the fact.
const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-cormorant",
  display: "swap",
});

const jost = Jost({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  variable: "--font-jost",
  display: "swap",
});

const IMG = {
  heroMat: "/product-landing/br9/hero-mat.png",
  rolledMat: "/product-landing/br9/rolled-mat.png",
  patternAngle: "/product-landing/br9/pattern-angle.png",
  lifestyleDay: "/product-landing/br9/lifestyle-day.jpg",
  lifestyleNight: "/product-landing/br9/lifestyle-night.jpg",
};

export type Br9LandingProduct = {
  id: string;
  price: number;
  salePrice: number | null;
  cv: number;
};

function SunMark({ size = 26 }: { size?: number }) {
  return (
    <span className="sun" style={{ "--s": `${size}px` } as React.CSSProperties}>
      <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <g fill="none" stroke="currentColor" strokeWidth={3.4} strokeLinecap="round">
          <circle cx={50} cy={50} r={15} fill="currentColor" stroke="none" />
          <circle cx={50} cy={50} r={15} />
          <g>
            <line x1={50} y1={4} x2={50} y2={20} />
            <line x1={50} y1={80} x2={50} y2={96} />
            <line x1={4} y1={50} x2={20} y2={50} />
            <line x1={80} y1={50} x2={96} y2={50} />
            <line x1={17} y1={17} x2={28} y2={28} />
            <line x1={72} y1={72} x2={83} y2={83} />
            <line x1={83} y1={17} x2={72} y2={28} />
            <line x1={28} y1={72} x2={17} y2={83} />
            <line x1={34} y1={7} x2={39} y2={22} />
            <line x1={61} y1={78} x2={66} y2={93} />
            <line x1={66} y1={7} x2={61} y2={22} />
            <line x1={39} y1={78} x2={34} y2={93} />
            <line x1={7} y1={34} x2={22} y2={39} />
            <line x1={78} y1={61} x2={93} y2={66} />
            <line x1={7} y1={66} x2={22} y2={61} />
            <line x1={78} y1={39} x2={93} y2={34} />
          </g>
        </g>
      </svg>
    </span>
  );
}

function PriceBlock({ product }: { product: Br9LandingProduct }) {
  const pricing = getPricing(product);
  return (
    <>
      <div className="price">{pricing.forSale ? formatVND(pricing.chargeAmount) : "Liên hệ để biết giá"}</div>
      <div className="price-usd">
        {pricing.forSale && pricing.originalPrice && <span>{formatVND(pricing.originalPrice)} · </span>}
        CV {product.cv}
      </div>
    </>
  );
}

export function Br9LandingPage({ product }: { product: Br9LandingProduct }) {
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );
    document.querySelectorAll(".br9-landing-page .reveal").forEach((el) => io.observe(el));

    function onScroll() {
      if (!navRef.current) return;
      if (window.scrollY > 40) {
        navRef.current.classList.add("solid");
      } else {
        navRef.current.classList.remove("solid");
      }
    }
    window.addEventListener("scroll", onScroll);
    return () => {
      io.disconnect();
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return (
    <div className={`br9-landing-page ${cormorant.variable} ${jost.variable}`}>
      <style>{BR9_LANDING_CSS}</style>

      <nav className="nav" ref={navRef}>
        <div className="brand">
          <SunMark size={26} /> SANAREY
        </div>
        <a href="#order" className="cta-sm">
          Đặt hàng
        </a>
      </nav>

      <header className="hero">
        <div className="lattice"></div>
        <div className="wrap hero-inner">
          <div className="hero-copy">
            <div className="eyebrow">Sanarey · BR-9</div>
            <h1>
              Một khoảng lặng
              <br />
              để cơ thể <em>tự cân bằng</em>
            </h1>
            <p className="lead">
              Tấm thảm thư giãn toàn thân thế hệ mới — nơi bạn nằm xuống, buông ra và để một ngày dài trôi đi. Thiết
              kế liền mạch, vật liệu tuyển chọn, hình học tĩnh tại.
            </p>
            <div className="hero-actions">
              <a href="#order" className="btn btn-gold">
                Sở hữu BR-9
              </a>
              <a href="#story" className="btn btn-ghost">
                Tìm hiểu thêm
              </a>
            </div>
          </div>
          <div className="hero-media">
            <div className="halo"></div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={IMG.heroMat} alt="Tấm thảm Sanarey BR-9" />
          </div>
        </div>
        <div className="scroll-hint">
          <span className="line"></span>Cuộn xuống
        </div>
      </header>

      <section className="thesis pad" id="story">
        <div className="wrap">
          <div className="reveal">
            <p className="big">
              Sanarey không thêm gì vào cơ thể bạn. Nó chỉ tạo ra một <span>không gian tĩnh</span> — để bạn nghỉ
              ngơi trọn vẹn, và để cơ thể làm phần việc quen thuộc của nó.
            </p>
          </div>
          <div className="flow reveal">
            <span className="node">Nghỉ ngơi</span>
            <span className="arrow">→</span>
            <span className="node">Thư giãn</span>
            <span className="arrow">→</span>
            <span className="node">Hồi phục</span>
          </div>
        </div>
      </section>

      <section className="materials pad">
        <div className="wrap mat-grid">
          <div className="mat-visual reveal">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={IMG.rolledMat} alt="Bề mặt thảm Sanarey với hoa văn hình học" />
          </div>
          <div className="reveal">
            <div className="kicker">
              <span className="rule"></span>
              <span className="eyebrow">Vật liệu &amp; chế tác</span>
            </div>
            <h2 className="section-title">
              Một tấm liền,
              <br />
              <em>không đường nối</em>
            </h2>
            <p className="section-sub">
              BR-9 là một bề mặt phủ toàn thân duy nhất, thay cho kiểu ghép mảnh của các thế hệ trước. Lớp PU cao
              cấp được nung kết cùng một ma trận khoáng — bốn thành phần được chọn cho độ bền, cảm giác chạm và vẻ
              đẹp của bề mặt.
            </p>
            <ul className="mineral">
              <li>
                <span className="sym">C</span>
                <div>
                  <div className="m-name">Carbon</div>
                  <div className="m-desc">Nền tảng ổn định cấu trúc, giữ form tấm thảm bền theo thời gian.</div>
                </div>
              </li>
              <li>
                <span className="sym">Ag</span>
                <div>
                  <div className="m-name">Bạc</div>
                  <div className="m-desc">Hỗ trợ giữ bề mặt sạch, hạn chế vi khuẩn phát sinh khi dùng lâu dài.</div>
                </div>
              </li>
              <li>
                <span className="sym">Cu</span>
                <div>
                  <div className="m-name">Đồng</div>
                  <div className="m-desc">Thành phần dẫn, phân bố đều trên toàn bộ bề mặt tiếp xúc.</div>
                </div>
              </li>
              <li>
                <span className="sym">Qz</span>
                <div>
                  <div className="m-name">Thạch anh trong</div>
                  <div className="m-desc">Điểm nhấn của ma trận khoáng, hoàn thiện kết cấu đồng nhất.</div>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </section>

      <section className="geo pad">
        <div className="wrap geo-grid rev">
          <div className="reveal">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={IMG.patternAngle} alt="Hoa văn hình học của thảm Sanarey BR-9" />
          </div>
          <div className="reveal">
            <div className="kicker">
              <span className="rule"></span>
              <span className="eyebrow">Hình học · Form &amp; Function</span>
            </div>
            <h2 className="section-title">
              Hoa văn không
              <br />
              chỉ để <em>nhìn</em>
            </h2>
            <p className="section-sub">
              Từng đường vàng trên bề mặt được dựng theo một lưới hình học lặp đều — dẫn mắt, dẫn nhịp thở, và tạo
              cảm giác trật tự, tĩnh tại ngay khi bạn đặt mình xuống. Đây là chữ ký thiết kế của Sanarey: đẹp một
              cách có chủ đích.
            </p>
            <div className="spec-row">
              <div className="spec">
                <div className="n">1</div>
                <div className="l">Tấm liền toàn thân</div>
              </div>
              <div className="spec">
                <div className="n">4</div>
                <div className="l">Thành phần khoáng</div>
              </div>
              <div className="spec">
                <div className="n">9</div>
                <div className="l">Thế hệ BR</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="life pad">
        <div className="wrap">
          <div className="life-hero reveal">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={IMG.lifestyleDay} alt="Người dùng thư giãn cùng thảm Sanarey trên giường" />
            <div className="cap">
              <h3>Đặt xuống. Nằm lên. Thở ra.</h3>
            </div>
          </div>
          <div className="kicker center reveal">
            <span className="rule"></span>
            <span className="eyebrow">Trong đời sống mỗi ngày</span>
            <span className="rule"></span>
          </div>
          <h2 className="section-title center reveal">
            BR-9 hợp với <em>nhịp sống của bạn</em>
          </h2>
          <div className="uses" style={{ marginTop: "50px" }}>
            <div className="use reveal">
              <svg className="u-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                <path d="M3 12h4l2-7 4 14 2-7h6" />
              </svg>
              <h4>Trước giờ ngủ</h4>
              <p>
                Trải lên giường, dành vài phút tĩnh lặng trước khi chìm vào giấc — một nghi thức nhẹ nhàng khép lại
                ngày dài.
              </p>
            </div>
            <div className="use reveal">
              <svg className="u-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                <circle cx={12} cy={8} r={4} />
                <path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
              </svg>
              <h4>Thiền &amp; hít thở</h4>
              <p>Bề mặt liền và hoa văn đối xứng tạo một điểm tựa thị giác dễ chịu cho các buổi thiền, yoga hay giãn cơ.</p>
            </div>
            <div className="use reveal">
              <svg className="u-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                <rect x={3} y={4} width={18} height={14} rx={2} />
                <path d="M3 20h18" />
              </svg>
              <h4>Khi làm việc lâu</h4>
              <p>Đặt lên ghế trong những giờ ngồi dài, giữ tư thế thoải mái và một khoảng nghỉ cho cơ thể giữa việc.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="ritual pad">
        <div className="wrap center">
          <div className="kicker center reveal">
            <span className="rule"></span>
            <span className="eyebrow">Nghi thức tĩnh tại</span>
            <span className="rule"></span>
          </div>
          <h2 className="section-title reveal">Ba phút, mỗi ngày</h2>
          <p className="section-sub reveal">Không cần cắm điện. Không cần thao tác. Chỉ cần đặt mình xuống.</p>
          <div className="rit-grid">
            <div className="rit reveal">
              <div className="r-num">i</div>
              <h4>Trải ra</h4>
              <p>Mở tấm thảm lên giường, sàn hoặc ghế — bất cứ nơi nào bạn muốn nghỉ.</p>
            </div>
            <div className="rit reveal">
              <div className="r-num">ii</div>
              <h4>Nằm xuống</h4>
              <p>Buông vai, thả lỏng lưng, để trọng lượng cơ thể chìm vào bề mặt.</p>
            </div>
            <div className="rit reveal">
              <div className="r-num">iii</div>
              <h4>Buông ra</h4>
              <p>Hít vào chậm, thở ra dài. Để phần còn lại diễn ra tự nhiên.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="pack pad">
        <div className="wrap pack-grid">
          <div className="reveal">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={IMG.lifestyleNight} alt="Thảm Sanarey BR-9 cuộn gọn trong hộp quà" />
          </div>
          <div className="reveal">
            <div className="kicker">
              <span className="rule"></span>
              <span className="eyebrow">Đóng gói</span>
            </div>
            <h2 className="section-title">
              Cuộn gọn,
              <br />
              <em>mang theo</em>
            </h2>
            <p className="section-sub">
              BR-9 cuộn lại gọn trong hộp trụ màu rừng, hoàn thiện họa tiết vàng — một món quà chăm sóc bản thân
              xứng đáng để trao đi, hoặc để dành cho chính mình.
            </p>
            <ul className="incl">
              <li>Tấm thảm Sanarey BR-9 (bản toàn thân)</li>
              <li>Hộp trụ đựng &amp; bảo quản</li>
              <li>Hướng dẫn sử dụng &amp; vệ sinh</li>
              <li>Tem chính hãng, bảo hành theo nhà phân phối</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="order pad" id="order">
        <div className="lattice"></div>
        <div className="wrap">
          <div className="order-card reveal">
            <div className="eyebrow">Sanarey BR-9</div>
            <PriceBlock product={product} />
            {/* Checkout chưa được nối — nút này tạm thời chỉ mang tính hiển
                thị cho tới khi luồng đặt hàng cho Product được quyết định. */}
            <a href="#order" className="btn btn-gold" onClick={(e) => e.preventDefault()}>
              Đặt hàng ngay
            </a>
            <div className="guarantee">
              <span>
                <i>✓</i> Hàng chính hãng, có tem
              </span>
              <span>
                <i>✓</i> Tư vấn 1-1 trước khi mua
              </span>
              <span>
                <i>✓</i> Giao toàn quốc
              </span>
            </div>
          </div>
        </div>
      </section>

      <footer>
        <div className="wrap">
          <div className="foot-top">
            <div className="foot-brand">
              <SunMark size={24} /> SANAREY
            </div>
            <div className="foot-links">
              <a href="#story">Câu chuyện</a>
              <a href="#order">Đặt hàng</a>
            </div>
          </div>
          <p className="disclaimer">
            <b>Lưu ý:</b> Sanarey BR-9 là sản phẩm chăm sóc &amp; thư giãn cho đời sống thường ngày, không phải
            thiết bị y tế và không nhằm mục đích chẩn đoán, điều trị hay phòng ngừa bất kỳ bệnh lý nào. Các mô tả
            trên trang phản ánh trải nghiệm sử dụng, không phải chỉ định y khoa. Nếu bạn có vấn đề sức khỏe, vui
            lòng tham khảo ý kiến bác sĩ. © Sanarey.
          </p>
        </div>
      </footer>
    </div>
  );
}

// Scoped under .br9-landing-page, same reasoning as the other
// product-landing components' own CSS constants. Font sizes here are
// already ~20-25% larger than the reference file's raw px values (per
// explicit user request), unlike aria/activa/simetra where the bump was
// applied as a separate later pass.
const BR9_LANDING_CSS = `
.br9-landing-page{
  --ink:#12160D;
  --ink-2:#1B2114;
  --moss:#2A3320;
  --moss-line:#3C4A2C;
  --sage:#AEB693;
  --sage-soft:#C3C9AC;
  --gold:#C6A15A;
  --gold-soft:#E4CE97;
  --cream:#F1ECDD;
  --cream-dim:#CFCBB9;
  --maxw:1180px;
}
.br9-landing-page{
  background:var(--ink);
  color:var(--cream);
  font-family:var(--font-jost),sans-serif;
  font-weight:300;
  line-height:1.7;
  letter-spacing:.2px;
  overflow-x:hidden;
  position:relative;
  -webkit-font-smoothing:antialiased;
}
.br9-landing-page h1,.br9-landing-page h2,.br9-landing-page h3,.br9-landing-page .display{font-family:var(--font-cormorant),serif;font-weight:500;line-height:1.08;letter-spacing:.3px}
.br9-landing-page .wrap{max-width:var(--maxw);margin:0 auto;padding:0 28px}
.br9-landing-page .eyebrow{
  font-family:var(--font-jost),sans-serif;font-weight:400;
  text-transform:uppercase;letter-spacing:4.5px;font-size:14px;
  color:var(--gold);
}
.br9-landing-page a{color:inherit;text-decoration:none}
.br9-landing-page img{display:block;max-width:100%}

.br9-landing-page .sun{display:inline-block;position:relative;width:var(--s,34px);height:var(--s,34px)}
.br9-landing-page .sun svg{width:100%;height:100%;display:block}

.br9-landing-page .lattice{position:absolute;inset:0;z-index:0;opacity:.16;pointer-events:none;
  background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120'><g fill='none' stroke='%23C6A15A' stroke-width='.8'><circle cx='60' cy='60' r='42'/><path d='M18 18 L102 102 M102 18 L18 102 M60 6 L60 114 M6 60 L114 60'/><circle cx='60' cy='60' r='20'/><rect x='18' y='18' width='84' height='84'/></g></svg>");
  background-size:120px 120px;
}

.br9-landing-page .nav{position:sticky;top:0;left:0;right:0;z-index:50;
  display:flex;align-items:center;justify-content:space-between;
  padding:18px 28px;
  background:linear-gradient(to bottom, rgba(18,22,13,.92), rgba(18,22,13,0));
  transition:background .3s ease, padding .3s ease;
}
.br9-landing-page .nav.solid{background:rgba(18,22,13,.96);padding:12px 28px;border-bottom:1px solid rgba(198,161,90,.18)}
.br9-landing-page .nav .brand{display:flex;align-items:center;gap:11px;font-family:var(--font-cormorant),serif;font-size:26px;letter-spacing:3px;color:var(--gold-soft)}
.br9-landing-page .nav .cta-sm{font-family:var(--font-jost);font-weight:400;font-size:16px;letter-spacing:1.5px;text-transform:uppercase;
  border:1px solid var(--gold);color:var(--gold-soft);padding:9px 20px;border-radius:2px;transition:.25s}
.br9-landing-page .nav .cta-sm:hover{background:var(--gold);color:var(--ink)}

.br9-landing-page .hero{position:relative;min-height:100vh;display:flex;align-items:center;
  background:
    radial-gradient(120% 90% at 72% 42%, rgba(58,74,44,.55), transparent 60%),
    radial-gradient(90% 70% at 20% 20%, rgba(30,38,22,.6), transparent 70%),
    var(--ink);
  overflow:hidden}
.br9-landing-page .hero .lattice{opacity:.10;animation:br9-drift 40s linear infinite}
@keyframes br9-rise{from{opacity:0;transform:translateY(26px)}to{opacity:1;transform:none}}
@keyframes br9-fade{from{opacity:0}to{opacity:1}}
@keyframes br9-drift{from{background-position:0 0}to{background-position:120px 120px}}
.br9-landing-page .hero-inner{position:relative;z-index:2;display:grid;grid-template-columns:1.05fr .95fr;gap:40px;align-items:center;width:100%}
.br9-landing-page .hero-copy .eyebrow{opacity:0;animation:br9-rise .9s ease .2s forwards}
.br9-landing-page .hero-copy h1{font-size:clamp(55px,7.7vw,106px);color:var(--cream);margin:18px 0 22px;opacity:0;animation:br9-rise 1s ease .35s forwards}
.br9-landing-page .hero-copy h1 em{font-style:italic;color:var(--gold-soft)}
.br9-landing-page .hero-copy p.lead{font-size:22px;max-width:460px;color:var(--cream-dim);opacity:0;animation:br9-rise 1s ease .55s forwards}
.br9-landing-page .hero-actions{margin-top:34px;display:flex;gap:16px;flex-wrap:wrap;opacity:0;animation:br9-rise 1s ease .75s forwards}
.br9-landing-page .btn{font-family:var(--font-jost);font-weight:400;letter-spacing:1.5px;text-transform:uppercase;font-size:16px;
  padding:15px 30px;border-radius:2px;transition:.25s;cursor:pointer;border:1px solid transparent;display:inline-flex;align-items:center;gap:9px}
.br9-landing-page .btn-gold{background:var(--gold);color:var(--ink)}
.br9-landing-page .btn-gold:hover{background:var(--gold-soft);transform:translateY(-2px)}
.br9-landing-page .btn-ghost{border-color:rgba(240,236,221,.35);color:var(--cream)}
.br9-landing-page .btn-ghost:hover{border-color:var(--gold);color:var(--gold-soft)}
.br9-landing-page .hero-media{position:relative;opacity:0;animation:br9-fade 1.3s ease .5s forwards}
.br9-landing-page .hero-media img{border-radius:6px;box-shadow:0 40px 90px -30px rgba(0,0,0,.9);transform:perspective(1400px) rotateY(-6deg)}
.br9-landing-page .hero-media .halo{position:absolute;inset:-8% -12%;z-index:-1;
  background:radial-gradient(closest-side, rgba(198,161,90,.28), transparent 72%);filter:blur(8px)}
.br9-landing-page .scroll-hint{position:absolute;bottom:26px;left:50%;transform:translateX(-50%);z-index:2;
  font-size:13px;letter-spacing:2.5px;text-transform:uppercase;color:var(--cream-dim);opacity:.7;
  display:flex;flex-direction:column;align-items:center;gap:8px}
.br9-landing-page .scroll-hint .line{width:1px;height:34px;background:linear-gradient(var(--gold),transparent);animation:br9-pulse 2.4s ease infinite}
@keyframes br9-pulse{0%,100%{opacity:.3}50%{opacity:1}}

.br9-landing-page .reveal{opacity:0;transform:translateY(28px);transition:opacity .9s ease, transform .9s ease}
.br9-landing-page .reveal.in{opacity:1;transform:none}

.br9-landing-page section{position:relative}
.br9-landing-page .pad{padding:110px 0}
.br9-landing-page .center{text-align:center}
.br9-landing-page .kicker{display:flex;align-items:center;gap:14px;margin-bottom:22px}
.br9-landing-page .kicker.center{justify-content:center}
.br9-landing-page .kicker .rule{height:1px;width:46px;background:var(--gold);opacity:.6}
.br9-landing-page h2.section-title{font-size:clamp(41px,5.3vw,67px);color:var(--cream);margin-bottom:20px}
.br9-landing-page h2.section-title em{font-style:italic;color:var(--gold-soft)}
.br9-landing-page .section-sub{max-width:620px;color:var(--cream-dim);font-size:20px}
.br9-landing-page .center .section-sub{margin-left:auto;margin-right:auto}

.br9-landing-page .thesis{background:linear-gradient(var(--ink-2),var(--ink))}
.br9-landing-page .thesis .big{font-size:clamp(34px,4.3vw,55px);line-height:1.3;color:var(--cream);max-width:900px;margin:0 auto;text-align:center;font-family:var(--font-cormorant),serif;font-weight:400}
.br9-landing-page .thesis .big span{color:var(--gold-soft);font-style:italic}
.br9-landing-page .flow{display:flex;justify-content:center;align-items:center;gap:22px;margin-top:46px;flex-wrap:wrap}
.br9-landing-page .flow .node{font-family:var(--font-cormorant),serif;font-size:29px;color:var(--sage-soft);letter-spacing:2px}
.br9-landing-page .flow .arrow{color:var(--gold);font-size:22px}

.br9-landing-page .materials{background:var(--ink)}
.br9-landing-page .mat-grid{display:grid;grid-template-columns:.9fr 1.1fr;gap:60px;align-items:center}
.br9-landing-page .mat-visual{position:relative}
.br9-landing-page .mat-visual img{border-radius:6px;box-shadow:0 30px 70px -30px rgba(0,0,0,.85)}
.br9-landing-page .mineral{list-style:none;margin-top:8px;padding:0}
.br9-landing-page .mineral li{display:flex;gap:18px;padding:20px 0;border-top:1px solid var(--moss-line)}
.br9-landing-page .mineral li:last-child{border-bottom:1px solid var(--moss-line)}
.br9-landing-page .mineral .sym{font-family:var(--font-cormorant),serif;font-size:36px;color:var(--gold-soft);min-width:56px;line-height:1}
.br9-landing-page .mineral .m-name{font-family:var(--font-jost);font-weight:400;letter-spacing:1px;color:var(--cream);font-size:18px;text-transform:uppercase}
.br9-landing-page .mineral .m-desc{color:var(--cream-dim);font-size:18px;margin-top:3px}

.br9-landing-page .geo{background:linear-gradient(var(--ink),var(--moss) 140%)}
.br9-landing-page .geo-grid{display:grid;grid-template-columns:1.1fr .9fr;gap:60px;align-items:center}
.br9-landing-page .geo-grid.rev{direction:rtl}
.br9-landing-page .geo-grid.rev>*{direction:ltr}
.br9-landing-page .geo-grid img{border-radius:6px;box-shadow:0 30px 70px -30px rgba(0,0,0,.85)}
.br9-landing-page .spec-row{display:flex;gap:34px;margin-top:34px;flex-wrap:wrap}
.br9-landing-page .spec-row .spec .n{font-family:var(--font-cormorant),serif;font-size:48px;color:var(--gold-soft);line-height:1}
.br9-landing-page .spec-row .spec .l{font-size:16px;letter-spacing:1.5px;text-transform:uppercase;color:var(--cream-dim);margin-top:6px}

.br9-landing-page .life{background:var(--ink)}
.br9-landing-page .life-hero{position:relative;border-radius:8px;overflow:hidden;margin-bottom:56px}
.br9-landing-page .life-hero img{width:100%;height:min(60vh,520px);object-fit:cover}
.br9-landing-page .life-hero .cap{position:absolute;left:36px;bottom:30px;z-index:2}
.br9-landing-page .life-hero .cap h3{font-size:clamp(34px,4.1vw,53px);color:#fff;text-shadow:0 2px 20px rgba(0,0,0,.6)}
.br9-landing-page .life-hero::after{content:"";position:absolute;inset:0;background:linear-gradient(to top,rgba(12,16,9,.75),transparent 55%)}
.br9-landing-page .uses{display:grid;grid-template-columns:repeat(3,1fr);gap:26px}
.br9-landing-page .use{padding:30px 26px;border:1px solid var(--moss-line);border-radius:5px;background:rgba(42,51,32,.28);transition:.3s}
.br9-landing-page .use:hover{border-color:var(--gold);transform:translateY(-4px);background:rgba(42,51,32,.5)}
.br9-landing-page .use .u-ico{width:34px;height:34px;margin-bottom:16px;color:var(--gold-soft)}
.br9-landing-page .use h4{font-family:var(--font-cormorant),serif;font-size:29px;color:var(--cream);margin-bottom:8px;font-weight:600}
.br9-landing-page .use p{color:var(--cream-dim);font-size:18px}

.br9-landing-page .ritual{background:linear-gradient(var(--moss),var(--ink))}
.br9-landing-page .rit-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:30px;margin-top:50px}
.br9-landing-page .rit{text-align:center;padding:14px}
.br9-landing-page .rit .r-num{font-family:var(--font-cormorant),serif;font-style:italic;font-size:26px;color:var(--gold);opacity:.7}
.br9-landing-page .rit h4{font-family:var(--font-cormorant),serif;font-size:31px;color:var(--cream);margin:8px 0 10px}
.br9-landing-page .rit p{color:var(--cream-dim);font-size:18px}

.br9-landing-page .pack{background:var(--ink)}
.br9-landing-page .pack-grid{display:grid;grid-template-columns:1fr 1fr;gap:60px;align-items:center}
.br9-landing-page .pack-grid img{border-radius:6px;box-shadow:0 30px 80px -30px rgba(0,0,0,.9)}
.br9-landing-page .incl{list-style:none;margin-top:28px;padding:0}
.br9-landing-page .incl li{display:flex;gap:12px;padding:11px 0;color:var(--cream-dim);font-size:19px;align-items:baseline}
.br9-landing-page .incl li::before{content:"—";color:var(--gold)}

.br9-landing-page .order{background:radial-gradient(90% 120% at 50% 0%, rgba(58,74,44,.5), var(--ink) 65%)}
.br9-landing-page .order .lattice{opacity:.08}
.br9-landing-page .order-card{position:relative;z-index:2;max-width:720px;margin:0 auto;text-align:center;
  border:1px solid rgba(198,161,90,.3);border-radius:10px;padding:56px 44px;background:rgba(18,22,13,.6);-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px)}
.br9-landing-page .price{font-family:var(--font-cormorant),serif;font-size:56px;color:var(--gold-soft);line-height:1;margin:14px 0 4px}
.br9-landing-page .price-usd{color:var(--cream-dim);font-size:18px;letter-spacing:1px}
.br9-landing-page .order .btn-gold{margin-top:30px;font-size:18px;padding:18px 42px}
.br9-landing-page .guarantee{margin-top:26px;display:flex;gap:26px;justify-content:center;flex-wrap:wrap;font-size:16px;color:var(--cream-dim);letter-spacing:.5px}
.br9-landing-page .guarantee span{display:flex;align-items:center;gap:7px}
.br9-landing-page .guarantee i{color:var(--gold);font-style:normal}

.br9-landing-page footer{background:var(--ink-2);border-top:1px solid var(--moss-line);padding:52px 0 40px}
.br9-landing-page .foot-top{display:flex;justify-content:space-between;align-items:center;gap:30px;flex-wrap:wrap;margin-bottom:30px}
.br9-landing-page .foot-brand{display:flex;align-items:center;gap:12px;font-family:var(--font-cormorant),serif;font-size:31px;letter-spacing:3px;color:var(--gold-soft)}
.br9-landing-page .foot-links{display:flex;gap:28px;font-size:17px;color:var(--cream-dim)}
.br9-landing-page .foot-links a:hover{color:var(--gold-soft)}
.br9-landing-page .disclaimer{font-size:14px;line-height:1.7;color:#6f745f;max-width:900px;border-top:1px solid var(--moss-line);padding-top:22px}
.br9-landing-page .disclaimer b{color:#8b9074;font-weight:400}

@media(max-width:900px){
  .br9-landing-page .hero-inner,.br9-landing-page .mat-grid,.br9-landing-page .geo-grid,.br9-landing-page .pack-grid{grid-template-columns:1fr;gap:40px}
  .br9-landing-page .geo-grid.rev{direction:ltr}
  .br9-landing-page .hero-media{order:-1}
  .br9-landing-page .uses,.br9-landing-page .rit-grid{grid-template-columns:1fr}
  .br9-landing-page .hero-copy h1{font-size:53px}
  .br9-landing-page .pad{padding:78px 0}
  .br9-landing-page .nav .brand{font-size:23px}
  .br9-landing-page .order-card{padding:40px 24px}
  .br9-landing-page .price{font-size:46px}
}
@media(prefers-reduced-motion:reduce){
  .br9-landing-page *{animation:none!important;transition:none!important}
  .br9-landing-page .reveal{opacity:1;transform:none}
}
`;
