"use client";

import { useEffect, useRef } from "react";
import { Fraunces, Be_Vietnam_Pro } from "next/font/google";
import { formatVND } from "@/lib/currency";
import { getPricing } from "@/lib/pricing";

// Bespoke landing page for exactly one product (today: "sanarey-activa") —
// see the branch in ./page.tsx. Ported verbatim (structure, copy, animation)
// from a hand-designed reference file the user supplied. Unlike the Aria
// page, the hero/cosmic/gallery photography here is fixed page chrome, not
// per-product data — explicit user decision (the product's own imageUrl is
// a different photo used only for the catalog card) — so those images are
// static assets under public/product-landing/activa/ rather than Product
// columns. Only price/salePrice/cv are wired to real Product data, also an
// explicit user decision (the reference had a hardcoded "$340").
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
  cosmic: "/product-landing/activa/cosmic.jpg",
  pen: "/product-landing/activa/pen.png",
  galleryBody: "/product-landing/activa/gallery-body.jpg",
  galleryWater: "/product-landing/activa/gallery-water.jpg",
  galleryFood: "/product-landing/activa/gallery-food.jpg",
  galleryEverywhere: "/product-landing/activa/gallery-everywhere.jpg",
};

export type ActivaLandingProduct = {
  id: string;
  price: number;
  salePrice: number | null;
  cv: number;
};

function PriceBlock({ product, size }: { product: ActivaLandingProduct; size?: "lg" }) {
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

export function ActivaLandingPage({ product }: { product: ActivaLandingProduct }) {
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
    document.querySelectorAll(".activa-landing-page .reveal").forEach((el) => io.observe(el));

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
    <div className={`activa-landing-page ${fraunces.variable} ${beVietnamPro.variable}`}>
      <style>{ACTIVA_LANDING_CSS}</style>

      <div className="aura"></div>
      <div className="grain"></div>

      <nav ref={navRef}>
        <div className="brand">
          SANAREY <b>Activa</b>
        </div>
        <div className="nav-links">
          <a href="#cong-nghe">Công nghệ</a>
          <a href="#loi-ich">Lợi ích</a>
          <a href="#cong-dung">Công dụng</a>
          <a href="#huong-dan">Hướng dẫn</a>
          <a href="#dat-hang" className="nav-cta">
            {pricing.forSale ? `Đặt hàng · ${formatVND(pricing.chargeAmount)}` : "Đặt hàng"}
          </a>
        </div>
      </nav>

      <header className="wrap hero">
        <div>
          <span className="eyebrow">Gậy kích hoạt năng lượng thế hệ mới</span>
          <h1>
            Kích hoạt, hài hòa &amp; <em>phục hồi</em> năng lượng
          </h1>
          <p className="lede">
            SANAREY Activa — thiết bị năng lượng nhỏ gọn như chiếc bút thép không gỉ, giúp hài hòa trường năng lượng
            sinh học và kết nối lại cơ thể với năng lượng sinh lực tự nhiên.
          </p>
          <div className="hero-actions">
            <a href="#dat-hang" className="btn" onClick={(e) => e.preventDefault()}>
              Sở hữu Activa <span aria-hidden="true">→</span>
            </a>
            <PriceBlock product={product} />
          </div>
        </div>
        <div className="stage" aria-hidden="true">
          <div className="rings">
            <div className="ring r3"></div>
            <div className="ring r2"></div>
            <div className="ring spin"></div>
            <div className="ring r1"></div>
            <div className="pulse"></div>
            <div className="pulse d2"></div>
            <div className="pulse d3"></div>
          </div>
          <div className="glow"></div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="pen" src={IMG.pen} alt="Bút năng lượng SANAREY Activa bằng thép không gỉ" />
        </div>
      </header>

      <section className="core">
        <div className="wrap">
          <div className="inner reveal">
            <span className="eyebrow">Lõi cộng hưởng độc quyền</span>
            <h2>
              13–14 tinh thể &amp; khoáng chất, <em>hợp nhất trong một lõi</em>
            </h2>
            <p>
              Bên trong vỏ thép không gỉ là lõi hợp kim độc quyền — đồng, vàng, bạc, bột kim cương và các tinh thể
              quý hiếm — được kết hợp qua Công nghệ SANAREY Fusion để tạo nên một ma trận cộng hưởng năng lượng
              tinh khiết cao.
            </p>
            <div className="mats">
              <span className="mat cu">
                <i></i>Đồng
              </span>
              <span className="mat au">
                <i></i>Vàng
              </span>
              <span className="mat ag">
                <i></i>Bạc
              </span>
              <span className="mat di">
                <i></i>Bột kim cương
              </span>
              <span className="mat xt">
                <i></i>Tinh thể quý hiếm
              </span>
            </div>
            <div className="vac">
              <b>~16</b>
              <span>ngày điều kiện chân không chuyên biệt để ổn định và cộng hưởng ma trận tinh thể</span>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="wrap thesis reveal">
          <h2>
            Nhỏ gọn để mang theo — <em>mạnh mẽ khi kích hoạt</em>
          </h2>
          <p>
            Với kích thước như một chiếc bút, Activa cho phép bạn kích hoạt, hài hòa và phục hồi năng lượng mọi
            lúc, mọi nơi. Đây là sự tiến hóa của khái niệm cây đũa phép năng lượng, tinh chỉnh cho thời đại hiện
            đại.
          </p>
        </div>
      </section>

      <div className="wrap">
        <div className="hr"></div>
      </div>

      <section className="section" id="cong-nghe">
        <div className="wrap">
          <div className="tech-head reveal">
            <span className="eyebrow">Công nghệ hợp nhất SANAREY · SFT</span>
            <h2>Khoa học đằng sau Activa</h2>
            <p>
              Một quy trình kỹ thuật năng lượng độc quyền, tăng cường đặc tính cộng hưởng tự nhiên của tinh thể và
              khoáng chất qua bốn nguyên tắc cốt lõi.
            </p>
          </div>
          <div className="pillars">
            <div className="pillar reveal">
              <div className="num">01</div>
              <h3>Ma trận cộng hưởng tinh thể–khoáng chất</h3>
              <p>
                Hỗn hợp độc quyền 13–14 loại tinh thể dạng hạt với cấu trúc mạng ổn định, kết hợp thành một ma trận
                năng lượng có cấu trúc.
              </p>
            </div>
            <div className="pillar reveal">
              <div className="num">02</div>
              <h3>Xử lý chân không năng lượng</h3>
              <p>
                Quy trình chân không kéo dài khoảng 16 ngày ổn định sự cộng hưởng của ma trận và tăng cường tương
                tác với các tần số tinh tế.
              </p>
            </div>
            <div className="pillar reveal">
              <div className="num">03</div>
              <h3>Tương tác cộng hưởng lượng tử</h3>
              <p>
                Khi Activa được đưa lại gần, ma trận tinh thể tương tác với trường năng lượng sinh học xung quanh,
                khuyến khích điều chỉnh tần số.
              </p>
            </div>
            <div className="pillar reveal">
              <div className="num">04</div>
              <h3>Hiệu ứng ăng-ten năng lượng</h3>
              <p>
                Activa hoạt động như cầu nối giữa trường năng lượng của người dùng và năng lượng sinh lực phổ quát
                trong tự nhiên.
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="wrap">
        <div className="hr"></div>
      </div>

      <section className="section">
        <div className="wrap">
          <div className="tech-head reveal">
            <span className="eyebrow">Điều gì làm Activa nổi bật</span>
            <h2>Định nghĩa lại cây đũa kích hoạt năng lượng</h2>
          </div>
          <div className="feat-row reveal">
            <div className="feat">
              <div className="fi">◈</div>
              <h3>Lõi kết hợp tiên tiến</h3>
              <p>Hỗn hợp tinh thể–khoáng chất độc quyền, hợp nhất để tăng cường cộng hưởng.</p>
            </div>
            <div className="feat">
              <div className="fi">⬖</div>
              <h3>Thép không gỉ chính xác</h3>
              <p>Vỏ bút nhỏ gọn, bền chắc, dễ mang theo và toát lên vẻ sang trọng.</p>
            </div>
            <div className="feat">
              <div className="fi">≋</div>
              <h3>Tương tác được tăng cường</h3>
              <p>Ma trận tinh chỉnh hỗ trợ tương tác mạnh mẽ hơn với các trường tinh tế.</p>
            </div>
            <div className="feat">
              <div className="fi">✦</div>
              <h3>Điều chỉnh năng lượng trường</h3>
              <p>Quy trình điều chỉnh chuyên biệt để cộng hưởng với năng lượng sinh lực vũ trụ.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="section" id="loi-ich" style={{ paddingTop: "20px" }}>
        <div className="wrap">
          <div className="tech-head reveal">
            <span className="eyebrow">Những lợi ích</span>
            <h2>Cân bằng, lưu thông &amp; phục hồi</h2>
          </div>
          <div className="ben-grid">
            <div className="ben reveal">
              <div className="k">Cân bằng</div>
              <h3>Hỗ trợ cân bằng năng lượng</h3>
              <p>Đưa trường năng lượng sinh học của cơ thể về trạng thái cân bằng nội môi.</p>
            </div>
            <div className="ben reveal">
              <div className="k">Thanh lọc</div>
              <h3>Loại bỏ méo mó năng lượng</h3>
              <p>Giải tỏa những rối loạn và mất cân bằng trong trường năng lượng tinh tế.</p>
            </div>
            <div className="ben reveal">
              <div className="k">Lưu thông</div>
              <h3>Tăng cường lưu thông</h3>
              <p>Giúp năng lượng lưu chuyển mượt mà hơn khắp cơ thể.</p>
            </div>
            <div className="ben reveal">
              <div className="k">Phục hồi</div>
              <h3>Hỗ trợ tự phục hồi</h3>
              <p>Khuyến khích khả năng tự nhiên của cơ thể trong việc phục hồi và cân bằng.</p>
            </div>
            <div className="ben reveal">
              <div className="k">Sức sống</div>
              <h3>Tăng năng lượng &amp; sức khỏe</h3>
              <p>Thúc đẩy sự dẻo dai và sức khỏe tổng thể mỗi ngày.</p>
            </div>
            <div className="ben reveal">
              <div className="k">Nghỉ ngơi</div>
              <h3>Cải thiện giấc ngủ</h3>
              <p>Hỗ trợ giấc ngủ ngon hơn và phục hồi tốt hơn qua sự cân bằng năng lượng.</p>
            </div>
            <div className="ben reveal">
              <div className="k">Nước &amp; Thực phẩm</div>
              <h3>Nâng chất lượng năng lượng</h3>
              <p>Dùng để tăng cường năng lượng cho đồ uống, thực phẩm và nước.</p>
            </div>
            <div className="ben reveal">
              <div className="k">Chăm sóc</div>
              <h3>Sản phẩm cá nhân</h3>
              <p>Dùng cùng sản phẩm chăm sóc da hoặc sức khỏe trước khi thoa lên da.</p>
            </div>
            <div className="ben reveal">
              <div className="k">Không gian</div>
              <h3>Hài hòa môi trường</h3>
              <p>Dùng quanh không gian, cây cối và động vật để hài hòa năng lượng xung quanh.</p>
            </div>
          </div>
        </div>
      </section>

      <div className="wrap">
        <div className="hr"></div>
      </div>

      <section className="section" id="cong-dung">
        <div className="wrap">
          <div className="tech-head reveal">
            <span className="eyebrow">Công dụng</span>
            <h2>Một dụng cụ, cho nhiều khía cạnh của cuộc sống</h2>
          </div>
          <div className="gal reveal">
            <div className="gc">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={IMG.galleryBody} alt="Kích hoạt năng lượng cá nhân trên cơ thể" />
              <div className="cap">
                <span className="t">Cơ thể</span>
                <h3>Kích hoạt năng lượng cá nhân</h3>
                <p>Di chuyển theo chiều kim đồng hồ trên các vùng cơ thể hoặc da mặt để hỗ trợ cân bằng và thư giãn.</p>
              </div>
            </div>
            <div className="gc">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={IMG.galleryWater} alt="Tăng cường năng lượng cho nước uống" />
              <div className="cap">
                <span className="t">Nước uống</span>
                <h3>Hài hòa cấu trúc nước</h3>
                <p>Xoay Activa theo chiều kim đồng hồ phía trên nước để hài hòa cấu trúc năng lượng của nước.</p>
              </div>
            </div>
            <div className="gc">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={IMG.galleryFood} alt="Tăng cường năng lượng cho thực phẩm" />
              <div className="cap">
                <span className="t">Thực phẩm</span>
                <h3>Tăng sức sống cho món ăn</h3>
                <p>Xoay quanh thực phẩm theo chiều kim đồng hồ để tăng cường sức sống và năng lượng.</p>
              </div>
            </div>
            <div className="gc">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={IMG.galleryEverywhere} alt="Mang theo Activa mọi lúc mọi nơi" />
              <div className="cap">
                <span className="t">Mọi lúc mọi nơi</span>
                <h3>Hài hòa không gian &amp; môi trường</h3>
                <p>Nhỏ gọn để mang theo bên mình — hỗ trợ cân bằng năng lượng trong không gian sống và làm việc.</p>
              </div>
            </div>
          </div>
          <div className="more-uses reveal">
            <span className="chip">Kích thích điểm huyệt &amp; châm cứu</span>
            <span className="chip">Hài hòa trung tâm năng lượng</span>
            <span className="chip">Kích hoạt kem, dầu chăm sóc da</span>
            <span className="chip">Thú cưng &amp; cây trồng</span>
          </div>
        </div>
      </section>

      <div className="wrap">
        <div className="hr"></div>
      </div>

      <section className="section" id="huong-dan">
        <div className="wrap">
          <div className="tech-head reveal">
            <span className="eyebrow">Hướng dẫn sử dụng</span>
            <h2>Bốn bước, mọi lúc mọi nơi</h2>
          </div>
          <div className="steps reveal">
            <div className="step">
              <div className="n">1</div>
              <h3>Cầm thoải mái</h3>
              <p>Giữ Activa thật thoải mái trong lòng bàn tay.</p>
            </div>
            <div className="step">
              <div className="n">2</div>
              <h3>Đưa lại gần</h3>
              <p>Đưa đầu mũi bút lại gần khu vực bạn muốn nhắm đến.</p>
            </div>
            <div className="step">
              <div className="n">3</div>
              <h3>Xoay theo chiều kim đồng hồ</h3>
              <p>Xoay bút nhẹ nhàng theo chiều kim đồng hồ.</p>
            </div>
            <div className="step">
              <div className="n">4</div>
              <h3>Dùng đều đặn</h3>
              <p>Đưa vào thói quen chăm sóc sức khỏe thường ngày của bạn.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="section" id="dat-hang">
        <div className="wrap">
          <div className="final reveal">
            <span className="eyebrow">SANAREY Activa</span>
            <h2>
              Kích hoạt, hài hòa &amp; <em>phục hồi</em> — trong lòng bàn tay
            </h2>
            <p>
              Vì Activa hoạt động thông qua tương tác năng lượng, bạn có thể sử dụng nó mọi lúc, mọi nơi. Nhỏ gọn để
              mang theo bất cứ đâu.
            </p>
            <div className="buy">
              <PriceBlock product={product} size="lg" />
              {/* Checkout chưa được nối — nút này tạm thời chỉ mang tính hiển
                  thị, giống hệt bản thiết kế gốc, cho tới khi luồng đặt
                  hàng cho Product được quyết định. */}
              <a href="#" className="btn" onClick={(e) => e.preventDefault()}>
                Đặt hàng ngay <span aria-hidden="true">→</span>
              </a>
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
              SANAREY <b>Activa</b>
            </span>
            <p>
              Bút kích hoạt năng lượng thế hệ mới — hài hòa trường năng lượng sinh học và kết nối lại cơ thể với
              năng lượng sinh lực tự nhiên.
            </p>
          </div>
          <PriceBlock product={product} size="lg" />
        </div>
        <div className="wrap">
          <p className="disclaimer">
            Lưu ý: SANAREY Activa là sản phẩm chăm sóc sức khỏe năng lượng, hướng đến việc hỗ trợ cân bằng, thư
            giãn và cảm giác khỏe khoắn. Sản phẩm không phải là thiết bị y tế và không nhằm mục đích chẩn đoán,
            điều trị, chữa khỏi hay ngăn ngừa bất kỳ bệnh nào, cũng không thay thế cho tư vấn hay điều trị y tế.
            Các mô tả về "năng lượng", "cộng hưởng" và lợi ích liên quan phản ánh khái niệm của thương hiệu và
            chưa được các cơ quan y tế đánh giá hay kiểm chứng khoa học. Vui lòng tham khảo ý kiến chuyên gia y tế
            cho các vấn đề sức khỏe.
          </p>
        </div>
      </footer>
    </div>
  );
}

// Scoped under .activa-landing-page, same reasoning as aria-landing.tsx's
// ARIA_LANDING_CSS — the original file was a standalone page with its own
// <body>, safe there; this app's <body> is shared across every route, so
// every bare-element rule and :root custom property moves onto this class.
const ACTIVA_LANDING_CSS = `
.activa-landing-page{
  --obsidian:#0A0D14; --panel:#111726; --panel-2:#0E1420;
  --line:rgba(198,161,91,.20);
  --gold:#C6A15B; --gold-soft:#D8BC82; --aurora:#5FD3C4;
  --bone:#EDE8DC; --slate:#8B93A6;
  --cosmic:url(${IMG.cosmic});
}
.activa-landing-page{background:var(--obsidian);color:var(--bone);
  font-family:var(--font-be-vietnam-pro),system-ui,sans-serif;font-weight:300;line-height:1.7;font-size:1.2rem;
  -webkit-font-smoothing:antialiased;overflow-x:hidden;position:relative}
.activa-landing-page h1,.activa-landing-page h2,.activa-landing-page h3{font-family:var(--font-fraunces),Georgia,serif;font-weight:400;line-height:1.1;letter-spacing:-.01em}
.activa-landing-page ::selection{background:var(--gold);color:var(--obsidian)}
.activa-landing-page .wrap{max-width:1140px;margin:0 auto;padding:0 28px}
.activa-landing-page .eyebrow{font-family:var(--font-be-vietnam-pro),sans-serif;font-size:.86rem;font-weight:600;
  letter-spacing:.28em;text-transform:uppercase;color:var(--gold);display:inline-flex;align-items:center;gap:.7em}
.activa-landing-page .eyebrow::before{content:"";width:26px;height:1px;background:var(--gold);opacity:.7}
.activa-landing-page .section{padding:120px 0;position:relative}
.activa-landing-page .hr{height:1px;background:linear-gradient(90deg,transparent,var(--line),transparent)}

.activa-landing-page .aura{position:absolute;inset:0;z-index:0;pointer-events:none}
.activa-landing-page .aura::before{content:"";position:absolute;top:-8%;left:50%;transform:translateX(-50%);
  width:860px;height:860px;border-radius:50%;background:radial-gradient(circle,rgba(95,211,196,.09),transparent 62%)}
.activa-landing-page .aura::after{content:"";position:absolute;bottom:-18%;right:-8%;width:660px;height:660px;border-radius:50%;
  background:radial-gradient(circle,rgba(198,161,91,.10),transparent 60%)}
.activa-landing-page .grain{position:absolute;inset:0;z-index:0;opacity:.035;pointer-events:none;
  background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")}

.activa-landing-page nav{position:sticky;top:0;left:0;right:0;z-index:50;display:flex;align-items:center;justify-content:space-between;
  padding:20px 28px;backdrop-filter:blur(10px);
  background:linear-gradient(180deg,rgba(10,13,20,.85),rgba(10,13,20,0));transition:background .3s}
.activa-landing-page .brand{font-family:var(--font-fraunces),serif;font-size:1.54rem;letter-spacing:.02em;color:var(--bone)}
.activa-landing-page .brand b{color:var(--gold);font-weight:500}
.activa-landing-page .nav-links{display:flex;gap:34px;align-items:center}
.activa-landing-page .nav-links a{color:var(--slate);text-decoration:none;font-size:1.02rem;transition:.2s}
.activa-landing-page .nav-links a:hover{color:var(--bone)}
.activa-landing-page .nav-cta{font-size:.96rem!important;font-weight:500;color:var(--bone)!important;
  border:1px solid var(--line);padding:9px 20px;border-radius:100px;transition:.25s;white-space:nowrap}
.activa-landing-page .nav-cta:hover{border-color:var(--gold);color:var(--gold)!important;background:rgba(198,161,91,.06)}
@media(max-width:880px){.activa-landing-page .nav-links a:not(.nav-cta){display:none}}

.activa-landing-page .btn{display:inline-flex;align-items:center;gap:.6em;
  background:linear-gradient(135deg,var(--gold),var(--gold-soft));color:#1a1408;
  font-weight:600;font-size:1.14rem;padding:15px 30px;border-radius:100px;text-decoration:none;border:none;cursor:pointer;
  box-shadow:0 10px 30px -12px rgba(198,161,91,.6);transition:.25s}
.activa-landing-page .btn:hover{transform:translateY(-2px);box-shadow:0 16px 38px -12px rgba(198,161,91,.75)}
.activa-landing-page .btn.ghost{background:none;color:var(--bone);border:1px solid var(--line);box-shadow:none;font-weight:400}
.activa-landing-page .btn.ghost:hover{border-color:var(--aurora);color:var(--aurora);transform:none}

.activa-landing-page .hero{min-height:100vh;display:grid;grid-template-columns:1.1fr .9fr;align-items:center;gap:20px;padding-top:90px}
.activa-landing-page .hero h1{font-size:clamp(3.48rem,7.2vw,6rem);font-weight:300}
.activa-landing-page .hero h1 em{font-style:italic;color:var(--gold-soft);font-weight:400}
.activa-landing-page .hero .eyebrow{margin-bottom:26px}
.activa-landing-page .hero .lede{margin-top:24px;max-width:30em;color:#C7CBD4;font-size:1.27rem}
.activa-landing-page .hero-actions{margin-top:36px;display:flex;align-items:center;gap:26px;flex-wrap:wrap}
.activa-landing-page .price{display:flex;flex-direction:column;line-height:1}
.activa-landing-page .price .amt{font-family:var(--font-fraunces),serif;font-size:2.52rem;color:var(--bone)}
.activa-landing-page .price .cur{font-size:.86rem;letter-spacing:.1em;text-transform:uppercase;color:var(--slate);margin-top:6px}

.activa-landing-page .stage{position:relative;display:grid;place-items:center;min-height:560px}
.activa-landing-page .rings{position:absolute;inset:0;display:grid;place-items:center;z-index:0}
.activa-landing-page .ring{position:absolute;border-radius:50%;border:1px solid rgba(95,211,196,.16)}
.activa-landing-page .ring.r1{width:200px;height:200px}
.activa-landing-page .ring.r2{width:330px;height:330px;border-color:rgba(198,161,91,.14)}
.activa-landing-page .ring.r3{width:470px;height:470px;border-color:rgba(95,211,196,.08)}
.activa-landing-page .ring.spin{width:390px;height:390px;border:1px dashed rgba(198,161,91,.32);animation:activa-spin 30s linear infinite}
.activa-landing-page .pulse{position:absolute;width:190px;height:190px;border-radius:50%;border:1px solid var(--aurora);opacity:0;animation:activa-pulse 5.5s ease-out infinite}
.activa-landing-page .pulse.d2{animation-delay:1.8s}
.activa-landing-page .pulse.d3{animation-delay:3.6s}
@keyframes activa-spin{to{transform:rotate(360deg)}}
@keyframes activa-pulse{0%{transform:scale(.5);opacity:.5}70%{opacity:.08}100%{transform:scale(2.5);opacity:0}}
.activa-landing-page .glow{position:absolute;width:150px;height:150px;border-radius:50%;
  background:radial-gradient(circle,rgba(198,161,91,.28),transparent 66%);filter:blur(16px);z-index:1}
.activa-landing-page .pen{position:relative;z-index:2;height:min(72vh,540px);width:auto;
  filter:drop-shadow(0 24px 40px rgba(0,0,0,.6)) drop-shadow(0 0 26px rgba(95,211,196,.18));
  animation:activa-float 7s ease-in-out infinite}
@keyframes activa-float{0%,100%{transform:translateY(-8px)}50%{transform:translateY(8px)}}
@media(max-width:920px){
  .activa-landing-page .hero{grid-template-columns:1fr;text-align:center;padding-top:116px;gap:10px}
  .activa-landing-page .hero .eyebrow,.activa-landing-page .hero-actions{justify-content:center}
  .activa-landing-page .hero .lede{margin-left:auto;margin-right:auto}
  .activa-landing-page .stage{min-height:440px;order:-1}.activa-landing-page .pen{height:400px}
  .activa-landing-page .ring.r3{width:380px;height:380px}.activa-landing-page .ring.spin{width:320px;height:320px}
}

.activa-landing-page .core{position:relative;padding:150px 0;overflow:hidden;isolation:isolate}
.activa-landing-page .core::before{content:"";position:absolute;inset:0;z-index:-2;
  background-image:var(--cosmic);background-size:cover;background-position:center;transform:scale(1.05)}
.activa-landing-page .core::after{content:"";position:absolute;inset:0;z-index:-1;
  background:linear-gradient(90deg,rgba(10,13,20,.94),rgba(10,13,20,.55) 55%,rgba(10,13,20,.85))}
.activa-landing-page .core .inner{max-width:620px}
.activa-landing-page .core h2{font-size:clamp(2.4rem,4.8vw,3.6rem);font-weight:300;margin-top:18px}
.activa-landing-page .core h2 em{font-style:italic;color:var(--gold-soft)}
.activa-landing-page .core p{margin-top:20px;color:#D3D7DE;font-size:1.26rem}
.activa-landing-page .mats{display:flex;flex-wrap:wrap;gap:12px;margin-top:30px}
.activa-landing-page .mat{border:1px solid var(--line);border-radius:100px;padding:9px 18px;font-size:1.02rem;color:var(--bone);
  display:flex;align-items:center;gap:.55em;background:rgba(10,13,20,.4);backdrop-filter:blur(4px)}
.activa-landing-page .mat i{width:9px;height:9px;border-radius:50%;display:inline-block}
.activa-landing-page .mat.cu i{background:#B87333}
.activa-landing-page .mat.au i{background:#E5C558}
.activa-landing-page .mat.ag i{background:#D8DCE2}
.activa-landing-page .mat.di i{background:linear-gradient(135deg,#bfefff,#fff)}
.activa-landing-page .mat.xt i{background:var(--aurora)}
.activa-landing-page .core .vac{margin-top:30px;display:flex;align-items:baseline;gap:14px;padding-top:24px;border-top:1px solid var(--line);max-width:420px}
.activa-landing-page .core .vac b{font-family:var(--font-fraunces),serif;font-size:3.12rem;color:var(--aurora);font-weight:400;line-height:1}
.activa-landing-page .core .vac span{color:var(--slate);font-size:1.1rem}

.activa-landing-page .thesis{text-align:center;max-width:760px;margin:0 auto}
.activa-landing-page .thesis h2{font-size:clamp(2.28rem,4.32vw,3.36rem);font-weight:300}
.activa-landing-page .thesis h2 em{font-style:italic;color:var(--gold-soft)}
.activa-landing-page .thesis p{margin-top:20px;color:#C1C6D0;font-size:1.27rem}

.activa-landing-page .tech-head{text-align:center;max-width:660px;margin:0 auto 60px}
.activa-landing-page .tech-head h2{font-size:clamp(2.28rem,4.32vw,3.36rem);font-weight:300;margin-top:16px}
.activa-landing-page .tech-head p{margin-top:16px;color:#B9BEC9}
.activa-landing-page .pillars{display:grid;grid-template-columns:repeat(2,1fr);gap:22px}
.activa-landing-page .pillar{border:1px solid var(--line);border-radius:16px;padding:32px 30px;
  background:linear-gradient(165deg,rgba(255,255,255,.02),transparent);transition:.3s}
.activa-landing-page .pillar:hover{border-color:rgba(198,161,91,.45);transform:translateY(-3px)}
.activa-landing-page .pillar .num{font-family:var(--font-fraunces),serif;font-size:1.26rem;color:var(--gold);
  width:44px;height:44px;border:1px solid var(--line);border-radius:50%;display:grid;place-items:center;margin-bottom:22px}
.activa-landing-page .pillar h3{font-size:1.56rem;font-weight:500;color:var(--bone)}
.activa-landing-page .pillar p{margin-top:12px;color:var(--slate);font-size:1.13rem}
@media(max-width:720px){.activa-landing-page .pillars{grid-template-columns:1fr}}

.activa-landing-page .feat-row{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));
  border:1px solid var(--line);border-radius:18px;overflow:hidden}
.activa-landing-page .feat{padding:34px 28px;border-right:1px solid var(--line);border-bottom:1px solid var(--line)}
.activa-landing-page .feat .fi{font-size:1.8rem;margin-bottom:16px;color:var(--aurora)}
.activa-landing-page .feat h3{font-size:1.27rem;font-weight:600;color:var(--bone)}
.activa-landing-page .feat p{margin-top:10px;color:var(--slate);font-size:1.08rem}

.activa-landing-page .ben-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:20px}
.activa-landing-page .ben{padding:28px 26px;border:1px solid var(--line);border-radius:14px;background:rgba(255,255,255,.012);transition:.25s}
.activa-landing-page .ben:hover{background:rgba(198,161,91,.05);border-color:rgba(198,161,91,.35)}
.activa-landing-page .ben .k{color:var(--gold);font-size:.94rem;letter-spacing:.1em;text-transform:uppercase;font-weight:600}
.activa-landing-page .ben h3{font-size:1.37rem;font-weight:500;margin-top:12px;color:var(--bone)}
.activa-landing-page .ben p{margin-top:9px;color:var(--slate);font-size:1.1rem}
@media(max-width:900px){.activa-landing-page .ben-grid{grid-template-columns:1fr 1fr}}
@media(max-width:600px){.activa-landing-page .ben-grid{grid-template-columns:1fr}}

.activa-landing-page .gal{display:grid;grid-template-columns:repeat(2,1fr);gap:20px}
.activa-landing-page .gc{position:relative;border-radius:18px;overflow:hidden;aspect-ratio:4/3;border:1px solid var(--line)}
.activa-landing-page .gc img{width:100%;height:100%;object-fit:cover;display:block;transition:transform .6s ease}
.activa-landing-page .gc:hover img{transform:scale(1.05)}
.activa-landing-page .gc .cap{position:absolute;inset:0;display:flex;flex-direction:column;justify-content:flex-end;padding:26px;
  background:linear-gradient(0deg,rgba(8,10,16,.9),rgba(8,10,16,.15) 55%,transparent)}
.activa-landing-page .gc .cap .t{font-size:.86rem;letter-spacing:.16em;text-transform:uppercase;color:var(--gold);font-weight:600}
.activa-landing-page .gc .cap h3{font-size:1.54rem;font-weight:500;color:#fff;margin-top:6px;font-family:var(--font-fraunces),serif}
.activa-landing-page .gc .cap p{margin-top:6px;color:#C9CDD6;font-size:1.08rem;max-width:32em}
@media(max-width:720px){.activa-landing-page .gal{grid-template-columns:1fr}}
.activa-landing-page .more-uses{margin-top:22px;display:flex;flex-wrap:wrap;gap:12px}
.activa-landing-page .chip{border:1px solid var(--line);border-radius:100px;padding:9px 18px;font-size:1.03rem;color:#C1C6D0;
  display:flex;align-items:center;gap:.5em;background:rgba(255,255,255,.012)}
.activa-landing-page .chip::before{content:"◦";color:var(--aurora)}

.activa-landing-page .steps{display:grid;grid-template-columns:repeat(4,1fr)}
.activa-landing-page .step{padding:0 26px;position:relative}
.activa-landing-page .step:not(:last-child)::after{content:"";position:absolute;top:26px;right:0;width:1px;height:70%;background:var(--line)}
.activa-landing-page .step .n{font-family:var(--font-fraunces),serif;font-size:3.84rem;color:var(--gold);line-height:1}
.activa-landing-page .step h3{font-size:1.3rem;font-weight:500;margin-top:16px;color:var(--bone)}
.activa-landing-page .step p{margin-top:8px;color:var(--slate);font-size:1.08rem}
@media(max-width:820px){.activa-landing-page .steps{grid-template-columns:1fr 1fr;gap:36px 0}.activa-landing-page .step:nth-child(2)::after{display:none}}
@media(max-width:520px){.activa-landing-page .steps{grid-template-columns:1fr}.activa-landing-page .step::after{display:none!important}}

.activa-landing-page .final{position:relative;text-align:center;border:1px solid var(--line);border-radius:26px;padding:80px 40px;overflow:hidden;
  background:radial-gradient(circle at 50% 0%,rgba(95,211,196,.10),transparent 60%),linear-gradient(160deg,var(--panel),var(--panel-2))}
.activa-landing-page .final .eyebrow{justify-content:center;margin-bottom:22px}
.activa-landing-page .final h2{font-size:clamp(2.52rem,5.28vw,3.96rem);font-weight:300}
.activa-landing-page .final h2 em{font-style:italic;color:var(--gold-soft)}
.activa-landing-page .final p{max-width:44em;margin:20px auto 0;color:#C1C6D0}
.activa-landing-page .final .buy{margin-top:38px;display:flex;align-items:center;justify-content:center;gap:28px;flex-wrap:wrap}
.activa-landing-page .final .price{align-items:center}
.activa-landing-page .final .price .amt{font-size:3.12rem}

.activa-landing-page footer{padding:60px 0 70px;border-top:1px solid var(--line);margin-top:120px}
.activa-landing-page .foot{display:flex;justify-content:space-between;gap:30px;flex-wrap:wrap;align-items:flex-start}
.activa-landing-page .foot .brand{display:block;margin-bottom:14px}
.activa-landing-page .foot p{color:var(--slate);font-size:1.03rem;max-width:34em}
.activa-landing-page .foot .price{text-align:right}
.activa-landing-page .foot .price .amt{font-family:var(--font-fraunces),serif;font-size:2.16rem}
.activa-landing-page .disclaimer{margin-top:28px;color:#6B7285;font-size:.91rem;line-height:1.6;max-width:62em}

.activa-landing-page .reveal{opacity:0;transform:translateY(24px);transition:opacity .8s ease,transform .8s ease}
.activa-landing-page .reveal.in{opacity:1;transform:none}
@media(prefers-reduced-motion:reduce){.activa-landing-page *{animation:none!important}.activa-landing-page .reveal{opacity:1;transform:none;transition:none}}
.activa-landing-page :focus-visible{outline:2px solid var(--aurora);outline-offset:3px;border-radius:4px}
`;
