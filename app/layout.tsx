import "./globals.css";

export const metadata = {
  title: "หมากรุกไทยออนไลน์ — Makruk",
  description: "เล่นหมากรุกไทยออนไลน์ได้ทันที: 2 คนเครื่องเดียว หรือกับบอท 3 ระดับ",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <head>
        <script
          defer
          src="https://umami-host-peerapongsms-projects.vercel.app/script.js"
          data-website-id="3f09453d-0b39-443e-8845-5e65611cc58a"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
