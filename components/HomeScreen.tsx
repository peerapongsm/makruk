"use client";

import { useRouter } from "next/navigation";
import type { Difficulty } from "./MakrukApp";

interface HomeScreenProps {
  onStartHotseat: () => void;
  onStartBot: (difficulty: Difficulty) => void;
  onStartOnline: () => void;
}

export function HomeScreen({ onStartHotseat, onStartBot, onStartOnline }: HomeScreenProps) {
  const router = useRouter();
  return (
    <div className="page home">
      <h1>หมากรุกไทยออนไลน์</h1>
      <p className="home__lede">เลือกโหมดการเล่น — เล่นได้ทันที ไม่ต้องสมัครสมาชิก</p>

      <section className="home__section">
        <h2 className="small-caps">2 คน</h2>
        <button type="button" className="home__mode-btn" onClick={onStartHotseat}>
          2 คนเครื่องเดียว (Hotseat)
        </button>
      </section>

      <section className="home__section">
        <h2 className="small-caps">เล่นกับบอท</h2>
        <div className="home__bot-grid">
          <button type="button" className="home__mode-btn" onClick={() => onStartBot("easy")}>
            บอท: ง่าย
          </button>
          <button type="button" className="home__mode-btn" onClick={() => onStartBot("medium")}>
            บอท: กลาง
          </button>
          <button type="button" className="home__mode-btn" onClick={() => onStartBot("hard")}>
            บอท: ยาก
          </button>
        </div>
      </section>

      <section className="home__section">
        <h2 className="small-caps">เล่นออนไลน์</h2>
        <button type="button" className="home__mode-btn" onClick={onStartOnline}>
          เล่นออนไลน์กับเพื่อน (ลิงก์เชิญ)
        </button>
      </section>

      <p className="home__footnote">เล่นเป็นฝ่ายขาวเสมอเมื่อเล่นกับบอท</p>
      <button type="button" className="plain" onClick={() => router.push("/method/")}>
        วิธีการเล่นและกติกาที่ใช้ →
      </button>
    </div>
  );
}
