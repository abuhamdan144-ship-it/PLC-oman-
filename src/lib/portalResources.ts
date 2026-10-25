export interface PortalContact {
  name: string;
  description: string;
  number: string;
  dialHref: string;
  sourceLabel: string;
  sourceUrl: string;
  priority: 'emergency' | 'official' | 'judicial';
  whatsappHref?: string;
}

export const portalContacts: PortalContact[] = [
  {
    name: 'Royal Oman Police — Emergency',
    description: 'Emergency response in Oman. Call immediately for urgent danger or medical emergencies.',
    number: '9999',
    dialHref: 'tel:9999',
    sourceLabel: 'Gov.om / ROP',
    sourceUrl: 'https://gov.om/en/royal-oman-police',
    priority: 'emergency',
  },
  {
    name: 'Pakistan Embassy — Muscat',
    description: 'Main embassy telephone for general consular enquiries.',
    number: '+968 2460 3439',
    dialHref: 'tel:+96824603439',
    sourceLabel: 'Embassy of Pakistan (MOFA)',
    sourceUrl: 'https://mofa.gov.pk/muscat-contact-us',
    priority: 'official',
  },
  {
    name: 'Embassy Community Welfare Attaché',
    description: 'Official office telephone for the Embassy Community Welfare Wing.',
    number: '+968 2460 3343',
    dialHref: 'tel:+96824603343',
    sourceLabel: 'Embassy of Pakistan (MOFA)',
    sourceUrl: 'https://mofa.gov.pk/muscat-contact-us',
    priority: 'official',
  },
  {
    name: 'Embassy Emergency WhatsApp',
    description: 'Official emergency mobile / WhatsApp contact published for the Immigration Counsellor.',
    number: '+968 9127 6197',
    dialHref: 'tel:+96891276197',
    sourceLabel: 'Embassy of Pakistan (MOFA)',
    sourceUrl: 'https://mofa.gov.pk/muscat-contact-us',
    priority: 'official',
    whatsappHref: 'https://wa.me/96891276197',
  },
  {
    name: 'Oman Ministry of Labour',
    description: 'General enquiries and official labour complaint guidance. Toll-free number listed by Gov.om.',
    number: '+968 8007 7000',
    dialHref: 'tel:+96880077000',
    sourceLabel: 'Gov.om / Ministry of Labour',
    sourceUrl: 'https://gov.om/en/ministry-of-labour',
    priority: 'official',
  },
  {
    name: 'Supreme Judicial Council — General Enquiries',
    description: 'General judicial enquiries only; this is not a dedicated labour-court hotline.',
    number: '+968 2280 0381',
    dialHref: 'tel:+96822800381',
    sourceLabel: 'Gov.om / Supreme Judicial Council',
    sourceUrl: 'https://gov.om/en/supreme-judicial-council',
    priority: 'judicial',
  },
];

export interface NewsSource {
  category: string;
  title: string;
  description: string;
  url: string;
  sourceLabel: string;
}

export const officialNewsSources: NewsSource[] = [
  {
    category: 'Pakistan',
    title: 'Pakistan latest news',
    description: 'Open current national and regional headlines from Associated Press of Pakistan (English).',
    url: 'https://www.app.com.pk/',
    sourceLabel: 'Associated Press of Pakistan (APP)',
  },
  {
    category: 'Pakistan · Urdu',
    title: 'پاکستان کی تازہ خبریں',
    description: 'Associated Press of Pakistan کی تازہ اردو خبریں۔',
    url: 'https://urdu.app.com.pk/urdu/',
    sourceLabel: 'Associated Press of Pakistan (APP Urdu)',
  },
  {
    category: 'Oman',
    title: 'Oman latest news',
    description: 'Open the live English-language Oman News Agency feed for current Sultanate news and announcements.',
    url: 'https://omannews.gov.om/topics/index.ona?GetLang=en',
    sourceLabel: 'Oman News Agency (ONA)',
  },
  {
    category: 'Labour rules',
    title: 'Worker rights and duties',
    description: 'Official Oman Ministry of Labour guidance on employee rights, duties and labour law topics.',
    url: 'https://www.mol.gov.om/pages/Employee-Rights-And-Duties',
    sourceLabel: 'Oman Ministry of Labour',
  },
  {
    category: 'New rules',
    title: 'Labour publications and updates',
    description: 'Check the Ministry’s live publications page for current labour circulars and guidance.',
    url: 'https://www.mol.gov.om/LaborPublication',
    sourceLabel: 'Oman Ministry of Labour',
  },
  {
    category: 'Official services',
    title: 'Labour services and ministry news',
    description: 'Official government page for Ministry of Labour services, notices and contact information.',
    url: 'https://gov.om/en/ministry-of-labour',
    sourceLabel: 'Gov.om',
  },
];
