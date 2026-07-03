import type { Piece, PieceType } from "@/lib/makruk";

// Simple hand-drawn shapes + Thai letter labels — no copied artwork. Each piece type gets
// a distinct silhouette so pieces are told apart by shape even before reading the label.
const LABEL: Record<PieceType, string> = {
  khun: "ข",
  met: "ด",
  khon: "ค",
  ma: "ม",
  rua: "ร",
  bia: "บ",
};

function Shape({ type }: { type: PieceType }) {
  switch (type) {
    case "khun":
      // circle + a small crown triangle on top
      return (
        <>
          <circle cx="50" cy="55" r="34" />
          <polygon points="50,10 38,28 62,28" />
        </>
      );
    case "rua":
      // rounded square (castle-like)
      return <rect x="18" y="18" width="64" height="64" rx="14" />;
    case "khon":
      // hexagon
      return <polygon points="50,12 82,32 82,68 50,88 18,68 18,32" />;
    case "ma":
      // triangle (horse-head hint)
      return <polygon points="50,14 86,80 14,80" />;
    case "met":
      return <circle cx="50" cy="50" r="32" />;
    case "bia":
      return <circle cx="50" cy="50" r="24" />;
  }
}

export function PieceIcon({ piece, size = "100%" }: { piece: Piece; size?: string | number }) {
  const isWhite = piece.color === "white";
  const fill = isWhite ? "#faf5ea" : "#3a2a1c";
  const stroke = isWhite ? "#8b5e34" : "#1a1108";
  const textFill = isWhite ? "#3a2a1c" : "#faf5ea";

  return (
    <svg viewBox="0 0 100 100" width={size} height={size} role="img" aria-label={pieceAriaLabel(piece)}>
      <g fill={fill} stroke={stroke} strokeWidth="4" strokeLinejoin="round">
        <Shape type={piece.type} />
      </g>
      <text
        x="50"
        y="62"
        textAnchor="middle"
        fontSize="34"
        fontWeight="700"
        fill={textFill}
        fontFamily="'Noto Sans Thai', system-ui, sans-serif"
      >
        {LABEL[piece.type]}
      </text>
      {piece.promoted && <circle cx="80" cy="22" r="9" fill={isWhite ? "#c9a15a" : "#f4d35e"} stroke={stroke} strokeWidth="2" />}
    </svg>
  );
}

const THAI_NAME: Record<PieceType, string> = {
  khun: "ขุน",
  met: "เม็ด",
  khon: "โคน",
  ma: "ม้า",
  rua: "เรือ",
  bia: "เบี้ย",
};

function pieceAriaLabel(piece: Piece): string {
  const side = piece.color === "white" ? "ฝ่ายขาว" : "ฝ่ายดำ";
  const name = piece.promoted ? "เบี้ยหงาย" : THAI_NAME[piece.type];
  return `${side} ${name}`;
}
