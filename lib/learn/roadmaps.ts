import type { Topic } from './resources';

export type Step = { id: string; title: string; detail: string; resources: string[] };
export type Roadmap = {
  slug: string; title: string; short: string; topics: Topic[]; dayToDay: string[];
  skills: string[]; certs: { name: string; note: string }[]; steps: Step[]; itjobswatch: string;
};

export const ROADMAPS: Roadmap[] = [
  {
    slug: 'soc-analyst', title: 'SOC Analyst', short: 'Watch alerts, investigate incidents, stop attacks early. The most common way into cyber.',
    topics: ['blue-team', 'networking', 'forensics'], itjobswatch: 'https://www.itjobswatch.co.uk/jobs/uk/soc%20analyst.do',
    dayToDay: ['Triage alerts in a SIEM (Splunk, Sentinel, Elastic)', 'Investigate suspicious logins, phishing and malware', 'Escalate real incidents and document what happened', 'Tune noisy detection rules'],
    skills: ['Networking basics (TCP/IP, DNS, HTTP)', 'Windows and Linux logs', 'Phishing and email header analysis', 'SIEM searching', 'MITRE ATT&CK'],
    certs: [{ name: 'CompTIA Security+', note: 'Common HR filter for entry roles' }, { name: 'Microsoft SC-200', note: 'Valuable if employers use Sentinel/Defender' }, { name: 'BTL1 or CySA+', note: 'Hands-on defensive credibility' }],
    steps: [
      { id: 'soc-1', title: 'Learn the fundamentals', detail: 'Threats, attacks, CIA triad and core terms.', resources: ['netacad-intro', 'messer-secplus'] },
      { id: 'soc-2', title: 'Get comfortable with networking and Linux', detail: 'Packets, ports, DNS, and the command line.', resources: ['thm', 'otw-bandit'] },
      { id: 'soc-3', title: 'Practise alert triage', detail: 'Work simulated alerts end to end.', resources: ['letsdefend', 'thm'] },
      { id: 'soc-4', title: 'Investigate real-style incidents', detail: 'PCAPs, logs and memory: write up your findings.', resources: ['cyberdefenders', 'btlo'] },
      { id: 'soc-5', title: 'Learn how attackers operate', detail: 'Map what you see to ATT&CK techniques.', resources: ['attack'] },
      { id: 'soc-6', title: 'Build a home SIEM', detail: 'Collect logs from a VM and write your own detections.', resources: ['wazuh'] },
      { id: 'soc-7', title: 'Get a foundation certification', detail: 'Security+ or SC-200, depending on the jobs you target.', resources: ['messer-secplus', 'ms-learn-sec'] },
    ],
  },
  {
    slug: 'penetration-tester', title: 'Penetration Tester', short: 'Break into systems legally to find weaknesses before criminals do.',
    topics: ['pentest', 'web', 'linux'], itjobswatch: 'https://www.itjobswatch.co.uk/jobs/uk/penetration%20tester.do',
    dayToDay: ['Scope and test web apps, networks and cloud', 'Exploit and chain vulnerabilities safely', 'Write clear reports with risk ratings and fixes', 'Explain findings to developers and managers'],
    skills: ['Linux and scripting (Bash, Python)', 'Web vulnerabilities (OWASP Top 10)', 'Active Directory attacks', 'Report writing', 'Methodology and legal scope'],
    certs: [{ name: 'eJPT', note: 'Affordable first practical cert' }, { name: 'CREST CPSA → CRT', note: 'The UK industry standard; many UK firms expect it' }, { name: 'OSCP', note: 'Highly respected, hard, expensive' }],
    steps: [
      { id: 'pt-1', title: 'Master Linux and the command line', detail: 'You will live in a terminal.', resources: ['otw-bandit', 'thm'] },
      { id: 'pt-2', title: 'Learn networking and enumeration', detail: 'Nmap, services, and how to find a way in.', resources: ['thm', 'htb-academy'] },
      { id: 'pt-3', title: 'Learn web application security', detail: 'Do every Apprentice and Practitioner lab you can.', resources: ['portswigger', 'owasp-top10', 'juice-shop'] },
      { id: 'pt-4', title: 'Root your first machines', detail: 'Follow the full workflow on guided boxes.', resources: ['htb-starting-point', 'thm'] },
      { id: 'pt-5', title: 'Play CTFs regularly', detail: 'Speed and creativity come from competition.', resources: ['picoctf', 'hacker101', 'ctftime'] },
      { id: 'pt-6', title: 'Learn to write a professional report', detail: 'Write up every box as if a client will read it. Publish write-ups for retired boxes.', resources: [] },
      { id: 'pt-7', title: 'Get a practical certification', detail: 'eJPT first, then CREST CRT or OSCP for UK jobs.', resources: [] },
    ],
  },
  {
    slug: 'cloud-security', title: 'Cloud Security Engineer', short: 'Secure AWS, Azure and Google Cloud environments as companies move everything online.',
    topics: ['cloud', 'grc'], itjobswatch: 'https://www.itjobswatch.co.uk/jobs/uk/cloud%20security.do',
    dayToDay: ['Review cloud configurations and IAM permissions', 'Build guardrails and secure landing zones', 'Respond to misconfigurations and exposed data', 'Automate security with infrastructure as code'],
    skills: ['One cloud in depth (AWS or Azure)', 'Identity and access management', 'Networking in the cloud', 'Terraform/IaC', 'Logging and detection in the cloud'],
    certs: [{ name: 'AWS Security Specialty or Azure AZ-500', note: 'Pick the cloud employers near you use' }, { name: 'Microsoft SC-900', note: 'Cheap, gentle starting point' }, { name: 'CCSK', note: 'Vendor-neutral cloud security knowledge' }],
    steps: [
      { id: 'cl-1', title: 'Learn security fundamentals', detail: 'Same foundation as every role.', resources: ['netacad-intro', 'messer-secplus'] },
      { id: 'cl-2', title: 'Learn one cloud platform', detail: 'Free courses from the providers themselves.', resources: ['aws-skillbuilder', 'ms-learn-sec'] },
      { id: 'cl-3', title: 'Understand identity and access', detail: 'Most cloud breaches are IAM mistakes.', resources: ['ms-learn-sec'] },
      { id: 'cl-4', title: 'Practise Linux and scripting', detail: 'Automation is half the job.', resources: ['otw-bandit'] },
      { id: 'cl-5', title: 'Build and break your own cloud lab', detail: 'Use a free-tier account with billing alerts; deploy, misconfigure, then fix.', resources: [] },
      { id: 'cl-6', title: 'Learn frameworks', detail: 'Know how controls map to NIST and NCSC guidance.', resources: ['nist-csf', 'ncsc-guidance'] },
    ],
  },
  {
    slug: 'grc-analyst', title: 'GRC Analyst', short: 'Governance, risk and compliance: keep organisations secure through policy, risk and audits.',
    topics: ['grc'], itjobswatch: 'https://www.itjobswatch.co.uk/jobs/uk/grc.do',
    dayToDay: ['Run risk assessments and maintain risk registers', 'Prepare for audits (ISO 27001, Cyber Essentials, PCI DSS)', 'Write and review security policies', 'Assess third-party suppliers'],
    skills: ['Risk management', 'ISO 27001 and NIST CSF', 'UK GDPR basics', 'Clear writing and stakeholder communication', 'Enough technical knowledge to challenge engineers'],
    certs: [{ name: 'ISO 27001 Foundation / Lead Implementer', note: 'Very common in UK job adverts' }, { name: 'CompTIA Security+', note: 'Shows technical grounding' }, { name: 'CISM / CISSP', note: 'Later, once you have experience' }],
    steps: [
      { id: 'grc-1', title: 'Learn security fundamentals', detail: 'You need to understand what controls actually do.', resources: ['netacad-intro', 'messer-secplus'] },
      { id: 'grc-2', title: 'Learn the main frameworks', detail: 'NIST CSF 2.0 and ISO 27001 structure.', resources: ['nist-csf'] },
      { id: 'grc-3', title: 'Know UK guidance', detail: 'Cyber Essentials and NCSC advice come up constantly.', resources: ['ncsc-guidance'] },
      { id: 'grc-4', title: 'Practise a risk assessment', detail: 'Write a risk register for a small fictional company and publish it on your portfolio.', resources: [] },
      { id: 'grc-5', title: 'Understand common web risks', detail: 'So you can discuss findings with technical teams.', resources: ['owasp-top10'] },
    ],
  },
  {
    slug: 'digital-forensics', title: 'Digital Forensics & Incident Response', short: 'Work out exactly what happened after an attack, and help organisations recover.',
    topics: ['forensics', 'malware', 'blue-team'], itjobswatch: 'https://www.itjobswatch.co.uk/jobs/uk/digital%20forensics.do',
    dayToDay: ['Collect and preserve evidence from disks, memory and cloud', 'Build timelines of attacker activity', 'Analyse malware and persistence', 'Write reports that may be used in court or insurance claims'],
    skills: ['Windows internals and artefacts', 'Memory forensics (Volatility)', 'Log analysis', 'Chain of custody', 'Malware triage'],
    certs: [{ name: 'BTL1', note: 'Practical, affordable blue-team cert' }, { name: 'GIAC GCFA / GCFE', note: 'Gold standard, but expensive' }, { name: 'CompTIA CySA+', note: 'Broader defensive analyst cert' }],
    steps: [
      { id: 'df-1', title: 'Learn security fundamentals', detail: 'Start with the basics.', resources: ['netacad-intro'] },
      { id: 'df-2', title: 'Learn Windows forensics artefacts', detail: 'Event logs, registry, prefetch, timelines.', resources: ['13cubed'] },
      { id: 'df-3', title: 'Investigate realistic cases', detail: 'Disk, memory and network challenges.', resources: ['cyberdefenders', 'btlo'] },
      { id: 'df-4', title: 'Learn malware triage', detail: 'Safely analyse what attackers left behind.', resources: ['re101'] },
      { id: 'df-5', title: 'Practise CTF forensics challenges', detail: 'Short, fun and great for speed.', resources: ['picoctf'] },
      { id: 'df-6', title: 'Map findings to ATT&CK', detail: 'Describe incidents the way the industry does.', resources: ['attack'] },
    ],
  },
  {
    slug: 'security-engineer', title: 'Security Engineer / AppSec', short: 'Build security into products: secure code reviews, tooling, and fixing problems at the source.',
    topics: ['web', 'cloud', 'exploit-dev'], itjobswatch: 'https://www.itjobswatch.co.uk/jobs/uk/application%20security.do',
    dayToDay: ['Review code and designs for security flaws', 'Run and tune SAST/DAST/dependency scanners', 'Help developers fix vulnerabilities', 'Build secure-by-default libraries and pipelines'],
    skills: ['Programming (Python plus one of JS, Java, Go, C#)', 'OWASP Top 10 in depth', 'Threat modelling', 'CI/CD and DevSecOps tooling', 'Cloud basics'],
    certs: [{ name: 'Certs matter less here', note: 'A portfolio of code, write-ups and bug finds counts more' }, { name: 'Burp Suite Certified Practitioner', note: 'Respected practical web cert' }, { name: 'Cloud security cert', note: 'If the role is cloud-heavy' }],
    steps: [
      { id: 'se-1', title: 'Get solid at programming', detail: 'Build small apps; you cannot secure code you cannot read.', resources: [] },
      { id: 'se-2', title: 'Learn web security deeply', detail: 'Every PortSwigger topic, not just the basics.', resources: ['portswigger', 'owasp-top10'] },
      { id: 'se-3', title: 'Break a vulnerable app', detail: 'Then fix the code yourself.', resources: ['juice-shop', 'hacker101'] },
      { id: 'se-4', title: 'Learn how memory bugs work', detail: 'Understand the bug classes behind many critical CVEs.', resources: ['ost2', 'exploit-education'] },
      { id: 'se-5', title: 'Learn cloud and pipelines', detail: 'Modern AppSec lives in CI/CD.', resources: ['aws-skillbuilder', 'ms-learn-sec'] },
    ],
  },
];

export const roadmapBySlug = (s: string) => ROADMAPS.find((r) => r.slug === s);
export const allStepIds = (r: Roadmap) => r.steps.map((s) => s.id);
