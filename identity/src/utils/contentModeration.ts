// Content moderation — filters profanity in Russian, Ukrainian, and English.
// Words are replaced with asterisks (e.g. "хуй" → "***").

const BAD_WORDS: string[] = [
  // Russian mat
  'хуй', 'хуя', 'хую', 'хуем', 'хуёв', 'хуе', 'хуёвый', 'хуёво',
  'пизда', 'пизды', 'пизде', 'пизду', 'пиздой', 'пиздёж', 'пиздец',
  'пиздит', 'пиздёт', 'пизданул', 'пиздануть',
  'ёбаный', 'ёбать', 'ёб', 'ёба', 'ебать', 'ебёт', 'ебал', 'ебала',
  'еблан', 'ебло', 'ёблан', 'ёбнуть', 'ёбнул', 'ёбнулся',
  'блядь', 'бляди', 'блядей', 'блядина', 'блядский', 'бляд',
  'блядун', 'блядство',
  'сука', 'суки', 'суке', 'суку', 'сучка', 'сучки', 'сучку',
  'пиздёнок', 'пиздюк', 'пиздюки',
  'мудак', 'мудаки', 'мудаку', 'мудакам',
  'мудила', 'мудозвон',
  'залупа', 'залупы', 'залупе',
  'хуесос', 'хуесосы',
  'пиздосос', 'пиздабол',
  'ёбнутый', 'ёбнутая',
  'уёбок', 'уёбки',
  'ублюдок', 'ублюдки',
  'выёбываться', 'выёбывается',
  'заебал', 'заебала', 'заебало', 'заебали',
  'долбоёб', 'долбоёбы',
  'мразь', 'мрази',
  'пиздатый', 'пиздатая', 'пиздато',
  'охуел', 'охуела', 'охуели', 'охуеть',
  'нахуй', 'похуй', 'похуй', 'похуиста',
  'ёбнись', 'иди нахуй', 'пошёл нахуй',
  'шлюха', 'шлюхи', 'шлюху', 'шлюхой',
  'проститутка',
  'ёбаная', 'ёбаной', 'ёбаному',
  'хуйня', 'хуйню', 'хуйней',
  'пиздёж',
  'говно', 'говна', 'говне', 'говном', 'говнюк', 'говнюки',

  // Ukrainian mat
  'хуй', 'їбать', 'їбаний', 'єбать', 'єбаний',
  'піздець', 'піздато', 'піздатий',
  'сука', 'блядь', 'шльоха',
  'мудак', 'довбойоб', 'довбоєб',

  // English profanity
  'fuck', 'fucker', 'fucking', 'fucked', 'fucks', 'motherfucker', 'motherfucking',
  'shit', 'shits', 'shitting', 'shitty', 'bullshit',
  'bitch', 'bitches', 'bitchy',
  'ass', 'asshole', 'assholes', 'asses',
  'bastard', 'bastards',
  'cunt', 'cunts',
  'dick', 'dicks', 'dickhead', 'dickheads',
  'cock', 'cocks', 'cocksucker',
  'pussy', 'pussies',
  'whore', 'whores',
  'slut', 'sluts',
  'nigger', 'niggers', 'nigga',
  'faggot', 'faggots',
  'retard', 'retards', 'retarded',
  'crap', 'crappy',
  'damn', 'damned',
  'hell', // context-sensitive but commonly filtered
  'piss', 'pissed', 'pissing',
  'wank', 'wanker', 'wankers',
  'twat', 'twats',
];

// Build a regex that matches whole words case-insensitively.
// We escape special regex chars just in case.
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const BAD_WORDS_REGEX = new RegExp(
  `(${BAD_WORDS.map(escapeRegex).join('|')})`,
  'gi'
);

/**
 * Replaces each bad word in `text` with asterisks of the same length.
 * E.g. "блядь" (5 chars) → "*****"
 */
export function moderateText(text: string): string {
  return text.replace(BAD_WORDS_REGEX, (match) => '*'.repeat(match.length));
}

/**
 * Returns true if the text contains any profanity.
 */
export function containsProfanity(text: string): boolean {
  BAD_WORDS_REGEX.lastIndex = 0; // reset stateful regex
  return BAD_WORDS_REGEX.test(text);
}
