export default async function sitemap() {
  return [
    {
      url: 'https://example.com',
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1
    },
    {
      url: 'https://example.com/about',
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8
    }
  ];
}
