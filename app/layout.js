import './globals.css';

export const metadata = {
  title: 'Gestão Revendas',
  description: 'Gestão de revendas e lojas parceiras',
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
