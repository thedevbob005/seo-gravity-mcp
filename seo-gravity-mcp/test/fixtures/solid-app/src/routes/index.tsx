import { Title, Meta, Link } from '@solidjs/meta';

export default function Home() {
  return (
    <main>
      <Title>SolidStart Application Home</Title>
      <Meta name="description" content="Blazing fast reactive application." />
      <Link rel="canonical" href="https://example.com" />
      <h1>Welcome to SolidStart</h1>
    </main>
  );
}
