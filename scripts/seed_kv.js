// Utility script to populate the KV namespace with default advice texts.
// Requires the environment variables CF_API_TOKEN, CF_ACCOUNT_ID and KV_NAMESPACE_ID.

// Node 18+ provides a global fetch API. For older versions, fall back to the
// `node-fetch` package when available.
if (typeof fetch !== 'function') {
  try {
    global.fetch = (...args) =>
      import('node-fetch').then(({ default: fetch }) => fetch(...args));
  } catch (err) {
    console.error('Fetch API not available. Please use Node 18+ or install node-fetch.');
    process.exit(1);
  }
}

const { CF_API_TOKEN, CF_ACCOUNT_ID, KV_NAMESPACE_ID } = process.env;

if (!CF_API_TOKEN || !CF_ACCOUNT_ID || !KV_NAMESPACE_ID) {
  console.error('Missing CF_API_TOKEN, CF_ACCOUNT_ID or KV_NAMESPACE_ID');
  process.exit(1);
}

const ADVICE = {
  HIGH_WRINKLE_SCORE: 'Фокус върху Колагена: Засилената поява на бръчки често е свързана със загуба на колаген. Обмислете прием на колагенови добавки и храни, богати на Витамин C. Ретиноидите са златният стандарт в локалната грижа за стимулиране на колагена.',
  HIGH_PIGMENTATION_SCORE: 'Слънцезащитата е задължителна: Пигментацията е пряк резултат от увреждането от слънцето. Използвайте широкоспектърен SPF 50+ всеки ден, дори и в облачни дни. Съставки като Витамин C, Ниацинамид и Азелаинова киселина могат да помогнат за изсветляване на съществуващи петна.',
  POOR_HYDRATION: 'Хидратация отвътре и отвън: Лицето ви показва признаци на дехидратация. Увеличете приема на вода до минимум 2 литра дневно. Включете в рутината си серуми с хиалуронова киселина и глицерин, които "заключват" влагата в кожата.',
  HIGH_INFLAMMATION: 'Успокояване на възпалението: Зачервяванията и раздразненията сочат за вътрешно възпаление. Намалете консумацията на захар, преработени храни и млечни продукти. Увеличете приема на Омега-3 мастни киселини (риба, ленено семе) и антиоксиданти.',
  HIGH_STRESS_IMPACT: 'Намаляване на кортизола: Стресът буквално се изписва на лицето ви чрез напрежение в мускулите и повишен кортизол, който разгражда колагена. Практикувайте техники за релаксация като медитация или йога. Адаптогени като Ашваганда могат да бъдат полезни.'
};

async function put(key, value) {
  const url = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/storage/kv/namespaces/${KV_NAMESPACE_ID}/values/${encodeURIComponent(key)}`;
  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${CF_API_TOKEN}`
    },
    body: value
  });
  const data = await res.json();
  if (!data.success) {
    throw new Error(`Failed to set ${key}: ${JSON.stringify(data.errors)}`);
  }
  console.log(`Set ${key}`);
}

(async () => {
  for (const [key, value] of Object.entries(ADVICE)) {
    await put(key, value);
  }
})();

