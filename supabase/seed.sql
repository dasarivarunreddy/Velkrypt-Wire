-- Seed: launch-week stories (7 Nov 2026). Run after schema.sql.
-- Summaries are original; each links to its source.

insert into public.articles (slug,title,excerpt,body_md,category,severity,cves,tags,source_name,source_url,is_premium,is_lead,status,published_at)
values ('attackers-hit-openssh-sshole-flaw-within-hours-of-disclosure','Attackers hit OpenSSH ''SSHole'' flaw within hours of disclosure','A newly disclosed OpenSSH bug can let attackers sign in to accounts that have no password set. Researchers saw exploitation attempts almost immediately, and one honeypot was taken to root. Audit for passwordless accounts and update OpenSSH as soon as your distribution ships the fix.','A newly disclosed OpenSSH bug can let attackers sign in to accounts that have no password set. Researchers saw exploitation attempts almost immediately, and one honeypot was taken to root. Audit for passwordless accounts and update OpenSSH as soon as your distribution ships the fix.

### What to do

Treat this as urgent. Check whether you run the affected product, apply the vendor fix, and review logs for signs of compromise from before the patch.

*Original reporting: [The Hacker News](https://thehackernews.com/)*','Vulnerabilities','critical',array[]::text[],array['OpenSSH','Linux','Root access']::text[],'The Hacker News','https://thehackernews.com/',false,true,'published','2026-11-06T09:00:00Z')
on conflict (slug) do nothing;

insert into public.articles (slug,title,excerpt,body_md,category,severity,cves,tags,source_name,source_url,is_premium,is_lead,status,published_at)
values ('sonicwall-patches-exploited-sonicos-flaw-that-weakens-vpn-logins','SonicWall patches exploited SonicOS flaw that weakens VPN logins','CVE-2026-19868 lets an attacker with credentials for one login method slip past SAML checks, including SAML-enforced MFA.','CVE-2026-19868 lets an attacker with credentials for one login method slip past SAML checks, including SAML-enforced MFA.

### What to do

Treat this as urgent. Check whether you run the affected product, apply the vendor fix, and review logs for signs of compromise from before the patch.

*Original reporting: [SecurityWeek](https://www.securityweek.com/)*','Vulnerabilities','critical',array['CVE-2026-19868']::text[],array['VPN','MFA bypass']::text[],'SecurityWeek','https://www.securityweek.com/',false,false,'published','2026-11-07T09:00:00Z')
on conflict (slug) do nothing;

insert into public.articles (slug,title,excerpt,body_md,category,severity,cves,tags,source_name,source_url,is_premium,is_lead,status,published_at)
values ('zyxel-switch-hacks-traced-to-a-true-zero-day-not-an-old-bug','Zyxel switch hacks traced to a true zero-day, not an old bug','Attacks first blamed on a patched flaw actually used CVE-2026-107441, an out-of-bounds write that allows OS commands through crafted HTTP requests.','Attacks first blamed on a patched flaw actually used CVE-2026-107441, an out-of-bounds write that allows OS commands through crafted HTTP requests.

### What to do

Treat this as urgent. Check whether you run the affected product, apply the vendor fix, and review logs for signs of compromise from before the patch.

*Original reporting: [SecurityWeek](https://www.securityweek.com/)*','Vulnerabilities','critical',array['CVE-2026-107441']::text[],array['Zyxel','Network gear']::text[],'SecurityWeek','https://www.securityweek.com/',false,false,'published','2026-11-05T09:00:00Z')
on conflict (slug) do nothing;

insert into public.articles (slug,title,excerpt,body_md,category,severity,cves,tags,source_name,source_url,is_premium,is_lead,status,published_at)
values ('cisa-adds-wordpress-core-race-condition-to-exploited-list','CISA adds WordPress Core race condition to exploited list','CVE-2026-119977, a time-of-check/time-of-use race in WordPress Core, is now on the KEV catalog based on evidence of active exploitation.','CVE-2026-119977, a time-of-check/time-of-use race in WordPress Core, is now on the KEV catalog based on evidence of active exploitation.

### What to do

Treat this as urgent. Check whether you run the affected product, apply the vendor fix, and review logs for signs of compromise from before the patch.

*Original reporting: [CISA](https://www.cisa.gov/news-events/alerts/2026/11/03/cisa-adds-one-known-exploited-vulnerability-catalog)*','Vulnerabilities','critical',array['CVE-2026-119977']::text[],array['WordPress','KEV']::text[],'CISA','https://www.cisa.gov/news-events/alerts/2026/11/03/cisa-adds-one-known-exploited-vulnerability-catalog',false,false,'published','2026-11-03T09:00:00Z')
on conflict (slug) do nothing;

insert into public.articles (slug,title,excerpt,body_md,category,severity,cves,tags,source_name,source_url,is_premium,is_lead,status,published_at)
values ('php2shell-rce-flaws-keep-spreading-into-industrial-software','PHP2Shell RCE flaws keep spreading into industrial software','CVE-2026-109618 and CVE-2026-109619 allow unauthenticated remote code execution (CVSS 9.8). Festo has updated fix guidance for FactoryViews and MES4 installs that bundle XAMPP.','CVE-2026-109618 and CVE-2026-109619 allow unauthenticated remote code execution (CVSS 9.8). Festo has updated fix guidance for FactoryViews and MES4 installs that bundle XAMPP.

### What to do

Treat this as urgent. Check whether you run the affected product, apply the vendor fix, and review logs for signs of compromise from before the patch.

*Original reporting: [daily.dev / Security Boulevard](https://daily.dev/posts/daily-ot-security-news-november-06-2026-kbyoadelh)*','Vulnerabilities','critical',array['CVE-2026-109618']::text[],array['PHP','OT']::text[],'daily.dev / Security Boulevard','https://daily.dev/posts/daily-ot-security-news-november-06-2026-kbyoadelh',false,false,'published','2026-11-06T09:00:00Z')
on conflict (slug) do nothing;

insert into public.articles (slug,title,excerpt,body_md,category,severity,cves,tags,source_name,source_url,is_premium,is_lead,status,published_at)
values ('binance-says-a-fake-job-interview-led-to-its-6-3-billion-theft','Binance says a fake job interview led to its $6.3 billion theft','The record crypto heist began in June, when an employee installed a tampered installer while setting up an AI coding tool.','The record crypto heist began in June, when an employee installed a tampered installer while setting up an AI coding tool.

### What to do

Check exposure this week and follow the vendor or investigator guidance in the source report.

*Original reporting: [Nextgov/FCW via Trust Infinitech](https://www.trustinfinitech.com/cybersecurity-ai-roundup-november-6-2026/)*','Breaches','high',array[]::text[],array['Crypto','Social engineering','Supply chain']::text[],'Nextgov/FCW via Trust Infinitech','https://www.trustinfinitech.com/cybersecurity-ai-roundup-november-6-2026/',true,false,'published','2026-11-04T09:00:00Z')
on conflict (slug) do nothing;
insert into public.article_premium (article_id, body_md)
select id, '### Member analysis

This section is where the premium deep-dive goes: attack chain, detection ideas and hardening steps. Edit it from the admin panel.' from public.articles where slug = 'binance-says-a-fake-job-interview-led-to-its-6-3-billion-theft'
on conflict (article_id) do nothing;

insert into public.articles (slug,title,excerpt,body_md,category,severity,cves,tags,source_name,source_url,is_premium,is_lead,status,published_at)
values ('data-on-41-000-homeland-security-workers-published-after-login-breach','Data on 41,000 Homeland Security workers published after login breach','The leaked personnel database was pulled from an Okta system used by the department and is now hosted by a transparency group.','The leaked personnel database was pulled from an Okta system used by the department and is now hosted by a transparency group.

### What to do

Check exposure this week and follow the vendor or investigator guidance in the source report.

*Original reporting: [Malwarebytes Labs](https://www.malwarebytes.com/blog/news/2026/11/a-week-in-security-october-26-november-1-2)*','Breaches','high',array[]::text[],array['Government','Okta','Identity']::text[],'Malwarebytes Labs','https://www.malwarebytes.com/blog/news/2026/11/a-week-in-security-october-26-november-1-2',false,false,'published','2026-11-01T09:00:00Z')
on conflict (slug) do nothing;

insert into public.articles (slug,title,excerpt,body_md,category,severity,cves,tags,source_name,source_url,is_premium,is_lead,status,published_at)
values ('backdoor-turned-1-3-million-android-tv-boxes-into-a-criminal-botnet','Backdoor turned 1.3 million Android TV boxes into a criminal botnet','Manufacturer Videostrong planted the backdoor in set-top boxes and sold criminals access to the resulting network.','Manufacturer Videostrong planted the backdoor in set-top boxes and sold criminals access to the resulting network.

### What to do

Check exposure this week and follow the vendor or investigator guidance in the source report.

*Original reporting: [Malwarebytes Labs](https://www.malwarebytes.com/blog/news/2026/11/a-week-in-security-october-26-november-1-2)*','Threats','high',array[]::text[],array['Botnet','Android','IoT']::text[],'Malwarebytes Labs','https://www.malwarebytes.com/blog/news/2026/11/a-week-in-security-october-26-november-1-2',false,false,'published','2026-11-03T09:00:00Z')
on conflict (slug) do nothing;

insert into public.articles (slug,title,excerpt,body_md,category,severity,cves,tags,source_name,source_url,is_premium,is_lead,status,published_at)
values ('backdoor-found-inside-control-web-panel-s-own-web-server','Backdoor found inside Control Web Panel''s own web server','Researchers at QiAnXin''s XLab found the implant in the server that runs CWP, a free panel widely used to manage Linux hosting boxes.','Researchers at QiAnXin''s XLab found the implant in the server that runs CWP, a free panel widely used to manage Linux hosting boxes.

### What to do

Check exposure this week and follow the vendor or investigator guidance in the source report.

*Original reporting: [The Hacker News](https://thehackernews.com/)*','Threats','high',array[]::text[],array['Linux hosting','Backdoor']::text[],'The Hacker News','https://thehackernews.com/',true,false,'published','2026-11-05T09:00:00Z')
on conflict (slug) do nothing;
insert into public.article_premium (article_id, body_md)
select id, '### Member analysis

This section is where the premium deep-dive goes: attack chain, detection ideas and hardening steps. Edit it from the admin panel.' from public.articles where slug = 'backdoor-found-inside-control-web-panel-s-own-web-server'
on conflict (article_id) do nothing;

insert into public.articles (slug,title,excerpt,body_md,category,severity,cves,tags,source_name,source_url,is_premium,is_lead,status,published_at)
values ('fake-security-tools-on-github-push-backdoors-and-infostealers','Fake security tools on GitHub push backdoors and infostealers','Repositories posing as security utilities are being used to infect the people most likely to download them: researchers and defenders.','Repositories posing as security utilities are being used to infect the people most likely to download them: researchers and defenders.

### What to do

Keep an eye on follow-up reporting and brief your team.

*Original reporting: [Cybersecurity News roundup](https://theparkernathan.substack.com/p/cybersecurity-news-november-6-2026)*','Threats','medium',array[]::text[],array['GitHub','Infostealer']::text[],'Cybersecurity News roundup','https://theparkernathan.substack.com/p/cybersecurity-news-november-6-2026',false,false,'published','2026-11-06T09:00:00Z')
on conflict (slug) do nothing;

insert into public.articles (slug,title,excerpt,body_md,category,severity,cves,tags,source_name,source_url,is_premium,is_lead,status,published_at)
values ('patched-bug-let-attackers-bypass-chatgpt-s-lockdown-mode','Patched bug let attackers bypass ChatGPT''s Lockdown Mode','Lockdown Mode, added in June to limit data theft through prompt injection, could be sidestepped before OpenAI fixed the flaw.','Lockdown Mode, added in June to limit data theft through prompt injection, could be sidestepped before OpenAI fixed the flaw.

### What to do

Keep an eye on follow-up reporting and brief your team.

*Original reporting: [The Hacker News](https://thehackernews.com/)*','AI Security','medium',array[]::text[],array['Prompt injection','LLM']::text[],'The Hacker News','https://thehackernews.com/',false,false,'published','2026-11-05T09:00:00Z')
on conflict (slug) do nothing;

insert into public.articles (slug,title,excerpt,body_md,category,severity,cves,tags,source_name,source_url,is_premium,is_lead,status,published_at)
values ('gitbook-says-ai-agent-attack-reached-infrastructure-credentials','GitBook says AI-agent attack reached infrastructure credentials','Integration tokens and API tokens may be exposed. GitBook revoked all personal API tokens and its MCP server needs re-authentication.','Integration tokens and API tokens may be exposed. GitBook revoked all personal API tokens and its MCP server needs re-authentication.

### What to do

Check exposure this week and follow the vendor or investigator guidance in the source report.

*Original reporting: [explainx tracker](https://explainx.ai/blog/november-2026-cyberattacks-list-breaches-exploits-ai-run-attacks-tracker-2026)*','AI Security','high',array[]::text[],array['AI agents','API tokens','MCP']::text[],'explainx tracker','https://explainx.ai/blog/november-2026-cyberattacks-list-breaches-exploits-ai-run-attacks-tracker-2026',false,false,'published','2026-11-02T09:00:00Z')
on conflict (slug) do nothing;

insert into public.articles (slug,title,excerpt,body_md,category,severity,cves,tags,source_name,source_url,is_premium,is_lead,status,published_at)
values ('three-charged-in-129-million-fraud-using-ai-cloned-executive-voices','Three charged in $129 million fraud using AI-cloned executive voices','Prosecutors say the scheme impersonated executives and lawyers; one Missouri hospital system lost $4.8 million.','Prosecutors say the scheme impersonated executives and lawyers; one Missouri hospital system lost $4.8 million.

### What to do

Keep an eye on follow-up reporting and brief your team.

*Original reporting: [Trust Infinitech](https://www.trustinfinitech.com/cybersecurity-ai-roundup-november-6-2026/)*','AI Security','info',array[]::text[],array['Deepfake','BEC']::text[],'Trust Infinitech','https://www.trustinfinitech.com/cybersecurity-ai-roundup-november-6-2026/',false,false,'published','2026-11-06T09:00:00Z')
on conflict (slug) do nothing;

insert into public.articles (slug,title,excerpt,body_md,category,severity,cves,tags,source_name,source_url,is_premium,is_lead,status,published_at)
values ('chrome-157-fixes-213-security-issues-seven-of-them-critical','Chrome 157 fixes 213 security issues, seven of them critical','Restart Chrome to apply the update. Critical browser bugs are a common first step in drive-by attacks.','Restart Chrome to apply the update. Critical browser bugs are a common first step in drive-by attacks.

### What to do

Check exposure this week and follow the vendor or investigator guidance in the source report.

*Original reporting: [Malwarebytes Labs](https://www.malwarebytes.com/blog/news/2026/11/a-week-in-security-october-26-november-1-2)*','Vulnerabilities','high',array[]::text[],array['Chrome','Browser']::text[],'Malwarebytes Labs','https://www.malwarebytes.com/blog/news/2026/11/a-week-in-security-october-26-november-1-2',false,false,'published','2026-11-04T09:00:00Z')
on conflict (slug) do nothing;

insert into public.articles (slug,title,excerpt,body_md,category,severity,cves,tags,source_name,source_url,is_premium,is_lead,status,published_at)
values ('two-ivanti-connect-secure-flaws-join-the-exploited-list','Two Ivanti Connect Secure flaws join the exploited list','CVE-2026-111357 (missing authentication) and CVE-2026-118527 (predictable identifiers) are being used in the wild.','CVE-2026-111357 (missing authentication) and CVE-2026-118527 (predictable identifiers) are being used in the wild.

### What to do

Check exposure this week and follow the vendor or investigator guidance in the source report.

*Original reporting: [CISA](https://www.cisa.gov/news-events/alerts/2026/10/30/cisa-adds-two-known-exploited-vulnerabilities-catalog)*','Vulnerabilities','high',array[]::text[],array['Ivanti','VPN','KEV']::text[],'CISA','https://www.cisa.gov/news-events/alerts/2026/10/30/cisa-adds-two-known-exploited-vulnerabilities-catalog',false,false,'published','2026-10-30T09:00:00Z')
on conflict (slug) do nothing;

insert into public.articles (slug,title,excerpt,body_md,category,severity,cves,tags,source_name,source_url,is_premium,is_lead,status,published_at)
values ('remote-hacks-warm-supermarket-fridges-french-blood-bank-site-hit','Remote hacks warm supermarket fridges; French blood bank site hit','Retailers in several European countries reported refrigeration systems tampered with remotely. A separate attack on a French blood bank site did not affect blood products.','Retailers in several European countries reported refrigeration systems tampered with remotely. A separate attack on a French blood bank site did not affect blood products.

### What to do

Keep an eye on follow-up reporting and brief your team.

*Original reporting: [SecurityWeek](https://www.securityweek.com/)*','Threats','medium',array[]::text[],array['OT','Critical infrastructure']::text[],'SecurityWeek','https://www.securityweek.com/',false,false,'published','2026-11-05T09:00:00Z')
on conflict (slug) do nothing;

insert into public.articles (slug,title,excerpt,body_md,category,severity,cves,tags,source_name,source_url,is_premium,is_lead,status,published_at)
values ('japan-announces-emergency-cybersecurity-package-after-attack-wave','Japan announces emergency cybersecurity package after attack wave','The response follows a run of breaches across Asia, including an incident at internet company GMO''s Onamae service.','The response follows a run of breaches across Asia, including an incident at internet company GMO''s Onamae service.

### What to do

Keep an eye on follow-up reporting and brief your team.

*Original reporting: [SecurityWeek](https://www.securityweek.com/)*','Policy','info',array[]::text[],array['Japan','Government']::text[],'SecurityWeek','https://www.securityweek.com/',false,false,'published','2026-11-06T09:00:00Z')
on conflict (slug) do nothing;

insert into public.articles (slug,title,excerpt,body_md,category,severity,cves,tags,source_name,source_url,is_premium,is_lead,status,published_at)
values ('d-link-warns-of-multiple-zero-days-in-dgs-3130-switches','D-Link warns of multiple zero-days in DGS-3130 switches','Enterprise switch owners should check D-Link''s advisory and restrict management interfaces until fixes are applied.','Enterprise switch owners should check D-Link''s advisory and restrict management interfaces until fixes are applied.

### What to do

Check exposure this week and follow the vendor or investigator guidance in the source report.

*Original reporting: [Cybersecurity News roundup](https://theparkernathan.substack.com/p/cybersecurity-news-november-6-2026)*','Vulnerabilities','high',array[]::text[],array['D-Link','Zero-day']::text[],'Cybersecurity News roundup','https://theparkernathan.substack.com/p/cybersecurity-news-november-6-2026',false,false,'published','2026-11-06T09:00:00Z')
on conflict (slug) do nothing;

