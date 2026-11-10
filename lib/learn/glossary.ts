// Plain-English glossary. Terms found in a story are linked from that story.
export type Term = { term: string; slug: string; match: RegExp; def: string; resource?: string };

const t = (term: string, def: string, match?: RegExp, resource?: string): Term => ({
  term, def, resource, slug: term.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
  match: match ?? new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i'),
});

export const GLOSSARY: Term[] = [
  t('CVE', 'Common Vulnerabilities and Exposures: a unique ID (like CVE-2026-12345) given to a publicly known security flaw, so everyone talks about the same bug.', /\bCVE-?\b/),
  t('KEV', 'CISA’s Known Exploited Vulnerabilities catalog: flaws with evidence of real-world attacks. If it is on KEV, patch it first.', /\bKEV\b|known exploited/i),
  t('CVSS', 'Common Vulnerability Scoring System: a 0-10 severity score for a flaw. 9.0+ is critical. It measures impact, not how likely an attack is.'),
  t('EPSS', 'Exploit Prediction Scoring System: the estimated chance a flaw will be exploited in the next 30 days. Useful alongside CVSS for deciding what to patch first.'),
  t('Zero-day', 'A flaw attackers exploit before the vendor has released a fix, so defenders have had "zero days" to patch.', /zero-?day/i),
  t('Remote code execution', 'RCE: a flaw that lets an attacker run their own commands on someone else’s system over a network. Usually the most serious kind of bug.', /remote code execution|\bRCE\b/i, 'portswigger'),
  t('Authentication bypass', 'A flaw that lets someone get in without valid credentials, or skip a login step such as MFA.', /auth(entication)? bypass/i, 'portswigger'),
  t('SQL injection', 'SQLi: tricking a website into running attacker-controlled database queries, often to steal or change data.', /sql injection|\bSQLi\b/i, 'portswigger'),
  t('Cross-site scripting', 'XSS: injecting malicious script into a web page that other users then run in their browsers.', /cross-site scripting|\bXSS\b/i, 'portswigger'),
  t('SSRF', 'Server-side request forgery: making a server send requests on the attacker’s behalf, often to reach internal systems.', /\bSSRF\b|server-side request forgery/i, 'portswigger'),
  t('Deserialization', 'Insecure deserialization: feeding crafted data to an app that rebuilds objects from it, which can lead to code execution.', /deserial/i, 'portswigger'),
  t('Buffer overflow', 'Writing more data into memory than a buffer can hold, overwriting nearby memory. A classic route to code execution.', /buffer overflow|out-of-bounds write/i, 'exploit-education'),
  t('Race condition', 'A bug where the outcome depends on timing, e.g. a check happens, then the thing checked changes before it is used (TOCTOU).', /race condition|TOCTOU|time-of-check/i),
  t('Privilege escalation', 'Going from limited access to higher access, such as from a normal user to administrator or root.', /privilege escalation/i, 'htb-starting-point'),
  t('MFA', 'Multi-factor authentication: requiring a second proof (code, app, key) besides a password.', /\bMFA\b|multi-factor|two-factor|2FA/i),
  t('SAML', 'A standard that lets you log in to many services through one identity provider (single sign-on). Mistakes in SAML handling can let attackers bypass login.', /\bSAML\b/),
  t('VPN', 'Virtual private network. Company VPN appliances sit on the internet edge and are a favourite target for attackers.', /\bVPN\b|SSL VPN/i, 'thm'),
  t('Phishing', 'Fake messages that trick people into clicking links, opening files or handing over credentials.', /phish/i, 'letsdefend'),
  t('Ransomware', 'Malware that encrypts files and demands payment. Modern gangs also steal data and threaten to leak it (double extortion).', /ransomware/i, 'cyberdefenders'),
  t('Infostealer', 'Malware that steals saved passwords, cookies and crypto wallets from a computer, then sends them to criminals.', /infostealer|info-stealer/i, 're101'),
  t('Supply chain attack', 'Attacking a supplier, software update or service provider to reach its customers.', /supply[- ]chain|service provider|third[- ]party/i),
  t('Botnet', 'A network of infected devices controlled by criminals, used for attacks, spam or proxying traffic.', /botnet/i),
  t('Command and control', 'C2: the servers attackers use to send instructions to malware on infected machines.', /command[- ]and[- ]control|\bC2\b/i, 'attack'),
  t('Backdoor', 'Hidden access to a system that bypasses normal authentication.', /backdoor/i),
  t('Lateral movement', 'Moving from one compromised machine to others inside a network.', /lateral movement/i, 'attack'),
  t('APT', 'Advanced persistent threat: a well-resourced group, often state-linked, that runs long, targeted campaigns.', /\bAPT\b|state-sponsored|nation-state/i, 'attack'),
  t('IOC', 'Indicator of compromise: evidence like a malicious IP, domain or file hash that shows an attack happened.', /\bIOCs?\b|indicators? of compromise/i, 'cyberdefenders'),
  t('SIEM', 'Security information and event management: the system SOC analysts use to collect logs and investigate alerts.', /\bSIEM\b/, 'wazuh'),
  t('EDR', 'Endpoint detection and response: security software on laptops and servers that spots and stops malicious behaviour.', /\bEDR\b|\bXDR\b/),
  t('SOC', 'Security operations centre: the team that monitors and responds to security alerts, often 24/7.', /\bSOC\b/, 'letsdefend'),
  t('Patch', 'A software update that fixes a flaw. "Patching" means installing it.', /\bpatch(es|ed)?\b/i),
  t('Exploit', 'Code or a technique that takes advantage of a flaw.', /\bexploit(s|ed|ation)?\b/i),
  t('Credential stuffing', 'Trying usernames and passwords leaked from one site on many others, betting that people reuse passwords.', /credential stuffing/i),
  t('Data breach', 'When information is accessed or stolen by someone who should not have it.', /data breach|\bbreach(ed)?\b/i),
];

export function termsIn(text: string, max = 6) {
  return GLOSSARY.filter((g) => g.match.test(text)).slice(0, max);
}
