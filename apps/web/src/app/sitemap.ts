export default async function sitemap() {
  return [
    {
      url: 'https://quality.nxchile.com/',
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 1,
    },
  ];
}
