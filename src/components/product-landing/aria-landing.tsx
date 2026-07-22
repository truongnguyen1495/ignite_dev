"use client";

import { useEffect, useRef } from "react";
import { Fraunces, Be_Vietnam_Pro } from "next/font/google";
import { formatVND } from "@/lib/currency";
import { getPricing } from "@/lib/pricing";
import { ProductBuyButton } from "@/components/product-buy-button";

// Bespoke landing page for exactly one product (today: "sanarey-aria") — see
// the branch in ./page.tsx. Ported verbatim (structure, copy, animation)
// from a hand-designed reference file the user supplied, with only the
// placeholder images/price/CV swapped for real Product data. Every other
// product uses the plain fallback in generic-product-detail.tsx instead —
// this is deliberately NOT a reusable template (explicit user decision).
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

export type AriaLandingProduct = {
  id: string;
  title: string;
  price: number;
  salePrice: number | null;
  cv: number;
  imageUrl: string | null;
  lifestyleImage1Url: string | null;
  lifestyleImage2Url: string | null;
  lifestyleImage3Url: string | null;
};

export function AriaLandingPage({
  product,
  salesEnabled,
}: {
  product: AriaLandingProduct;
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
    document.querySelectorAll(".aria-landing-page .reveal").forEach((el) => io.observe(el));

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
    <div className={`aria-landing-page ${fraunces.variable} ${beVietnamPro.variable}`}>
      <style>{ARIA_LANDING_CSS}</style>

      <div className="aura"></div>
      <div className="grain"></div>

      <nav ref={navRef}>
        <div className="brand">
          SANAREY <b>Aria</b>
        </div>
        <div className="nav-links">
          <a href="#hinh-hoc">Hình học</a>
          <a href="#cong-nghe">Công nghệ</a>
          <a href="#loi-ich">Lợi ích</a>
          <a href="#doi-tuong">Đối tượng</a>
          <a href="#dat-hang" className="nav-cta">
            Đặt hàng
          </a>
        </div>
      </nav>

      <header className="wrap hero">
        <div>
          <span className="eyebrow">Công nghệ trường sinh học đeo được</span>
          <h1>
            Biến đổi <em>trường sinh học</em> của bạn
          </h1>
          <p className="lede">
            SANAREY Aria được thiết kế để bảo vệ, hài hòa và nâng cao năng lượng của bạn — trong một môi trường ngày
            càng phức tạp bởi công nghệ.
          </p>
          <div className="hero-actions">
            <a href="#dat-hang" className="btn">
              Sở hữu Aria <span aria-hidden="true">→</span>
            </a>
            <a href="#hinh-hoc" className="btn ghost">
              Khám phá hình học
            </a>
          </div>
        </div>
        <div className="stage" aria-hidden="true">
          <svg className="geo" viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg">
            <g className="breathe">
              <g className="fol">
                <circle cx="158.0" cy="127.25" r="42.0" />
                <circle cx="200.0" cy="127.25" r="42.0" />
                <circle cx="242.0" cy="127.25" r="42.0" />
                <circle cx="137.0" cy="163.63" r="42.0" />
                <circle cx="179.0" cy="163.63" r="42.0" />
                <circle cx="221.0" cy="163.63" r="42.0" />
                <circle cx="263.0" cy="163.63" r="42.0" />
                <circle cx="116.0" cy="200.0" r="42.0" />
                <circle cx="158.0" cy="200.0" r="42.0" />
                <circle cx="200.0" cy="200.0" r="42.0" />
                <circle cx="242.0" cy="200.0" r="42.0" />
                <circle cx="284.0" cy="200.0" r="42.0" />
                <circle cx="137.0" cy="236.37" r="42.0" />
                <circle cx="179.0" cy="236.37" r="42.0" />
                <circle cx="221.0" cy="236.37" r="42.0" />
                <circle cx="263.0" cy="236.37" r="42.0" />
                <circle cx="158.0" cy="272.75" r="42.0" />
                <circle cx="200.0" cy="272.75" r="42.0" />
                <circle cx="242.0" cy="272.75" r="42.0" />
              </g>
            </g>
            <circle className="ring rot cw-slow" cx="200" cy="200" r="175" />
            <polygon
              className="oct1 rot cw"
              points="338.58,257.4 257.4,338.58 142.6,338.58 61.42,257.4 61.42,142.6 142.6,61.42 257.4,61.42 338.58,142.6"
            />
            <polygon
              className="oct2 rot ccw"
              points="310.87,245.92 245.92,310.87 154.08,310.87 89.13,245.92 89.13,154.08 154.08,89.13 245.92,89.13 310.87,154.08"
            />
            <path
              className="spiral rot cw"
              d="M 206.0 200.0 L 206.2 200.7 L 206.3 201.5 L 206.3 202.4 L 206.2 203.2 L 206.0 204.1 L 205.6 204.9 L 205.2 205.8 L 204.6 206.6 L 203.9 207.4 L 203.1 208.1 L 202.2 208.7 L 201.2 209.2 L 200.1 209.7 L 198.9 210.0 L 197.6 210.1 L 196.3 210.2 L 194.9 210.0 L 193.5 209.7 L 192.1 209.2 L 190.8 208.5 L 189.4 207.6 L 188.2 206.5 L 187.0 205.2 L 186.0 203.7 L 185.1 202.1 L 184.4 200.3 L 183.9 198.4 L 183.6 196.4 L 183.6 194.2 L 183.8 192.0 L 184.3 189.7 L 185.1 187.5 L 186.2 185.3 L 187.6 183.1 L 189.3 181.1 L 191.4 179.2 L 193.7 177.5 L 196.3 176.0 L 199.2 174.8 L 202.3 174.0 L 205.6 173.5 L 209.0 173.4 L 212.6 173.7 L 216.3 174.5 L 219.9 175.8 L 223.5 177.5 L 227.0 179.7 L 230.3 182.5 L 233.4 185.7 L 236.2 189.5 L 238.6 193.6 L 240.5 198.2 L 242.0 203.2 L 242.8 208.5 L 243.1 214.1 L 242.6 219.9 L 241.4 225.8 L 239.4 231.7 L 236.7 237.5 L 233.1 243.2 L 228.8 248.6 L 223.6 253.7 L 217.6 258.2 L 210.9 262.1 L 203.5 265.4 L 195.5 267.8 L 187.0 269.2 L 178.0 269.7 L 168.7 269.0 L 159.2 267.2 L 149.6 264.2 L 140.1 259.8 L 130.9 254.2 L 122.1 247.2 L 113.9 239.0 L 106.5 229.4 L 100.0 218.7 L 94.7 206.8 L 90.7 194.0 L 88.1 180.2 L 87.2 165.7 L 88.1 150.7 L 90.9 135.3 L 95.7 119.8 L 102.5 104.4 L 111.4 89.5 L 122.5 75.2 L 135.7 61.8 L 150.9 49.7 L 168.1 39.1 L 187.1 30.3"
            />
          </svg>
          <div className="halo"></div>
          {product.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="pendant" src={product.imageUrl} alt="Mặt dây chuyền Sanarey Aria" />
          )}
        </div>
      </header>

      <div className="wrap">
        <div className="hr"></div>
      </div>

      <section className="section">
        <div className="wrap">
          <div className="thesis reveal">
            <h2>
              Một lá chắn năng lượng cho <em>đời sống hiện đại</em>
            </h2>
            <p>
              Là bước tiến trong lĩnh vực thiết bị đeo chăm sóc sức khỏe, Aria được thiết kế để hỗ trợ cơ thể chống
              lại những áp lực năng lượng vô hình quanh ta mỗi ngày.
            </p>
          </div>
          <div className="protect">
            <div className="pc reveal">
              <div className="ic">📡</div>
              <h3>Bức xạ điện từ &amp; không dây</h3>
            </div>
            <div className="pc reveal">
              <div className="ic">🛰️</div>
              <h3>Tác động của mạng 5G</h3>
            </div>
            <div className="pc reveal">
              <div className="ic">🌪️</div>
              <h3>Căng thẳng năng lượng môi trường</h3>
            </div>
            <div className="pc reveal">
              <div className="ic">🔋</div>
              <h3>Mệt mỏi tinh thần &amp; thể chất</h3>
            </div>
          </div>
        </div>
      </section>

      <div className="wrap">
        <div className="hr"></div>
      </div>

      <section className="section" id="hinh-hoc">
        <div className="wrap split">
          <div className="reveal">
            <span className="eyebrow">Trí tuệ của hình thức</span>
            <h2>
              Hình bát giác <em>135°</em> — hình học chức năng
            </h2>
            <p>
              Trái tim của Aria là cấu trúc bát giác 135° được thiết kế chính xác, bắt nguồn từ dãy Fibonacci và tỷ
              lệ vàng — những nguyên tắc chi phối sự phát triển, tỷ lệ và hài hòa trong tự nhiên và vũ trụ. Đây không
              đơn thuần là thiết kế; đây là hình học chức năng.
            </p>
            <div className="principles">
              <div className="pr">
                <b>Hình học</b>
                <span>định hướng sự vận động và tổ chức của năng lượng.</span>
              </div>
              <div className="pr">
                <b>Tỷ lệ</b>
                <span>quyết định hiệu suất cộng hưởng.</span>
              </div>
              <div className="pr">
                <b>Tính đối xứng</b>
                <span>tạo nên sự ổn định và tính mạch lạc.</span>
              </div>
            </div>
            <div className="fol-note">
              <b>Sự hội nhập của Hoa Sự Sống</b>
              <p>
                Ẩn sâu bên trong Aria là Hoa Sự Sống — khuôn mẫu hình học cho sự mạch lạc. Khi kết hợp với bát giác
                dựa trên Fibonacci, nó tạo ra một trường hình học đa lớp: tổ chức dòng chảy năng lượng, tăng tính
                đồng nhất của cộng hưởng và hỗ trợ sự hài hòa tự nhiên của trường sinh học.
              </p>
            </div>
          </div>
          <div className="geo-panel reveal">
            <div className="angle-tag">
              135°<span>Bát giác chính xác</span>
            </div>
            <svg className="geo-static" viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg">
              <g className="fol">
                <circle cx="158.0" cy="127.25" r="42.0" />
                <circle cx="200.0" cy="127.25" r="42.0" />
                <circle cx="242.0" cy="127.25" r="42.0" />
                <circle cx="137.0" cy="163.63" r="42.0" />
                <circle cx="179.0" cy="163.63" r="42.0" />
                <circle cx="221.0" cy="163.63" r="42.0" />
                <circle cx="263.0" cy="163.63" r="42.0" />
                <circle cx="116.0" cy="200.0" r="42.0" />
                <circle cx="158.0" cy="200.0" r="42.0" />
                <circle cx="200.0" cy="200.0" r="42.0" />
                <circle cx="242.0" cy="200.0" r="42.0" />
                <circle cx="284.0" cy="200.0" r="42.0" />
                <circle cx="137.0" cy="236.37" r="42.0" />
                <circle cx="179.0" cy="236.37" r="42.0" />
                <circle cx="221.0" cy="236.37" r="42.0" />
                <circle cx="263.0" cy="236.37" r="42.0" />
                <circle cx="158.0" cy="272.75" r="42.0" />
                <circle cx="200.0" cy="272.75" r="42.0" />
                <circle cx="242.0" cy="272.75" r="42.0" />
              </g>
              <polygon
                className="oct2"
                points="310.87,245.92 245.92,310.87 154.08,310.87 89.13,245.92 89.13,154.08 154.08,89.13 245.92,89.13 310.87,154.08"
              />
              <polygon
                className="oct1"
                points="338.58,257.4 257.4,338.58 142.6,338.58 61.42,257.4 61.42,142.6 142.6,61.42 257.4,61.42 338.58,142.6"
              />
              <path
                className="spiral"
                d="M 206.0 200.0 L 206.2 200.7 L 206.3 201.5 L 206.3 202.4 L 206.2 203.2 L 206.0 204.1 L 205.6 204.9 L 205.2 205.8 L 204.6 206.6 L 203.9 207.4 L 203.1 208.1 L 202.2 208.7 L 201.2 209.2 L 200.1 209.7 L 198.9 210.0 L 197.6 210.1 L 196.3 210.2 L 194.9 210.0 L 193.5 209.7 L 192.1 209.2 L 190.8 208.5 L 189.4 207.6 L 188.2 206.5 L 187.0 205.2 L 186.0 203.7 L 185.1 202.1 L 184.4 200.3 L 183.9 198.4 L 183.6 196.4 L 183.6 194.2 L 183.8 192.0 L 184.3 189.7 L 185.1 187.5 L 186.2 185.3 L 187.6 183.1 L 189.3 181.1 L 191.4 179.2 L 193.7 177.5 L 196.3 176.0 L 199.2 174.8 L 202.3 174.0 L 205.6 173.5 L 209.0 173.4 L 212.6 173.7 L 216.3 174.5 L 219.9 175.8 L 223.5 177.5 L 227.0 179.7 L 230.3 182.5 L 233.4 185.7 L 236.2 189.5 L 238.6 193.6 L 240.5 198.2 L 242.0 203.2 L 242.8 208.5 L 243.1 214.1 L 242.6 219.9 L 241.4 225.8 L 239.4 231.7 L 236.7 237.5 L 233.1 243.2 L 228.8 248.6 L 223.6 253.7 L 217.6 258.2 L 210.9 262.1 L 203.5 265.4 L 195.5 267.8 L 187.0 269.2 L 178.0 269.7 L 168.7 269.0 L 159.2 267.2 L 149.6 264.2 L 140.1 259.8 L 130.9 254.2 L 122.1 247.2 L 113.9 239.0 L 106.5 229.4 L 100.0 218.7 L 94.7 206.8 L 90.7 194.0 L 88.1 180.2 L 87.2 165.7 L 88.1 150.7 L 90.9 135.3 L 95.7 119.8 L 102.5 104.4 L 111.4 89.5 L 122.5 75.2 L 135.7 61.8 L 150.9 49.7 L 168.1 39.1 L 187.1 30.3"
              />
              <circle className="dot" cx="206" cy="200" r="3.4" />
            </svg>
          </div>
        </div>
      </section>

      <div className="wrap">
        <div className="hr"></div>
      </div>

      <section className="section" id="cong-nghe">
        <div className="wrap">
          <div className="tech-head reveal">
            <span className="eyebrow">Công nghệ hợp nhất SANAREY · SFT</span>
            <h2>Hệ thống kích hoạt cộng hưởng độc quyền</h2>
            <p>
              SFT dựa trên Định luật Cộng hưởng — nơi các tần số tương đồng tương tác, khuếch đại và tái cấu trúc lẫn
              nhau. Nó hoạt động hài hòa với cơ thể, không áp đặt lực từ bên ngoài.
            </p>
          </div>
          <div className="pillars">
            <div className="pillar reveal">
              <div className="num">01</div>
              <h3>Kích hoạt cộng hưởng</h3>
              <p>
                SFT hỗ trợ và tăng cường trí thông minh năng lượng tự nhiên của cơ thể, cho phép cơ thể tự điều chỉnh
                và tối ưu hóa.
              </p>
              <ul>
                <li>Hoạt động tinh tế, không xâm lấn</li>
                <li>Ổn định về đầu ra</li>
                <li>Không cần nguồn điện hay thao tác</li>
              </ul>
            </div>
            <div className="pillar reveal">
              <div className="num">02</div>
              <h3>Lõi wafer được kích hoạt</h3>
              <p>
                Một tấm bán dẫn hoạt tính được in thông tin năng lượng có cấu trúc, trở thành chất mang và phát xạ ổn
                định các tần số kết hợp.
              </p>
              <ul>
                <li>Phát ra mô hình năng lượng mạch lạc</li>
                <li>Tương tác trực tiếp, không xâm lấn</li>
                <li>Hỗ trợ khả năng tự điều chỉnh của cơ thể</li>
              </ul>
            </div>
            <div className="pillar reveal">
              <div className="num">03</div>
              <h3>Tương tác dựa trên cộng hưởng</h3>
              <p>
                Thay vì ngăn chặn hay che chắn, SFT hoạt động qua sự chuyển đổi và điều chỉnh, hướng các mô hình rối
                loạn đến trạng thái hài hòa.
              </p>
              <ul>
                <li>Hài hòa các hệ thống năng lượng sống</li>
                <li>Giảm nhiễu từ tần số không hài hòa</li>
                <li>Tăng khả năng thích ứng &amp; phục hồi</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <div className="wrap">
        <div className="hr"></div>
      </div>

      <section className="section" id="loi-ich">
        <div className="wrap">
          <div className="tech-head reveal">
            <span className="eyebrow">Những lợi ích chính</span>
            <h2>Năng lượng, sự minh mẫn &amp; khả năng phục hồi</h2>
          </div>
          <div className="ben-grid">
            <div className="ben reveal">
              <div className="ic">⚡</div>
              <h3>Năng lượng &amp; Sức sống</h3>
              <p>Tăng cường mức năng lượng tổng thể và duy trì hiệu suất hàng ngày.</p>
            </div>
            <div className="ben reveal">
              <div className="ic">☯</div>
              <h3>Cân bằng trường sinh học</h3>
              <p>Cân bằng, ổn định lại trường sinh học và hỗ trợ sự gắn kết năng lượng.</p>
            </div>
            <div className="ben reveal">
              <div className="ic">💪</div>
              <h3>Hiệu suất thể chất</h3>
              <p>Cải thiện sức bền và tăng hiệu quả hoạt động tổng thể của cơ thể.</p>
            </div>
            <div className="ben reveal">
              <div className="ic">🌙</div>
              <h3>Giấc ngủ &amp; Phục hồi</h3>
              <p>Thúc đẩy giấc ngủ sâu hơn, phục hồi nhanh khỏi mệt mỏi và lệch múi giờ.</p>
            </div>
            <div className="ben reveal">
              <div className="ic">🛡️</div>
              <h3>Hỗ trợ miễn dịch</h3>
              <p>Tăng cường khả năng phục hồi tự nhiên và hỗ trợ sức khỏe tổng thể.</p>
            </div>
            <div className="ben reveal">
              <div className="ic">🧠</div>
              <h3>Minh mẫn tinh thần</h3>
              <p>Thúc đẩy đồng bộ sóng não, tăng khả năng tập trung và hiệu suất nhận thức.</p>
            </div>
            <div className="ben reveal">
              <div className="ic">🌐</div>
              <h3>Bảo vệ môi trường</h3>
              <p>Hỗ trợ thích ứng với tác động của trường điện từ và mạng 5G quanh bạn.</p>
            </div>
            <div className="ben reveal">
              <div className="ic">🎨</div>
              <h3>Cân bằng cảm xúc</h3>
              <p>Tăng cường sự tích cực, hỗ trợ sáng tạo và ổn định cảm xúc.</p>
            </div>
          </div>
        </div>
      </section>

      <div className="wrap">
        <div className="hr"></div>
      </div>

      <section className="section" id="doi-tuong">
        <div className="wrap who">
          <div className="who-imgs reveal">
            {product.lifestyleImage1Url && (
              <div className="big">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={product.lifestyleImage1Url} alt="Người dùng Sanarey Aria" />
              </div>
            )}
            <div className="row">
              {product.lifestyleImage2Url && (
                <div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={product.lifestyleImage2Url} alt="Người dùng Sanarey Aria" />
                </div>
              )}
              {product.lifestyleImage3Url && (
                <div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={product.lifestyleImage3Url} alt="Người dùng Sanarey Aria" />
                </div>
              )}
            </div>
          </div>
          <div className="who-copy reveal">
            <span className="eyebrow">Ai nên sử dụng</span>
            <h2>Dành cho cuộc sống nhiều kết nối</h2>
            <p>Aria lý tưởng cho những người sống trong môi trường tiếp xúc công nghệ cao hiện nay — đặc biệt nếu bạn:</p>
            <ul className="who-list">
              <li>Thường xuyên dùng điện thoại, máy tính bảng và thiết bị không dây.</li>
              <li>Làm việc trong văn phòng với nhiều hệ thống kỹ thuật số.</li>
              <li>Sống gần hạ tầng 5G hoặc khu vực có bức xạ điện từ cao.</li>
              <li>Thường xuyên đi du lịch, di chuyển qua nhiều múi giờ.</li>
              <li>Cảm thấy mệt mỏi, căng thẳng hoặc thiếu năng lượng.</li>
            </ul>
          </div>
        </div>
      </section>

      <div className="wrap">
        <div className="hr"></div>
      </div>

      <section className="section">
        <div className="wrap">
          <div className="tech-head reveal">
            <span className="eyebrow">Cách sử dụng</span>
            <h2>Đeo bên mình, hỗ trợ liên tục</h2>
          </div>
          <div className="uses reveal">
            <div className="use">
              <div className="ic">👕</div>
              <h3>Trang phục hàng ngày</h3>
              <p>Đeo như mặt dây chuyền sát cơ thể để hỗ trợ năng lượng liên tục.</p>
            </div>
            <div className="use">
              <div className="ic">💼</div>
              <h3>Công việc &amp; Học tập</h3>
              <p>Tăng cường sự tập trung, minh mẫn và năng suất.</p>
            </div>
            <div className="use">
              <div className="ic">✈️</div>
              <h3>Du lịch</h3>
              <p>Hỗ trợ thích ứng với thay đổi môi trường và tình trạng mệt mỏi.</p>
            </div>
            <div className="use">
              <div className="ic">🏃</div>
              <h3>Tập luyện &amp; Hiệu suất</h3>
              <p>Tăng cường sức bền và khả năng phục hồi.</p>
            </div>
            <div className="use">
              <div className="ic">🌙</div>
              <h3>Hỗ trợ giấc ngủ</h3>
              <p>Có thể đeo khi nghỉ ngơi để phục hồi sâu hơn.</p>
            </div>
            <div className="use">
              <div className="ic">🏢</div>
              <h3>Môi trường EMF cao</h3>
              <p>Thích hợp cho văn phòng, đô thị và không gian mật độ công nghệ cao.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="section" id="dat-hang">
        <div className="wrap">
          <div className="final reveal">
            <span className="eyebrow">SANAREY Aria</span>
            <h2>
              Trở thành một phần của <em>môi trường năng lượng</em> của bạn
            </h2>
            <p>
              Aria không ép buộc sự thay đổi. Nó cho phép cơ thể trở lại trạng thái cân bằng, hài hòa và hoạt động tự
              nhiên — ổn định, điều chỉnh và nâng cao trường năng lượng của bạn trong thời gian thực.
            </p>
            {pricing.forSale && (
              <p className="price-line">
                {formatVND(pricing.chargeAmount)}
                {pricing.originalPrice && <span className="price-original">{formatVND(pricing.originalPrice)}</span>}
                <span className="price-cv">CV {product.cv}</span>
              </p>
            )}
            <div className="buy">
              {salesEnabled && pricing.forSale ? (
                <ProductBuyButton
                  productId={product.id}
                  title={product.title}
                  price={pricing.chargeAmount}
                  originalPrice={pricing.originalPrice}
                  className="btn"
                >
                  Đặt hàng ngay <span aria-hidden="true">→</span>
                </ProductBuyButton>
              ) : (
                <a href="#" className="btn" onClick={(e) => e.preventDefault()}>
                  Liên hệ để đặt hàng
                </a>
              )}
              <a href="#hinh-hoc" className="btn ghost">
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
              SANAREY <b>Aria</b>
            </span>
            <p>
              Công nghệ trường sinh học đeo được — bảo vệ, hài hòa và nâng cao năng lượng của bạn trong một môi
              trường ngày càng phức tạp.
            </p>
          </div>
        </div>
        <div className="wrap">
          <p className="disclaimer">
            Lưu ý: SANAREY Aria là sản phẩm chăm sóc sức khỏe năng lượng, hướng đến việc hỗ trợ cân bằng, thư giãn và
            cảm giác khỏe khoắn. Sản phẩm không phải là thiết bị y tế và không nhằm mục đích chẩn đoán, điều trị,
            chữa khỏi hay ngăn ngừa bất kỳ bệnh nào, cũng không thay thế cho tư vấn y tế chuyên nghiệp.
          </p>
        </div>
      </footer>
    </div>
  );
}

// Scoped under .aria-landing-page so nothing here ever touches the rest of
// the app's global styles — every bare-element rule from the original file
// (body/h1-h3/::selection/nav/footer/:focus-visible) is deliberately
// prefixed with that class instead of staying global (the original file was
// a standalone page with its own <body>, safe there; this app's <body> is
// shared across every route). :root's custom properties move onto the same
// class for the same reason. Everything else is copied 1:1 from the
// reference file's <style> block.
const ARIA_LANDING_CSS = `
.aria-landing-page{
  --obsidian:#0A0D14; --panel:#111726; --panel-2:#0E1420;
  --line:rgba(198,161,91,.20);
  --gold:#C6A15B; --gold-soft:#D8BC82;
  --aurora:#5FD3C4;
  --bone:#EDE8DC; --slate:#8B93A6;
}
.aria-landing-page{background:var(--obsidian);color:var(--bone);
  font-family:var(--font-be-vietnam-pro),system-ui,sans-serif;font-weight:300;line-height:1.7;font-size:1.2rem;
  -webkit-font-smoothing:antialiased;overflow-x:hidden;position:relative}
.aria-landing-page h1,.aria-landing-page h2,.aria-landing-page h3{font-family:var(--font-fraunces),Georgia,serif;font-weight:400;line-height:1.1;letter-spacing:-.01em}
.aria-landing-page ::selection{background:var(--gold);color:var(--obsidian)}
.aria-landing-page .wrap{max-width:1140px;margin:0 auto;padding:0 28px}
.aria-landing-page .eyebrow{font-family:var(--font-be-vietnam-pro),sans-serif;font-size:.86rem;font-weight:600;
  letter-spacing:.28em;text-transform:uppercase;color:var(--gold);
  display:inline-flex;align-items:center;gap:.7em}
.aria-landing-page .eyebrow::before{content:"";width:26px;height:1px;background:var(--gold);opacity:.7}
.aria-landing-page .section{padding:120px 0;position:relative}
.aria-landing-page .hr{height:1px;background:linear-gradient(90deg,transparent,var(--line),transparent)}

.aria-landing-page .aura{position:absolute;inset:0;z-index:0;pointer-events:none}
.aria-landing-page .aura::before{content:"";position:absolute;top:-8%;left:50%;transform:translateX(-50%);
  width:820px;height:820px;border-radius:50%;
  background:radial-gradient(circle,rgba(95,211,196,.09),transparent 62%)}
.aria-landing-page .aura::after{content:"";position:absolute;bottom:-18%;right:-8%;width:640px;height:640px;border-radius:50%;
  background:radial-gradient(circle,rgba(198,161,91,.10),transparent 60%)}
.aria-landing-page .grain{position:absolute;inset:0;z-index:0;opacity:.035;pointer-events:none;
  background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")}

.aria-landing-page nav{position:sticky;top:0;left:0;right:0;z-index:50;display:flex;align-items:center;justify-content:space-between;
  padding:20px 28px;-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);
  background:linear-gradient(180deg,rgba(10,13,20,.85),rgba(10,13,20,0));transition:background .3s}
.aria-landing-page .brand{font-family:var(--font-fraunces),serif;font-size:1.54rem;letter-spacing:.02em;color:var(--bone)}
.aria-landing-page .brand b{color:var(--gold);font-weight:500}
.aria-landing-page .nav-links{display:flex;gap:34px;align-items:center}
.aria-landing-page .nav-links a{color:var(--slate);text-decoration:none;font-size:1.02rem;transition:.2s}
.aria-landing-page .nav-links a:hover{color:var(--bone)}
.aria-landing-page .nav-cta{font-size:.96rem!important;font-weight:500;color:var(--bone)!important;
  border:1px solid var(--line);padding:9px 20px;border-radius:100px;transition:.25s;white-space:nowrap}
.aria-landing-page .nav-cta:hover{border-color:var(--gold);color:var(--gold)!important;background:rgba(198,161,91,.06)}
@media(max-width:860px){.aria-landing-page .nav-links a:not(.nav-cta){display:none}}

.aria-landing-page .btn{display:inline-flex;align-items:center;gap:.6em;
  background:linear-gradient(135deg,var(--gold),var(--gold-soft));color:#1a1408;
  font-weight:600;font-size:1.14rem;padding:15px 30px;border-radius:100px;text-decoration:none;border:none;cursor:pointer;
  box-shadow:0 10px 30px -12px rgba(198,161,91,.6);transition:.25s}
.aria-landing-page .btn:hover{transform:translateY(-2px);box-shadow:0 16px 38px -12px rgba(198,161,91,.75)}
.aria-landing-page .btn.ghost{background:none;color:var(--bone);border:1px solid var(--line);box-shadow:none;font-weight:400}
.aria-landing-page .btn.ghost:hover{border-color:var(--aurora);color:var(--aurora);transform:none}

.aria-landing-page .hero{min-height:100vh;display:grid;grid-template-columns:1.02fr .98fr;align-items:center;gap:30px;padding-top:90px}
.aria-landing-page .hero h1{font-size:clamp(3.48rem,7.2vw,6rem);font-weight:300}
.aria-landing-page .hero h1 em{font-style:italic;color:var(--gold-soft);font-weight:400}
.aria-landing-page .hero .eyebrow{margin-bottom:26px}
.aria-landing-page .hero .lede{margin-top:24px;max-width:32em;color:#C7CBD4;font-size:1.27rem}
.aria-landing-page .hero-actions{margin-top:36px;display:flex;gap:16px;flex-wrap:wrap}

.aria-landing-page .stage{position:relative;display:grid;place-items:center;min-height:560px}
.aria-landing-page .geo{position:absolute;width:min(94%,560px);aspect-ratio:1;z-index:0;overflow:visible}
.aria-landing-page .geo .fol{fill:none;stroke:rgba(95,211,196,.10);stroke-width:.6}
.aria-landing-page .geo .oct1{fill:none;stroke:rgba(198,161,91,.30);stroke-width:1}
.aria-landing-page .geo .oct2{fill:none;stroke:rgba(95,211,196,.22);stroke-width:1;stroke-dasharray:3 6}
.aria-landing-page .geo .spiral{fill:none;stroke:rgba(216,188,130,.45);stroke-width:1.1;stroke-linecap:round}
.aria-landing-page .geo .ring{fill:none;stroke:rgba(198,161,91,.14);stroke-width:.6}
.aria-landing-page .rot{transform-box:view-box;transform-origin:200px 200px}
.aria-landing-page .cw{animation:aria-rot 46s linear infinite}
.aria-landing-page .ccw{animation:aria-rot 62s linear infinite reverse}
.aria-landing-page .cw-slow{animation:aria-rot 90s linear infinite}
@keyframes aria-rot{to{transform:rotate(360deg)}}
.aria-landing-page .breathe{animation:aria-breathe 8s ease-in-out infinite;transform-box:view-box;transform-origin:200px 200px}
@keyframes aria-breathe{0%,100%{opacity:.6}50%{opacity:1}}
.aria-landing-page .halo{position:absolute;width:300px;height:300px;border-radius:50%;z-index:0;
  background:radial-gradient(circle,rgba(198,161,91,.16),transparent 66%);filter:blur(10px)}
.aria-landing-page .pendant{position:relative;z-index:2;width:min(58%,300px);
  filter:drop-shadow(0 26px 44px rgba(0,0,0,.6)) drop-shadow(0 0 30px rgba(198,161,91,.16));
  animation:aria-float 7s ease-in-out infinite}
@keyframes aria-float{0%,100%{transform:translateY(-7px)}50%{transform:translateY(7px)}}

@media(max-width:920px){
  .aria-landing-page .hero{grid-template-columns:1fr;text-align:center;padding-top:118px;gap:8px}
  .aria-landing-page .hero .eyebrow,.aria-landing-page .hero-actions{justify-content:center}
  .aria-landing-page .hero .lede{margin-left:auto;margin-right:auto}
  .aria-landing-page .stage{min-height:420px;order:-1}.aria-landing-page .geo{width:min(88%,420px)}
}

.aria-landing-page .thesis{text-align:center;max-width:760px;margin:0 auto 56px}
.aria-landing-page .thesis h2{font-size:clamp(2.28rem,4.32vw,3.36rem);font-weight:300}
.aria-landing-page .thesis h2 em{font-style:italic;color:var(--gold-soft)}
.aria-landing-page .thesis p{margin-top:20px;color:#C1C6D0;font-size:1.27rem}
.aria-landing-page .protect{display:grid;grid-template-columns:repeat(4,1fr);gap:18px}
.aria-landing-page .pc{border:1px solid var(--line);border-radius:16px;padding:30px 24px;text-align:center;
  background:linear-gradient(165deg,rgba(255,255,255,.02),transparent);transition:.25s}
.aria-landing-page .pc:hover{border-color:rgba(95,211,196,.4);transform:translateY(-3px)}
.aria-landing-page .pc .ic{font-size:1.8rem;color:var(--aurora);margin-bottom:14px}
.aria-landing-page .pc h3{font-size:1.22rem;font-weight:600;color:var(--bone)}
@media(max-width:820px){.aria-landing-page .protect{grid-template-columns:1fr 1fr}}

.aria-landing-page .split{display:grid;grid-template-columns:1fr 1fr;gap:60px;align-items:center}
.aria-landing-page .split h2{font-size:clamp(2.16rem,4.08vw,3.24rem);font-weight:300;margin-top:18px}
.aria-landing-page .split h2 em{font-style:italic;color:var(--gold-soft)}
.aria-landing-page .split p{margin-top:18px;color:#B9BEC9}
.aria-landing-page .principles{margin-top:28px;display:flex;flex-direction:column;gap:2px;
  border-top:1px solid var(--line)}
.aria-landing-page .pr{padding:16px 0;border-bottom:1px solid var(--line);display:flex;gap:16px;align-items:baseline}
.aria-landing-page .pr b{font-family:var(--font-fraunces),serif;color:var(--gold);font-size:1.26rem;font-weight:500;white-space:nowrap}
.aria-landing-page .pr span{color:var(--slate);font-size:1.14rem}
.aria-landing-page .geo-panel{position:relative;border:1px solid var(--line);border-radius:20px;
  background:radial-gradient(circle at 50% 45%,rgba(198,161,91,.08),transparent 60%),
    linear-gradient(160deg,var(--panel),var(--panel-2));
  aspect-ratio:1;display:grid;place-items:center;overflow:hidden}
.aria-landing-page .geo-static{width:82%;overflow:visible}
.aria-landing-page .geo-static .fol{fill:none;stroke:rgba(95,211,196,.16);stroke-width:.7}
.aria-landing-page .geo-static .oct1{fill:none;stroke:rgba(216,188,130,.55);stroke-width:1.2}
.aria-landing-page .geo-static .oct2{fill:none;stroke:rgba(95,211,196,.3);stroke-width:1}
.aria-landing-page .geo-static .spiral{fill:none;stroke:var(--gold-soft);stroke-width:1.3;stroke-linecap:round}
.aria-landing-page .geo-static .dot{fill:var(--gold-soft)}
.aria-landing-page .angle-tag{position:absolute;top:20px;left:20px;font-family:var(--font-fraunces),serif;
  color:var(--gold-soft);font-size:1.8rem}
.aria-landing-page .angle-tag span{display:block;font-family:var(--font-be-vietnam-pro);font-size:.74rem;letter-spacing:.2em;
  text-transform:uppercase;color:var(--slate);margin-top:2px}
@media(max-width:820px){.aria-landing-page .split{grid-template-columns:1fr;gap:40px}.aria-landing-page .geo-panel{order:-1;max-width:420px;margin:0 auto;width:100%}}

.aria-landing-page .fol-note{margin-top:26px;padding:22px 24px;border:1px solid var(--line);border-radius:14px;
  background:rgba(255,255,255,.015)}
.aria-landing-page .fol-note b{color:var(--gold-soft);font-family:var(--font-fraunces),serif;font-weight:500}
.aria-landing-page .fol-note p{margin-top:8px;color:var(--slate);font-size:1.13rem}

.aria-landing-page .tech-head{text-align:center;max-width:660px;margin:0 auto 60px}
.aria-landing-page .tech-head h2{font-size:clamp(2.28rem,4.32vw,3.36rem);font-weight:300;margin-top:16px}
.aria-landing-page .tech-head p{margin-top:16px;color:#B9BEC9}
.aria-landing-page .pillars{display:grid;grid-template-columns:repeat(3,1fr);gap:22px}
.aria-landing-page .pillar{border:1px solid var(--line);border-radius:16px;padding:34px 30px;
  background:linear-gradient(165deg,rgba(255,255,255,.02),transparent);transition:.3s}
.aria-landing-page .pillar:hover{border-color:rgba(198,161,91,.45);transform:translateY(-3px)}
.aria-landing-page .pillar .num{font-family:var(--font-fraunces),serif;font-size:1.26rem;color:var(--gold);
  width:44px;height:44px;border:1px solid var(--line);border-radius:50%;display:grid;place-items:center;margin-bottom:22px}
.aria-landing-page .pillar h3{font-size:1.54rem;font-weight:500;color:var(--bone)}
.aria-landing-page .pillar>p{margin-top:12px;color:var(--slate);font-size:1.13rem}
.aria-landing-page .pillar ul{margin-top:16px;list-style:none;display:flex;flex-direction:column;gap:9px;padding:0}
.aria-landing-page .pillar li{position:relative;padding-left:20px;color:#AEB4C0;font-size:1.08rem}
.aria-landing-page .pillar li::before{content:"◇";position:absolute;left:0;color:var(--aurora);font-size:.84rem;top:3px}
@media(max-width:820px){.aria-landing-page .pillars{grid-template-columns:1fr}}

.aria-landing-page .ben-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:18px}
.aria-landing-page .ben{padding:26px 24px;border:1px solid var(--line);border-radius:14px;
  background:rgba(255,255,255,.012);transition:.25s}
.aria-landing-page .ben:hover{background:rgba(198,161,91,.05);border-color:rgba(198,161,91,.35)}
.aria-landing-page .ben .ic{font-size:1.56rem;margin-bottom:14px}
.aria-landing-page .ben h3{font-size:1.27rem;font-weight:500;color:var(--bone)}
.aria-landing-page .ben p{margin-top:8px;color:var(--slate);font-size:1.06rem}
@media(max-width:900px){.aria-landing-page .ben-grid{grid-template-columns:1fr 1fr}}
@media(max-width:520px){.aria-landing-page .ben-grid{grid-template-columns:1fr}}

.aria-landing-page .who{display:grid;grid-template-columns:1.15fr .85fr;gap:40px;align-items:stretch}
.aria-landing-page .who-imgs{display:grid;grid-template-rows:1.4fr 1fr;gap:16px}
.aria-landing-page .who-imgs .big{border-radius:18px;overflow:hidden;position:relative}
.aria-landing-page .who-imgs .big img{width:100%;height:100%;object-fit:cover;display:block}
.aria-landing-page .who-imgs .row{display:grid;grid-template-columns:1fr 1fr;gap:16px}
.aria-landing-page .who-imgs .row div{border-radius:18px;overflow:hidden;aspect-ratio:1}
.aria-landing-page .who-imgs .row img{width:100%;height:100%;object-fit:cover;display:block}
.aria-landing-page .who-copy{display:flex;flex-direction:column;justify-content:center}
.aria-landing-page .who-copy h2{font-size:clamp(2.16rem,4.08vw,3.12rem);font-weight:300;margin-top:16px}
.aria-landing-page .who-copy>p{margin-top:16px;color:#B9BEC9}
.aria-landing-page .who-list{margin-top:24px;list-style:none;padding:0;display:flex;flex-direction:column;gap:0;border-top:1px solid var(--line)}
.aria-landing-page .who-list li{padding:15px 0;border-bottom:1px solid var(--line);color:#C1C6D0;font-size:1.15rem;
  display:flex;gap:14px;align-items:flex-start}
.aria-landing-page .who-list li::before{content:"→";color:var(--gold);flex:none}
@media(max-width:860px){.aria-landing-page .who{grid-template-columns:1fr;gap:32px}.aria-landing-page .who-imgs{grid-template-rows:auto}}

.aria-landing-page .uses{display:grid;grid-template-columns:repeat(3,1fr);gap:2px;background:var(--line);
  border:1px solid var(--line);border-radius:18px;overflow:hidden}
.aria-landing-page .use{background:var(--obsidian);padding:32px 28px;transition:.25s}
.aria-landing-page .use:hover{background:var(--panel)}
.aria-landing-page .use .ic{font-size:1.8rem;margin-bottom:14px}
.aria-landing-page .use h3{font-size:1.3rem;font-weight:600;color:var(--bone)}
.aria-landing-page .use p{margin-top:8px;color:var(--slate);font-size:1.08rem}
@media(max-width:760px){.aria-landing-page .uses{grid-template-columns:1fr 1fr}}
@media(max-width:480px){.aria-landing-page .uses{grid-template-columns:1fr}}

.aria-landing-page .final{position:relative;text-align:center;border:1px solid var(--line);border-radius:26px;
  padding:80px 40px;overflow:hidden;
  background:radial-gradient(circle at 50% 0%,rgba(95,211,196,.10),transparent 60%),
    linear-gradient(160deg,var(--panel),var(--panel-2))}
.aria-landing-page .final .eyebrow{justify-content:center;margin-bottom:22px}
.aria-landing-page .final h2{font-size:clamp(2.52rem,5.28vw,3.96rem);font-weight:300}
.aria-landing-page .final h2 em{font-style:italic;color:var(--gold-soft)}
.aria-landing-page .final p{max-width:46em;margin:20px auto 0;color:#C1C6D0}
.aria-landing-page .final .price-line{margin-top:28px;display:flex;align-items:baseline;justify-content:center;gap:12px;font-family:var(--font-fraunces),serif;font-size:2.04rem;color:var(--gold-soft)}
.aria-landing-page .final .price-original{font-family:var(--font-be-vietnam-pro),sans-serif;font-size:1.14rem;color:var(--slate);text-decoration:line-through}
.aria-landing-page .final .price-cv{font-family:var(--font-be-vietnam-pro),sans-serif;font-size:.96rem;letter-spacing:.08em;text-transform:uppercase;color:var(--aurora)}
.aria-landing-page .final .buy{margin-top:38px;display:flex;justify-content:center;gap:16px;flex-wrap:wrap}

.aria-landing-page footer{padding:60px 0 70px;border-top:1px solid var(--line);margin-top:120px}
.aria-landing-page .foot{display:flex;justify-content:space-between;gap:30px;flex-wrap:wrap;align-items:flex-start}
.aria-landing-page .foot .brand{display:block;margin-bottom:14px}
.aria-landing-page .foot p{color:var(--slate);font-size:1.03rem;max-width:34em}
.aria-landing-page .disclaimer{margin-top:28px;color:#6B7285;font-size:.91rem;line-height:1.6;max-width:64em}

.aria-landing-page .reveal{opacity:0;transform:translateY(24px);transition:opacity .8s ease,transform .8s ease}
.aria-landing-page .reveal.in{opacity:1;transform:none}
@media(prefers-reduced-motion:reduce){.aria-landing-page *{animation:none!important}.aria-landing-page .reveal{opacity:1;transform:none;transition:none}}
.aria-landing-page :focus-visible{outline:2px solid var(--aurora);outline-offset:3px;border-radius:4px}
`;
