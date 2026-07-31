-- Local/preview test content only. GitHub production deployments do not run
-- seed files.
INSERT INTO public.blog_posts (
  title,
  content,
  image,
  is_premium,
  location,
  category
)
SELECT
  seed.title,
  seed.content,
  seed.image,
  seed.is_premium,
  seed.location,
  seed.category
FROM (
  VALUES (
    'Roma: The Night We Can''t Remember',
    'From Trastevere''s wine bars to Testaccio''s underground clubs, Rome offers an incredible nightlife scene. We started at a rooftop aperitivo with views of the Colosseum, then ended up in a basement club at 5am. The bachelor had no idea what hit him.',
    'https://images.unsplash.com/photo-1552832230-c0197dd311b5?auto=format&fit=crop&w=500&h=300&q=80',
    false,
    'Roma',
    'drink'
  ),
  (
    'Ibiza Uncovered: The Ultimate Party Guide',
    'From Amnesia to Pacha, we break down the best clubs, when to go, and how to do it right. We got VIP access to three clubs in one night, watched the sunrise from a yacht, and somehow everyone made the flight home. Barely.',
    'https://images.unsplash.com/photo-1544552866-d3ed42536cfd?auto=format&fit=crop&w=500&h=300&q=80',
    true,
    'Ibiza',
    'weird'
  ),
  (
    'Cracovia: Eastern Europe''s Hidden Gem',
    'Affordable prices, incredible architecture, and a nightlife scene that rivals any major European city. We spent four days exploring the Old Town by day and the underground clubs by night. The vodka was cheaper than water and twice as dangerous.',
    'https://images.unsplash.com/photo-1578662996442-48f60103fc96?auto=format&fit=crop&w=500&h=300&q=80',
    false,
    'Cracovia',
    'drink'
  )
) AS seed(title, content, image, is_premium, location, category)
WHERE NOT EXISTS (
  SELECT 1
  FROM public.blog_posts AS existing
  WHERE existing.title = seed.title
);
