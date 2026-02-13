import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tech Debugging Challenge | LogiXcape",
  description: "Test your debugging skills across syntax errors, missing code lines, and technical case studies. Can you crack the code?",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <div style={{ position: 'relative', zIndex: 1, minHeight: '100vh' }}>
          {children}
        </div>
      </body>
    </html>
  );
}
