import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Next.js App Home | Modern SaaS Platform',
  description: 'The premier AI-driven productivity platform for high-velocity software engineering teams.',
  alternates: {
    canonical: 'https://example.com'
  }
};

export default function HomePage() {
  return (
    <main>
      <h1>Welcome to SaaS Suite</h1>
      <p>Supercharge your engineering workflow with our next-generation toolset.</p>
      <a href="/about">About Us</a>
      <a href="/blog/ai-productivity-2026">Read our latest blog post</a>
    </main>
  );
}
