"use client";

import { useEffect, useRef } from "react";
import { Fraunces, Be_Vietnam_Pro } from "next/font/google";
import { formatVND } from "@/lib/currency";
import { getPricing } from "@/lib/pricing";
import { ProductBuyButton } from "@/components/product-buy-button";

// Bespoke landing page for exactly one product (today: "sanarey-simetra") —
// see the branch in ./page.tsx. Ported verbatim (structure, copy, animation)
// from a hand-designed reference file the user supplied, same pattern as
// activa-landing.tsx: the page-chrome photography (hero plate glow, water
// band background, materials/uses photo cards, two colorway cutouts) is
// fixed static content under public/product-landing/simetra/, not
// per-product data, while price/salePrice/cv are wired to the real Product
// row so admin edits show up here.
const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-fraunces",
  display: "swap",
});

const beVietnamPro = Be_Vietnam_Pro({
  subsets: ["vietnamese", "latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-be-vietnam-pro",
  display: "swap",
});

const IMG = {
  waterBand: "/product-landing/simetra/water-band.jpg",
  plateGlow: "/product-landing/simetra/plate-glow.png",
  materials: "/product-landing/simetra/materials.jpg",
  uses: "/product-landing/simetra/uses.jpg",
  variantBlue: "/product-landing/simetra/variant-blue.png",
  variantGold: "/product-landing/simetra/variant-gold.png",
};

export type SimetraLandingProduct = {
  id: string;
  price: number;
  salePrice: number | null;
  cv: number;
};

function PriceBlock({ product, size }: { product: SimetraLandingProduct; size?: "lg" }) {
  const pricing = getPricing(product);
  return (
    <div className="price">
      <span className="amt" style={size === "lg" ? undefined : { fontSize: "1.6rem" }}>
        {pricing.forSale ? formatVND(pricing.chargeAmount) : "Liên hệ để biết giá"}
      </span>
      <span className="cur">
        {pricing.forSale && pricing.originalPrice && (
          <span className="price-original">{formatVND(pricing.originalPrice)} · </span>
        )}
        CV {product.cv}
      </span>
    </div>
  );
}

export function SimetraLandingPage({
  product,
  salesEnabled,
}: {
  product: SimetraLandingProduct;
  salesEnabled: boolean;
}) {
  const navRef = useRef<HTMLElement>(null);
  const pricing = getPricing(product);

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
      { threshold: 0.12 }
    );
    document.querySelectorAll(".simetra-landing-page .reveal").forEach((el) => io.observe(el));

    function onScroll() {
      if (!navRef.current) return;
      navRef.current.style.background =
        window.scrollY > 40
          ? "linear-gradient(180deg,rgba(10,13,20,.94),rgba(10,13,20,.75))"
          : "linear-gradient(180deg,rgba(10,13,20,.85),rgba(10,13,20,0))";
    }
    window.addEventListener("scroll", onScroll);
    return () => {
      io.disconnect();
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return (
    <div className={`simetra-landing-page ${fraunces.variable} ${beVietnamPro.variable}`}>
      <style>{SIMETRA_LANDING_CSS}</style>

      <div className="aura"></div>
      <div className="grain"></div>

      <nav ref={navRef}>
        <div className="brand">
          SANAREY <b>Simetra</b>
        </div>
        <div className="nav-links">
          <a href="#cong-nghe">Công nghệ</a>
          <a href="#loi-ich">Lợi ích</a>
          <a href="#cong-dung">Công dụng</a>
          <a href="#phien-ban">Phiên bản</a>
          <a href="#dat-hang" className="nav-cta">
            {pricing.forSale ? `Đặt hàng · ${formatVND(pricing.chargeAmount)}` : "Đặt hàng"}
          </a>
        </div>
      </nav>

      <header className="wrap hero">
        <div>
          <span className="eyebrow">Công nghệ cộng hưởng nước thế hệ mới</span>
          <h1>
            Tái cấu trúc nước — <em>vì sự sống</em>
          </h1>
          <p className="lede">
            SANAREY Simetra khôi phục sự hài hòa cấu trúc tự nhiên của nước, giúp nước hỗ trợ tốt hơn sức sống sinh
            học và sự cân bằng của môi trường quanh bạn.
          </p>
          <div className="hero-actions">
            <a href="#dat-hang" className="btn" onClick={(e) => e.preventDefault()}>
              Sở hữu Simetra <span aria-hidden="true">→</span>
            </a>
            <PriceBlock product={product} />
          </div>
        </div>
        <div className="stage" aria-hidden="true">
          <div className="ripples">
            <div className="rp c"></div>
            <div className="rp b"></div>
            <div className="rp a"></div>
            <div className="wave"></div>
            <div className="wave d2"></div>
            <div className="wave d3"></div>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="plate-glow" src={IMG.plateGlow} alt="Đĩa cộng hưởng nước SANAREY Simetra phát sáng" />
        </div>
      </header>

      <section className="section">
        <div className="wrap thesis reveal">
          <h2>
            Nước là <em>nền tảng của sự sống</em>
          </h2>
          <p>
            Từ các tế bào trong cơ thể đến cây trồng và thực phẩm ta ăn, nước mang trong mình bản thiết kế năng
            lượng của chính sự sống. Nhưng tác nhân môi trường và quá trình chế biến công nghiệp có thể phá vỡ sự
            hài hòa cấu trúc tự nhiên ấy — Simetra được tạo ra để khôi phục lại.
          </p>
        </div>
      </section>

      <div className="wrap">
        <div className="hr"></div>
      </div>

      <section className="section">
        <div className="wrap split">
          <div className="reveal">
            <span className="eyebrow">Ma trận tinh thể &amp; khoáng chất</span>
            <h2>
              Ba vật liệu, <em>một ma trận cộng hưởng</em>
            </h2>
            <p>
              Simetra được chế tạo với hỗn hợp ma trận đặc biệt, kết hợp qua Công nghệ Kết hợp Sanarey (SFT) để tạo
              ra một ma trận cộng hưởng mạnh mẽ tương tác với cấu trúc phân tử của nước.
            </p>
            <div className="mat-list">
              <div className="ml cu">
                <i></i>
                <b>Đồng</b>
                <span>— nổi tiếng với đặc tính dẫn điện và kháng khuẩn tự nhiên.</span>
              </div>
              <div className="ml qz">
                <i></i>
                <b>Thạch anh trong suốt</b>
                <span>— khuếch đại và ổn định các mô hình năng lượng.</span>
              </div>
              <div className="ml di">
                <i></i>
                <b>Kim cương</b>
                <span>— cấu trúc bền vững và độ trong suốt năng lượng vượt trội.</span>
              </div>
            </div>
          </div>
          <div className="mat-card reveal">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={IMG.materials} alt="Ma trận đồng, thạch anh và kim cương quanh đĩa Simetra" />
          </div>
        </div>
      </section>

      <section className="section" id="cong-nghe">
        <div className="wrap">
          <div className="tech-head reveal">
            <span className="eyebrow">Công nghệ hợp nhất SANAREY · SFT</span>
            <h2>Một quy trình kích hoạt cộng hưởng độc quyền</h2>
            <p>
              SFT tích hợp kỹ thuật vật liệu tiên tiến với các nguyên lý từ cộng hưởng lượng tử, hình học tự nhiên
              và khoa học dao động.
            </p>
          </div>
          <div className="sft">
            <div className="sc reveal">
              <div className="num">01</div>
              <h3>Chuẩn bị ma trận</h3>
              <p>Các khoáng chất và tinh thể được lựa chọn kỹ lưỡng, chuẩn bị thành một ma trận chuyên dụng.</p>
            </div>
            <div className="sc reveal">
              <div className="num">02</div>
              <h3>Hợp nhất &amp; kích hoạt</h3>
              <p>Các vật liệu trải qua một quy trình hợp nhất và kích hoạt độc quyền của SANAREY.</p>
            </div>
            <div className="sc reveal">
              <div className="num">03</div>
              <h3>Cấu trúc cộng hưởng</h3>
              <p>Cấu trúc hình thành có khả năng tương tác với nước và trường năng lượng xung quanh.</p>
            </div>
          </div>
          <p className="passive reveal">
            Một nền tảng cộng hưởng <b>thụ động nhưng mạnh mẽ</b> — hoạt động liên tục mà không cần điện, hóa chất
            hay can thiệp cơ học.
          </p>
        </div>
      </section>

      <section className="band">
        <div className="wrap">
          <div className="inner reveal">
            <span className="eyebrow">Sức mạnh của Simetra</span>
            <h2>
              Tái cấu trúc nguồn nước, <em>khôi phục sự sống</em>
            </h2>
            <ul className="blist">
              <li>Khôi phục các mô hình rung động tự nhiên của nước.</li>
              <li>Cải thiện sự tương tác giữa nước và các hệ thống sống.</li>
              <li>Tăng cường sự hài hòa năng lượng trong môi trường sống hàng ngày.</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="section" id="loi-ich">
        <div className="wrap">
          <div className="tech-head reveal">
            <span className="eyebrow">Những lợi ích</span>
            <h2>Cho sức khỏe &amp; môi trường</h2>
          </div>
          <div className="ben-grid">
            <div className="ben reveal">
              <div className="ic">💧</div>
              <h3>Nước &amp; năng lượng</h3>
              <ul>
                <li>Tái cấu trúc nước về trạng thái tạo ra sự sống</li>
                <li>Khôi phục hài hòa rung động tự nhiên</li>
                <li>Nâng cao chất lượng nước uống</li>
              </ul>
            </div>
            <div className="ben reveal">
              <div className="ic">✨</div>
              <h3>Sức khỏe &amp; sinh lực</h3>
              <ul>
                <li>Duy trì chức năng tế bào tối ưu</li>
                <li>Hỗ trợ giải độc tế bào</li>
                <li>Thúc đẩy năng lượng &amp; sức sống</li>
              </ul>
            </div>
            <div className="ben reveal">
              <div className="ic">🌱</div>
              <h3>Hấp thụ dinh dưỡng</h3>
              <ul>
                <li>Tăng khả năng hấp thụ dưỡng chất cho người, cây và động vật</li>
              </ul>
            </div>
            <div className="ben reveal">
              <div className="ic">🍎</div>
              <h3>Giữ thực phẩm tươi</h3>
              <ul>
                <li>Kéo dài độ tươi ngon của trái cây và rau quả</li>
              </ul>
            </div>
            <div className="ben reveal">
              <div className="ic">🌐</div>
              <h3>Hài hòa môi trường</h3>
              <ul>
                <li>Chuyển hóa bức xạ có hại thành năng lượng có lợi</li>
              </ul>
            </div>
            <div className="ben reveal">
              <div className="ic">🏡</div>
              <h3>Tiện lợi mỗi ngày</h3>
              <ul>
                <li>Dễ sử dụng trong cuộc sống hàng ngày tại nhà và văn phòng</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <div className="wrap">
        <div className="hr"></div>
      </div>

      <section className="section" id="cong-dung">
        <div className="wrap">
          <div className="uses-wrap">
            <div className="uses-img reveal">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={IMG.uses} alt="Đĩa Simetra dùng cùng ly nước hàng ngày" />
            </div>
            <div className="uses-copy reveal">
              <span className="eyebrow">Công dụng</span>
              <h2>Đặt gần nước, thực phẩm &amp; không gian</h2>
              <div className="place">
                <div className="pl">
                  <div className="g">🥤</div>
                  <h3>Nước uống</h3>
                  <p>Dưới bình, ly, máy lọc hoặc nước đóng chai.</p>
                </div>
                <div className="pl">
                  <div className="g">🧺</div>
                  <h3>Thực phẩm</h3>
                  <p>Trong giỏ trái cây, khay rau củ, tủ lạnh.</p>
                </div>
                <div className="pl">
                  <div className="g">🪴</div>
                  <h3>Cây trồng</h3>
                  <p>Cạnh chậu cây, nước tưới, hệ thủy canh.</p>
                </div>
                <div className="pl">
                  <div className="g">🐾</div>
                  <h3>Động vật</h3>
                  <p>Gần bát nước thú cưng, bể cá, nước gia súc.</p>
                </div>
              </div>
              <div className="rest">
                <b>10 phút</b>
                <span>
                  Để nước nghỉ khoảng 10 phút để cảm nhận chất lượng năng lượng — thời gian càng lâu, trạng thái
                  càng sâu sắc.
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="wrap">
        <div className="hr"></div>
      </div>

      <section className="section" id="phien-ban">
        <div className="wrap">
          <div className="tech-head reveal">
            <span className="eyebrow">Phiên bản</span>
            <h2>Hai sắc màu, một công nghệ</h2>
          </div>
          <div className="vgrid">
            <div className="vc reveal">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={IMG.variantBlue} alt="Simetra viền xanh dương" />
              <h3>Xanh dương</h3>
              <span>Viền silicone bền bỉ</span>
            </div>
            <div className="vc reveal">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={IMG.variantGold} alt="Simetra viền vàng" />
              <h3>Vàng</h3>
              <span>Viền silicone bền bỉ</span>
            </div>
          </div>
        </div>
      </section>

      <section className="section" style={{ paddingTop: "20px" }}>
        <div className="wrap">
          <div className="tech-head reveal">
            <span className="eyebrow">Tại sao lại là Simetra</span>
            <h2>Bước tiến hóa tiếp theo của công nghệ cộng hưởng</h2>
          </div>
          <div className="feat-row reveal">
            <div className="feat">
              <div className="fi">◈</div>
              <h3>Ma trận tinh thể tiên tiến</h3>
            </div>
            <div className="feat">
              <div className="fi">⬖</div>
              <h3>Đồng · Thạch anh · Kim cương</h3>
            </div>
            <div className="feat">
              <div className="fi">≋</div>
              <h3>Kích hoạt bằng SFT</h3>
            </div>
            <div className="feat">
              <div className="fi">✦</div>
              <h3>Tái cấu trúc nước mạnh mẽ</h3>
            </div>
          </div>
        </div>
      </section>

      <section className="section" id="dat-hang">
        <div className="wrap">
          <div className="final reveal">
            <span className="eyebrow">SANAREY Simetra</span>
            <h2>
              Mang sự hài hòa của nước <em>vào mỗi ngày</em>
            </h2>
            <p>
              Sang trọng, dễ sử dụng và được thiết kế cho cuộc sống hàng ngày — Simetra là phiên bản kế nhiệm được
              cải tiến từ các thế hệ đĩa cộng hưởng nước trước đây.
            </p>
            <div className="buy">
              <PriceBlock product={product} size="lg" />
              {salesEnabled && pricing.forSale ? (
                <ProductBuyButton
                  productId={product.id}
                  title="SANAREY Simetra"
                  price={pricing.chargeAmount}
                  originalPrice={pricing.originalPrice}
                  className="btn"
                >
                  Thêm vào giỏ hàng <span aria-hidden="true">→</span>
                </ProductBuyButton>
              ) : (
                <a href="#" className="btn" onClick={(e) => e.preventDefault()}>
                  Liên hệ để đặt hàng
                </a>
              )}
              <a href="#cong-nghe" className="btn ghost">
                Tìm hiểu công nghệ
              </a>
            </div>
          </div>
        </div>
      </section>

      <footer>
        <div className="wrap foot">
          <div>
            <span className="brand">
              SANAREY <b>Simetra</b>
            </span>
            <p>
              Công nghệ cộng hưởng nước thế hệ mới — tái cấu trúc và tăng cường năng lượng cho nước, hỗ trợ sự sống
              cho con người, thực vật, động vật và môi trường.
            </p>
          </div>
          <PriceBlock product={product} size="lg" />
        </div>
        <div className="wrap">
          <p className="disclaimer">
            Lưu ý: SANAREY Simetra là sản phẩm chăm sóc sức khỏe năng lượng, hướng đến việc hỗ trợ cân bằng và cảm
            giác khỏe khoắn. Sản phẩm không phải là thiết bị y tế hay thiết bị lọc/xử lý nước, và không nhằm mục
            đích chẩn đoán, điều trị, chữa khỏi hay ngăn ngừa bất kỳ bệnh nào, cũng không thay thế cho nguồn nước
            sạch hợp vệ sinh hay tư vấn y tế. Các mô tả về "cộng hưởng", "tái cấu trúc nước" và lợi ích liên quan
            phản ánh khái niệm của thương hiệu và chưa được các cơ quan y tế hay khoa học đánh giá, kiểm chứng.
          </p>
        </div>
      </footer>
    </div>
  );
}

// Scoped under .simetra-landing-page, same reasoning as
// aria-landing.tsx/activa-landing.tsx's own CSS constants.
const SIMETRA_LANDING_CSS = `
.simetra-landing-page{
  --obsidian:#0A0D14; --panel:#111726; --panel-2:#0E1420;
  --line:rgba(95,211,196,.20); --line-g:rgba(198,161,91,.20);
  --gold:#C6A15B; --gold-soft:#D8BC82; --aurora:#5FD3C4; --aurora-soft:#8CE7DB;
  --bone:#EDE8DC; --slate:#8B93A6;
  --water:url(${IMG.waterBand});
}
.simetra-landing-page{background:var(--obsidian);color:var(--bone);
  font-family:var(--font-be-vietnam-pro),system-ui,sans-serif;font-weight:300;line-height:1.7;font-size:1.2rem;
  -webkit-font-smoothing:antialiased;overflow-x:hidden;position:relative}
.simetra-landing-page h1,.simetra-landing-page h2,.simetra-landing-page h3{font-family:var(--font-fraunces),Georgia,serif;font-weight:400;line-height:1.1;letter-spacing:-.01em}
.simetra-landing-page ::selection{background:var(--aurora);color:var(--obsidian)}
.simetra-landing-page .wrap{max-width:1140px;margin:0 auto;padding:0 28px}
.simetra-landing-page .eyebrow{font-family:var(--font-be-vietnam-pro),sans-serif;font-size:.86rem;font-weight:600;
  letter-spacing:.28em;text-transform:uppercase;color:var(--aurora);display:inline-flex;align-items:center;gap:.7em}
.simetra-landing-page .eyebrow::before{content:"";width:26px;height:1px;background:var(--aurora);opacity:.7}
.simetra-landing-page .section{padding:120px 0;position:relative}
.simetra-landing-page .hr{height:1px;background:linear-gradient(90deg,transparent,var(--line),transparent)}

.simetra-landing-page .aura{position:absolute;inset:0;z-index:0;pointer-events:none}
.simetra-landing-page .aura::before{content:"";position:absolute;top:-8%;left:50%;transform:translateX(-50%);
  width:880px;height:880px;border-radius:50%;background:radial-gradient(circle,rgba(95,211,196,.11),transparent 62%)}
.simetra-landing-page .aura::after{content:"";position:absolute;bottom:-18%;right:-8%;width:640px;height:640px;border-radius:50%;
  background:radial-gradient(circle,rgba(140,231,219,.07),transparent 60%)}
.simetra-landing-page .grain{position:absolute;inset:0;z-index:0;opacity:.035;pointer-events:none;
  background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")}

.simetra-landing-page nav{position:sticky;top:0;left:0;right:0;z-index:50;display:flex;align-items:center;justify-content:space-between;
  padding:20px 28px;-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);
  background:linear-gradient(180deg,rgba(10,13,20,.85),rgba(10,13,20,0));transition:background .3s}
.simetra-landing-page .brand{font-family:var(--font-fraunces),serif;font-size:1.54rem;letter-spacing:.02em;color:var(--bone)}
.simetra-landing-page .brand b{color:var(--aurora);font-weight:500}
.simetra-landing-page .nav-links{display:flex;gap:34px;align-items:center}
.simetra-landing-page .nav-links a{color:var(--slate);text-decoration:none;font-size:1.02rem;transition:.2s}
.simetra-landing-page .nav-links a:hover{color:var(--bone)}
.simetra-landing-page .nav-cta{font-size:.96rem!important;font-weight:500;color:var(--bone)!important;
  border:1px solid var(--line);padding:9px 20px;border-radius:100px;transition:.25s;white-space:nowrap}
.simetra-landing-page .nav-cta:hover{border-color:var(--aurora);color:var(--aurora)!important;background:rgba(95,211,196,.06)}
@media(max-width:880px){.simetra-landing-page .nav-links a:not(.nav-cta){display:none}}

.simetra-landing-page .btn{display:inline-flex;align-items:center;gap:.6em;
  background:linear-gradient(135deg,var(--aurora),var(--aurora-soft));color:#06201c;
  font-weight:600;font-size:1.14rem;padding:15px 30px;border-radius:100px;text-decoration:none;border:none;cursor:pointer;
  box-shadow:0 10px 30px -12px rgba(95,211,196,.6);transition:.25s}
.simetra-landing-page .btn:hover{transform:translateY(-2px);box-shadow:0 16px 38px -12px rgba(95,211,196,.75)}
.simetra-landing-page .btn.ghost{background:none;color:var(--bone);border:1px solid var(--line-g);box-shadow:none;font-weight:400}
.simetra-landing-page .btn.ghost:hover{border-color:var(--gold);color:var(--gold-soft);transform:none}

.simetra-landing-page .hero{min-height:100vh;display:grid;grid-template-columns:1.05fr .95fr;align-items:center;gap:30px;padding-top:90px}
@supports (height:100dvh){.simetra-landing-page .hero{min-height:100dvh}}
.simetra-landing-page .hero h1{font-size:clamp(3.36rem,6.96vw,5.88rem);font-weight:300}
.simetra-landing-page .hero h1 em{font-style:italic;color:var(--aurora-soft);font-weight:400}
.simetra-landing-page .hero .eyebrow{margin-bottom:26px}
.simetra-landing-page .hero .lede{margin-top:24px;max-width:31em;color:#C7CBD4;font-size:1.27rem}
.simetra-landing-page .hero-actions{margin-top:36px;display:flex;align-items:center;gap:26px;flex-wrap:wrap}
.simetra-landing-page .price{display:flex;flex-direction:column;line-height:1}
.simetra-landing-page .price .amt{font-family:var(--font-fraunces),serif;font-size:2.52rem;color:var(--bone)}
.simetra-landing-page .price .cur{font-size:.86rem;letter-spacing:.18em;text-transform:uppercase;color:var(--slate);margin-top:6px}

.simetra-landing-page .stage{position:relative;display:grid;place-items:center;min-height:560px}
.simetra-landing-page .ripples{position:absolute;inset:0;display:grid;place-items:center;z-index:0}
.simetra-landing-page .rp{position:absolute;border-radius:50%;border:1px solid rgba(95,211,196,.18)}
.simetra-landing-page .rp.a{width:300px;height:300px}
.simetra-landing-page .rp.b{width:440px;height:440px;border-color:rgba(95,211,196,.1)}
.simetra-landing-page .rp.c{width:560px;height:560px;border-color:rgba(95,211,196,.05)}
.simetra-landing-page .wave{position:absolute;width:280px;height:280px;border-radius:50%;border:1px solid var(--aurora);opacity:0;animation:simetra-wave 6s ease-out infinite}
.simetra-landing-page .wave.d2{animation-delay:2s}
.simetra-landing-page .wave.d3{animation-delay:4s}
@keyframes simetra-wave{0%{transform:scale(.5);opacity:.4}70%{opacity:.06}100%{transform:scale(1.9);opacity:0}}
.simetra-landing-page .plate-glow{position:relative;z-index:2;width:min(92%,470px);border-radius:22px;
  filter:drop-shadow(0 26px 50px rgba(0,0,0,.6)) drop-shadow(0 0 42px rgba(95,211,196,.28));
  animation:simetra-breathe 7s ease-in-out infinite}
@keyframes simetra-breathe{0%,100%{transform:translateY(-6px) scale(1)}50%{transform:translateY(6px) scale(1.015)}}
@media(max-width:920px){
  .simetra-landing-page .hero{grid-template-columns:1fr;text-align:center;padding-top:116px;gap:12px}
  .simetra-landing-page .hero .eyebrow,.simetra-landing-page .hero-actions{justify-content:center}
  .simetra-landing-page .hero .lede{margin-left:auto;margin-right:auto}
  .simetra-landing-page .stage{min-height:420px;order:-1}.simetra-landing-page .rp.c{width:420px;height:420px}
}

.simetra-landing-page .thesis{text-align:center;max-width:780px;margin:0 auto}
.simetra-landing-page .thesis h2{font-size:clamp(2.28rem,4.32vw,3.36rem);font-weight:300}
.simetra-landing-page .thesis h2 em{font-style:italic;color:var(--aurora-soft)}
.simetra-landing-page .thesis p{margin-top:20px;color:#C1C6D0;font-size:1.27rem}

.simetra-landing-page .split{display:grid;grid-template-columns:1fr 1fr;gap:60px;align-items:center}
.simetra-landing-page .split h2{font-size:clamp(2.16rem,4.08vw,3.24rem);font-weight:300;margin-top:18px}
.simetra-landing-page .split h2 em{font-style:italic;color:var(--aurora-soft)}
.simetra-landing-page .split p{margin-top:18px;color:#B9BEC9}
.simetra-landing-page .mat-list{margin-top:26px;display:flex;flex-direction:column;gap:0;border-top:1px solid var(--line)}
.simetra-landing-page .ml{padding:18px 0;border-bottom:1px solid var(--line);display:flex;gap:16px;align-items:baseline}
.simetra-landing-page .ml i{width:11px;height:11px;border-radius:50%;flex:none;position:relative;top:5px}
.simetra-landing-page .ml.cu i{background:#B87333}
.simetra-landing-page .ml.qz i{background:linear-gradient(135deg,#cfeaff,#fff)}
.simetra-landing-page .ml.di i{background:linear-gradient(135deg,#bfefff,#fff)}
.simetra-landing-page .ml b{font-family:var(--font-fraunces),serif;color:var(--bone);font-size:1.3rem;font-weight:500;white-space:nowrap}
.simetra-landing-page .ml span{color:var(--slate);font-size:1.13rem}
.simetra-landing-page .mat-card{position:relative;border:1px solid var(--line);border-radius:20px;overflow:hidden;aspect-ratio:1;
  background:linear-gradient(160deg,var(--panel),var(--panel-2));display:grid;place-items:center}
.simetra-landing-page .mat-card img{width:100%;height:100%;object-fit:cover;display:block}
@media(max-width:820px){.simetra-landing-page .split{grid-template-columns:1fr;gap:36px}.simetra-landing-page .mat-card{order:-1;max-width:440px;margin:0 auto;width:100%}}

.simetra-landing-page .band{position:relative;padding:150px 0;overflow:hidden;isolation:isolate}
.simetra-landing-page .band::before{content:"";position:absolute;inset:0;z-index:-2;background-image:var(--water);background-size:cover;background-position:center}
.simetra-landing-page .band::after{content:"";position:absolute;inset:0;z-index:-1;
  background:linear-gradient(90deg,rgba(10,13,20,.93),rgba(10,13,20,.55) 52%,rgba(10,13,20,.72))}
.simetra-landing-page .band .inner{max-width:580px}
.simetra-landing-page .band h2{font-size:clamp(2.4rem,4.8vw,3.6rem);font-weight:300;margin-top:18px}
.simetra-landing-page .band h2 em{font-style:italic;color:var(--aurora-soft)}
.simetra-landing-page .band .blist{margin-top:26px;list-style:none;display:flex;flex-direction:column;gap:14px}
.simetra-landing-page .band .blist li{display:flex;gap:14px;align-items:flex-start;color:#D3D7DE;font-size:1.22rem}
.simetra-landing-page .band .blist li::before{content:"≋";color:var(--aurora);font-size:1.32rem;flex:none}

.simetra-landing-page .tech-head{text-align:center;max-width:680px;margin:0 auto 60px}
.simetra-landing-page .tech-head h2{font-size:clamp(2.28rem,4.32vw,3.36rem);font-weight:300;margin-top:16px}
.simetra-landing-page .tech-head p{margin-top:16px;color:#B9BEC9}
.simetra-landing-page .sft{display:grid;grid-template-columns:repeat(3,1fr);gap:22px}
.simetra-landing-page .sc{border:1px solid var(--line);border-radius:16px;padding:34px 30px;
  background:linear-gradient(165deg,rgba(95,211,196,.03),transparent);transition:.3s}
.simetra-landing-page .sc:hover{border-color:rgba(95,211,196,.5);transform:translateY(-3px)}
.simetra-landing-page .sc .num{font-family:var(--font-fraunces),serif;font-size:1.26rem;color:var(--aurora);
  width:44px;height:44px;border:1px solid var(--line);border-radius:50%;display:grid;place-items:center;margin-bottom:22px}
.simetra-landing-page .sc h3{font-size:1.49rem;font-weight:500;color:var(--bone)}
.simetra-landing-page .sc p{margin-top:12px;color:var(--slate);font-size:1.13rem}
.simetra-landing-page .passive{margin-top:32px;text-align:center;color:var(--slate);font-size:1.14rem}
.simetra-landing-page .passive b{color:var(--aurora-soft);font-weight:500}
@media(max-width:760px){.simetra-landing-page .sft{grid-template-columns:1fr}}

.simetra-landing-page .ben-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:20px}
.simetra-landing-page .ben{padding:30px 28px;border:1px solid var(--line);border-radius:14px;background:rgba(255,255,255,.012);transition:.25s}
.simetra-landing-page .ben:hover{background:rgba(95,211,196,.05);border-color:rgba(95,211,196,.4)}
.simetra-landing-page .ben .ic{font-size:1.68rem;margin-bottom:14px}
.simetra-landing-page .ben h3{font-size:1.37rem;font-weight:500;color:var(--bone)}
.simetra-landing-page .ben ul{margin-top:12px;list-style:none;display:flex;flex-direction:column;gap:8px;padding:0}
.simetra-landing-page .ben li{position:relative;padding-left:18px;color:var(--slate);font-size:1.08rem}
.simetra-landing-page .ben li::before{content:"◦";position:absolute;left:0;color:var(--aurora)}
@media(max-width:900px){.simetra-landing-page .ben-grid{grid-template-columns:1fr 1fr}}
@media(max-width:600px){.simetra-landing-page .ben-grid{grid-template-columns:1fr}}

.simetra-landing-page .uses-wrap{display:grid;grid-template-columns:.9fr 1.1fr;gap:48px;align-items:center}
.simetra-landing-page .uses-img{border-radius:20px;overflow:hidden;border:1px solid var(--line)}
.simetra-landing-page .uses-img img{width:100%;display:block}
.simetra-landing-page .uses-copy h2{font-size:clamp(2.16rem,4.08vw,3.12rem);font-weight:300;margin-top:16px}
.simetra-landing-page .place{margin-top:24px;display:grid;grid-template-columns:1fr 1fr;gap:2px;background:var(--line);border:1px solid var(--line);border-radius:16px;overflow:hidden}
.simetra-landing-page .pl{background:var(--obsidian);padding:22px 22px;transition:.2s}
.simetra-landing-page .pl:hover{background:var(--panel)}
.simetra-landing-page .pl .g{font-size:1.56rem}
.simetra-landing-page .pl h3{font-size:1.2rem;font-weight:600;color:var(--bone);margin-top:8px}
.simetra-landing-page .pl p{margin-top:5px;color:var(--slate);font-size:1.02rem;line-height:1.5}
.simetra-landing-page .rest{margin-top:22px;padding:20px 24px;border:1px solid var(--line-g);border-radius:14px;background:rgba(198,161,91,.05);
  display:flex;gap:16px;align-items:baseline}
.simetra-landing-page .rest b{font-family:var(--font-fraunces),serif;color:var(--gold-soft);font-size:1.92rem;white-space:nowrap}
.simetra-landing-page .rest span{color:#C1C6D0;font-size:1.13rem}
@media(max-width:860px){.simetra-landing-page .uses-wrap{grid-template-columns:1fr;gap:32px}.simetra-landing-page .uses-img{order:-1;max-width:460px;margin:0 auto}}

.simetra-landing-page .vgrid{display:grid;grid-template-columns:1fr 1fr;gap:24px}
.simetra-landing-page .vc{border:1px solid var(--line);border-radius:20px;padding:36px;text-align:center;
  background:linear-gradient(165deg,rgba(255,255,255,.02),transparent);transition:.25s}
.simetra-landing-page .vc:hover{transform:translateY(-3px)}
.simetra-landing-page .vc img{width:min(80%,300px);height:auto;filter:drop-shadow(0 20px 34px rgba(0,0,0,.5))}
.simetra-landing-page .vc h3{margin-top:20px;font-size:1.44rem;font-weight:500;color:var(--bone)}
.simetra-landing-page .vc span{display:inline-block;margin-top:6px;font-size:.94rem;letter-spacing:.14em;text-transform:uppercase;color:var(--slate)}
@media(max-width:600px){.simetra-landing-page .vgrid{grid-template-columns:1fr}}

.simetra-landing-page .feat-row{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));
  border:1px solid var(--line);border-radius:18px;overflow:hidden}
.simetra-landing-page .feat{padding:32px 26px;border-right:1px solid var(--line);border-bottom:1px solid var(--line)}
.simetra-landing-page .feat .fi{font-size:1.68rem;margin-bottom:14px;color:var(--aurora)}
.simetra-landing-page .feat h3{font-size:1.22rem;font-weight:600;color:var(--bone)}

.simetra-landing-page .final{position:relative;text-align:center;border:1px solid var(--line);border-radius:26px;padding:80px 40px;overflow:hidden;
  background:radial-gradient(circle at 50% 0%,rgba(95,211,196,.12),transparent 60%),linear-gradient(160deg,var(--panel),var(--panel-2))}
.simetra-landing-page .final .eyebrow{justify-content:center;margin-bottom:22px}
.simetra-landing-page .final h2{font-size:clamp(2.52rem,5.28vw,3.96rem);font-weight:300}
.simetra-landing-page .final h2 em{font-style:italic;color:var(--aurora-soft)}
.simetra-landing-page .final p{max-width:46em;margin:20px auto 0;color:#C1C6D0}
.simetra-landing-page .final .buy{margin-top:38px;display:flex;align-items:center;justify-content:center;gap:28px;flex-wrap:wrap}
.simetra-landing-page .final .price{align-items:center}
.simetra-landing-page .final .price .amt{font-size:3.12rem}

.simetra-landing-page footer{padding:60px 0 70px;border-top:1px solid var(--line);margin-top:120px}
.simetra-landing-page .foot{display:flex;justify-content:space-between;gap:30px;flex-wrap:wrap;align-items:flex-start}
.simetra-landing-page .foot .brand{display:block;margin-bottom:14px}
.simetra-landing-page .foot p{color:var(--slate);font-size:1.03rem;max-width:34em}
.simetra-landing-page .foot .price{text-align:right}
.simetra-landing-page .foot .price .amt{font-family:var(--font-fraunces),serif;font-size:2.16rem;color:var(--bone)}
.simetra-landing-page .disclaimer{margin-top:28px;color:#6B7285;font-size:.91rem;line-height:1.6;max-width:64em}

.simetra-landing-page .reveal{opacity:0;transform:translateY(24px);transition:opacity .8s ease,transform .8s ease}
.simetra-landing-page .reveal.in{opacity:1;transform:none}
@media(prefers-reduced-motion:reduce){.simetra-landing-page *{animation:none!important}.simetra-landing-page .reveal{opacity:1;transform:none;transition:none}}
.simetra-landing-page :focus-visible{outline:2px solid var(--aurora);outline-offset:3px;border-radius:4px}
`;
