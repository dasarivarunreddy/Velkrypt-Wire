import 'server-only';
import type { KevEntry } from '@/lib/kev';
import { slugify } from '@/lib/site';

const pct = (x?: number) => (x === undefined ? 'Not yet scored' : `${(x * 100).toFixed(1)}%`);

/** Official alert built only from CISA's own data: no AI, so nothing can be invented. */
export function kevArticle(k: KevEntry, epss?: { epss: number; percentile: number }) {
  const vp = `${k.vendorProject} ${k.product}`.trim();
  const links = (k.notes || '').split(/[\s;]+/).filter((u) => /^https:\/\//.test(u) && !u.includes('nvd.nist.gov') && !u.includes('cisa.gov')).slice(0, 3);
  const ransomware = k.knownRansomwareCampaignUse === 'Known';
  const title = `CISA adds ${vp} flaw ${k.cveID} to its exploited list`.slice(0, 200);
  const body = `The US Cybersecurity and Infrastructure Security Agency (CISA) has added **${k.cveID}** (${k.vulnerabilityName}) to its Known Exploited Vulnerabilities catalog. A KEV listing means there is evidence that attackers are using the flaw in real attacks.

### What it is

${k.shortDescription}

### Key facts

| | |
|---|---|
| Product | ${vp} |
| CVE | [${k.cveID}](https://nvd.nist.gov/vuln/detail/${k.cveID}) |
| Added to KEV | ${k.dateAdded} |
| US federal deadline | ${k.dueDate} |
| Known ransomware use | ${ransomware ? '**Yes**' : 'Not known'} |
| Exploit likelihood (EPSS, next 30 days) | ${pct(epss?.epss)} |

### What to do

${k.requiredAction || 'Apply the vendor’s fix or mitigation.'}

If you run ${vp}, patch or mitigate now. The US deadline only binds federal agencies, but a KEV listing is one of the strongest signals that a flaw is being attacked in the wild.
${links.length ? `\n**Vendor guidance:** ${links.map((u, i) => `[link ${i + 1}](${u})`).join(' · ')}\n` : ''}
*Based on official CISA data. We will update this alert if more details emerge.*`;

  return {
    title,
    slug: slugify(`${vp} ${k.cveID} exploited`),
    excerpt: `${vp} is under active attack. CISA has added ${k.cveID} to its exploited list${ransomware ? ', and it is known to be used by ransomware groups' : ''}.`.slice(0, 400),
    body_md: body,
    category: 'Vulnerabilities',
    severity: 'critical',
    verification: 'official',
    cves: [k.cveID],
    tags: [k.vendorProject, 'KEV', ...(ransomware ? ['Ransomware'] : [])].slice(0, 5),
    entities: [k.vendorProject, k.product].filter(Boolean),
    source_name: 'CISA KEV',
    source_url: `https://nvd.nist.gov/vuln/detail/${k.cveID}`,
    sources: [{ name: 'CISA Known Exploited Vulnerabilities catalog', url: 'https://www.cisa.gov/known-exploited-vulnerabilities-catalog' }, { name: 'NVD', url: `https://nvd.nist.gov/vuln/detail/${k.cveID}` }],
    priority: ransomware ? 'breaking' : 'high',
  };
}
