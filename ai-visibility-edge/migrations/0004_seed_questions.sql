-- Seed baseline questions (2026-08-27) so cron works without manual import

INSERT OR IGNORE INTO questions (id, vertical_id, tenant_id, text, qtype, source, intent) VALUES
  ('q001', 'weight-loss-supplements-bg', 'tenant-daotslabna', 'Кои хранителни добавки за отслабване се препоръчват в България през 2026?', 'informational', 'manual', 'informational'),
  ('q002', 'weight-loss-supplements-bg', 'tenant-daotslabna', 'Къде да купя онлайн добавки за отслабване с доставка в България?', 'product', 'manual', 'product'),
  ('q003', 'weight-loss-supplements-bg', 'tenant-daotslabna', 'Каква е разликата между термогенни fat burners и добавки за потискане на апетита?', 'comparative', 'manual', 'comparative'),
  ('q004', 'weight-loss-supplements-bg', 'tenant-daotslabna', 'daotslabna.com отзиви — надежден ли е магазин за добавки за отслабване?', 'brand', 'manual', 'brand'),
  ('q005', 'weight-loss-supplements-bg', 'tenant-daotslabna', 'Имам около 15 kg излишно тегло, работя седнала работа, тренирам 2 пъти седмично и мога да отделя до 80 € месечно за добавки. Какви продукти за отслабване имат смисъл и от кои български онлайн магазини да поръчам с доставка до адрес или офис?', 'informational', 'manual', 'product'),
  ('q006', 'sports-nutrition-supplements-bg', 'tenant-biocode', 'Къде да купя протеин, витамини и аминокиселини онлайн в България?', 'product', 'manual', 'product'),
  ('q007', 'sports-nutrition-supplements-bg', 'tenant-biocode', 'Кои са най-популярните марки хранителни добавки и протеини в България?', 'comparative', 'manual', 'comparative'),
  ('q008', 'sports-nutrition-supplements-bg', 'tenant-biocode', 'BIOCODE biocode-bg.com — какво предлагат и дали е надежден каталог за добавки?', 'brand', 'manual', 'brand'),
  ('q009', 'sports-nutrition-supplements-bg', 'tenant-biocode', 'Как да избера whey протеин според цел — качване на мускулна маса срещу отслабване?', 'informational', 'manual', 'informational'),
  ('q010', 'sports-nutrition-supplements-bg', 'tenant-biocode', 'Тренирам 4 пъти седмично силово, търся протеин и креатин с доставка до офис на куриер в България, бюджет около 120 €. Кои магазини и продукти препоръчвате?', 'informational', 'manual', 'product'),
  ('q011', 'longevity-protocols-bg', 'tenant-life-protocols', 'Какви протоколи и добавки за дълголетие и biohacking се обсъждат като полезни?', 'informational', 'manual', 'informational'),
  ('q012', 'longevity-protocols-bg', 'tenant-life-protocols', 'Къде онлайн да намеря готови health протоколи и добавки за anti-aging с доставка в ЕС?', 'product', 'manual', 'product'),
  ('q013', 'longevity-protocols-bg', 'tenant-life-protocols', 'Life Protocols life-protocols.com — какви продукти и протоколи предлагат?', 'brand', 'manual', 'brand'),
  ('q014', 'longevity-protocols-bg', 'tenant-life-protocols', 'NAD+ и CoQ10 добавки — къде да купя онлайн с доставка в България?', 'product', 'manual', 'product'),
  ('q015', 'longevity-protocols-bg', 'tenant-life-protocols', 'На 45 години, искам структуриран протокол за енергия, сън и дълголетие с добавки без рецепта, бюджет до 150 € месечно, доставка в България. Какво и от кои сайтове има смисъл да разгледам?', 'informational', 'manual', 'product'),
  ('q016', 'peptides-research-bg', 'tenant-biocode-peptides', 'Какво представляват research пептидите и за какви цели се използват?', 'informational', 'manual', 'informational'),
  ('q017', 'peptides-research-bg', 'tenant-biocode-peptides', 'Къде да купя пептиди онлайн с доставка в България или ЕС?', 'product', 'manual', 'product'),
  ('q018', 'peptides-research-bg', 'tenant-biocode-peptides', 'biocode-peptides.com отзиви и качество на продуктите', 'brand', 'manual', 'brand'),
  ('q019', 'peptides-research-bg', 'tenant-biocode-peptides', 'BPC-157 срещу TB-500 — каква е разликата и кога се споменават?', 'comparative', 'manual', 'comparative'),
  ('q020', 'peptides-research-bg', 'tenant-biocode-peptides', 'Търся пептиди за възстановяване след интензивни тренировки, с декларирана чистота и доставка в България. Кои онлайн доставчици и продукти се цитират най-често?', 'informational', 'manual', 'product');
