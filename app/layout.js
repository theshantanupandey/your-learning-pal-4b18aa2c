import './globals.css';
import Providers from '@/components/Providers';

export const metadata = {
  title: 'Taksh | AI NCERT Tutor',
  description: 'AI-powered NCERT tutor for Classes 6-10. Step-by-step explanations, voice conversations, flashcards & quizzes.',
  keywords: 'NCERT, AI tutor, CBSE, Class 6-10, Taksh',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
