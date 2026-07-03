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
  // Lacquerware pairing: ivory-gold medallion for white, near-black lacquer for black —
  // both traced in burnished gold linework, echoing ลายรดน้ำ gilt-on-lacquer motifs.
  const fill = isWhite ? "#ecdcb2" : "#20150c";
  const stroke = isWhite ? "#8b6b23" : "#c9a227";
  const innerLine = isWhite ? "#c9a227" : "#e8c766";
  const textFill = isWhite ? "#3a2410" : "#e8c766";

  return (
    <svg viewBox="0 0 100 100" width={size} height={size} role="img" aria-label={pieceAriaLabel(piece)}>
      <g fill={fill} stroke={stroke} strokeWidth="5" strokeLinejoin="round">
        <Shape type={piece.type} />
      </g>
      <g
        fill="none"
        stroke={innerLine}
        strokeWidth="1.4"
        strokeLinejoin="round"
        opacity="0.85"
        transform="translate(50 50) scale(0.82) translate(-50 -50)"
      >
        <Shape type={piece.type} />
      </g>
      <text
        x="50"
        y="62"
        textAnchor="middle"
        fontSize="34"
        fontWeight="700"
        fill={textFill}
        fontFamily="'Pridi', 'Noto Sans Thai', system-ui, sans-serif"
      >
        {LABEL[piece.type]}
      </text>
      {piece.promoted && (
        <circle cx="80" cy="22" r="9" fill="#c04255" stroke="#e8c766" strokeWidth="2" />
      )}
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
