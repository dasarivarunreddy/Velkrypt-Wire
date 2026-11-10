// "Getting hired" content for the careers page.
export const INTERVIEW: { role: string; qs: { q: string; a: string }[] }[] = [
  { role: 'Any security role', qs: [
    { q: 'What is the CIA triad?', a: 'Confidentiality (only the right people see data), integrity (data is not altered without authorisation) and availability (systems and data are there when needed). Give a one-line example of an attack on each.' },
    { q: 'What happens when you type a URL into a browser?', a: 'DNS lookup, TCP handshake, TLS handshake (certificate check), HTTP request, server response, rendering. Mention where security fits: DNS spoofing, TLS, cookies, same-origin policy.' },
    { q: 'How would you explain a vulnerability, a threat and a risk?', a: 'A vulnerability is a weakness, a threat is something that could exploit it, and risk is the likelihood and impact of that happening. Use a real example, like an unpatched VPN.' },
    { q: 'Tell me about a recent security news story.', a: 'Pick one from this site. Explain what happened, why it worked, and what defenders should do. Interviewers want to see that you follow the field.' },
  ] },
  { role: 'SOC Analyst', qs: [
    { q: 'You get an alert for a login from a new country. What do you do?', a: 'Check whether it is legitimate (travel, VPN), look at the account’s recent activity, MFA status, impossible-travel patterns and other alerts. Contain if suspicious (disable sessions, reset credentials), document, escalate per playbook.' },
    { q: 'How do you analyse a suspicious email?', a: 'Check headers (SPF, DKIM, DMARC results, sending path), sender domain age, links (expand without clicking, check reputation), attachments in a sandbox, and search for other recipients. Then block and report.' },
    { q: 'What is the difference between a false positive and a false negative?', a: 'A false positive is an alert for something harmless; a false negative is a real attack that raised no alert. False negatives are more dangerous; too many false positives cause alert fatigue.' },
    { q: 'Which Windows event IDs do you know?', a: '4624 successful logon, 4625 failed logon, 4688 process creation, 4720 user created, 4732 user added to a group, 1102 audit log cleared. Explain why each matters.' },
  ] },
  { role: 'Penetration Tester', qs: [
    { q: 'Walk me through your methodology.', a: 'Scoping and rules of engagement, reconnaissance, enumeration, vulnerability identification, exploitation, post-exploitation (within scope), clean-up, and reporting with risk ratings and fixes.' },
    { q: 'Explain SQL injection and how to fix it.', a: 'User input changes the structure of a database query. Fix with parameterised queries/prepared statements, least-privilege database accounts and input validation. Mention blind and second-order SQLi.' },
    { q: 'How would you attack Active Directory after getting a foothold?', a: 'Enumerate users, groups and permissions (e.g. BloodHound), look for Kerberoastable accounts, weak ACLs, credential reuse and misconfigured delegation, always within the agreed scope.' },
    { q: 'How do you rate the severity of a finding?', a: 'Combine likelihood and impact in context; CVSS is a starting point, but business context matters. Explain clearly so a manager understands why it matters.' },
  ] },
  { role: 'GRC Analyst', qs: [
    { q: 'How would you run a risk assessment?', a: 'Identify assets, threats and vulnerabilities; rate likelihood and impact; record in a risk register; agree treatment (mitigate, transfer, accept, avoid) and owners; review regularly.' },
    { q: 'What is ISO 27001?', a: 'An international standard for an information security management system (ISMS): policies, risk management and controls (Annex A), with continual improvement and certification audits.' },
    { q: 'What is Cyber Essentials?', a: 'A UK government-backed scheme covering five basic controls: firewalls, secure configuration, user access control, malware protection and security update management. Required for some government contracts.' },
  ] },
];

export const CV_TIPS = [
  'Put a "Projects" section near the top: home lab, CTF results, write-ups, tools you built. For entry roles it often counts more than job history.',
  'Link to proof: GitHub, a blog with write-ups, your TryHackMe/HTB profile, and your Velkrypt Wire learning progress.',
  'Use the employer’s words. If the advert says "SIEM" and "incident response", make sure those exact words appear where true.',
  'Quantify: "Completed 120+ hands-on labs", "Ranked top 8% on TryHackMe", "Wrote 15 public CTF write-ups".',
  'Keep it to two pages, plain layout, no photos or skill bars. Many UK employers use applicant tracking systems that read plain text best.',
  'On LinkedIn, write a headline that says what you want to do ("Aspiring SOC Analyst | Security+ | Blue team labs"), and post about what you learn each week.',
];

export const UK_SCHEMES = [
  { name: 'CyberFirst (NCSC)', url: 'https://www.ncsc.gov.uk/cyberfirst/overview', what: 'Bursaries for university students, degree apprenticeships, courses and competitions for school students.' },
  { name: 'Skills Bootcamps (gov.uk)', url: 'https://www.gov.uk/guidance/find-a-skills-bootcamp', what: 'Free, government-funded courses for adults in England, including cyber security bootcamps with a job interview at the end.' },
  { name: 'UK Cyber Security Council', url: 'https://www.ukcybersecuritycouncil.org.uk/', what: 'The UK body for cyber careers and professional titles. Its career route maps show the main specialisms.' },
  { name: 'Civil Service jobs', url: 'https://www.civilservicejobs.service.gov.uk/', what: 'Government security roles, apprenticeships and graduate schemes (search "cyber").' },
  { name: 'Graduate schemes at consultancies', url: 'https://www.brightnetwork.co.uk/', what: 'Big consultancies and defence firms run cyber graduate schemes each autumn. Use a graduate job board to track opening dates.' },
];

export const HOME_LAB = [
  { step: 'Get a hypervisor', detail: 'Install VirtualBox or VMware Workstation (free for personal use). 16 GB of RAM makes life easier, but 8 GB works with small VMs.' },
  { step: 'Build an attacker and a target', detail: 'One Linux machine to attack from, and one deliberately vulnerable target (for example OWASP Juice Shop in Docker).' },
  { step: 'Add a Windows domain', detail: 'Use Microsoft’s free evaluation versions to build a small Active Directory lab. This is where most real-world attacks happen.' },
  { step: 'Add monitoring', detail: 'Install Wazuh or the Elastic stack, send logs from your machines, then attack them and see what you can detect.' },
  { step: 'Keep it isolated', detail: 'Use a host-only or internal network for vulnerable machines. Never expose them to the internet.' },
  { step: 'Write it up', detail: 'Document what you built and what you learned. A home lab write-up is one of the best things you can put on a CV.' },
];
