// react-pageflip's IProps marks every FlipSetting field as required even
// though its README documents most of these as having defaults applied at
// runtime — these mirror those documented defaults so callers only need to
// override the fields they actually care about. Shared by PdfFlipbook and
// BookFlipbook so the two don't duplicate this constant.
export const FLIPBOOK_DEFAULTS = {
  startPage: 0,
  drawShadow: true,
  flippingTime: 1000,
  usePortrait: true,
  startZIndex: 0,
  autoSize: true,
  mobileScrollSupport: true,
  clickEventForward: true,
  useMouseEvents: true,
  swipeDistance: 30,
  showPageCorners: true,
  disableFlipByClick: false,
  style: {},
};
