import { RESOURCES, type Resource, type Topic } from './resources';
import { byId } from './resources';
import { termsIn } from './glossary';

const KEYWORDS: [RegExp, Topic][] = [
  [/web|wordpress|xss|sql|php|http|browser|cms|plugin/i, 'web'],
  [/vpn|firewall|router|switch|network|ssh|dns|edge/i, 'networking'],
  [/linux|openssh|kernel|unix/i, 'linux'],
  [/ransomware|malware|infostealer|backdoor|trojan|botnet/i, 'malware'],
  [/breach|incident|forensic|investigat/i, 'forensics'],
  [/phish|alert|detect|soc|siem|edr/i, 'blue-team'],
  [/cloud|aws|azure|gcp|saas|okta|identity/i, 'cloud'],
  [/apt|state|campaign|threat actor|espionage/i, 'threat-intel'],
  [/regulat|law|policy|gdpr|compliance|government/i, 'grc'],
  [/overflow|memory|out-of-bounds|use-after-free|exploit/i, 'exploit-dev'],
];

/** "Learn this" box for a story: matching glossary terms plus 2 free resources to practise the idea. */
export function learnFor(text: string): { terms: ReturnType<typeof termsIn>; resources: Resource[] } {
  const terms = termsIn(text, 5);
  const fromTerms = terms.map((t) => (t.resource ? byId(t.resource) : undefined)).filter(Boolean) as Resource[];
  const topics = new Set(KEYWORDS.filter(([re]) => re.test(text)).map(([, t]) => t));
  const fromTopics = RESOURCES.filter((r) => r.topics.some((t) => topics.has(t))).sort((a, b) => (a.level === 'beginner' ? -1 : 0) - (b.level === 'beginner' ? -1 : 0));
  const seen = new Set<string>();
  const resources = [...fromTerms, ...fromTopics].filter((r) => (seen.has(r.id) ? false : (seen.add(r.id), true))).slice(0, 2);
  return { terms, resources };
}
