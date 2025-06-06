// Example app/layout.js
export const metadata = {
  title: "Testluy Payment Demo 2",
  description: "Next.js App Router demo for Testluy SDK",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
