import type { Locale } from "@/lib/i18n";

// SCP-02, LOC-01/03: organizer-supplied staff roster; never an attendee directory.
// Names/assignments follow the current request. Quotes and profiles were refreshed
// from Sheet1 on 14 October 2026. Missing content is omitted rather than invented.
export type TeamPerson = {
  id: string;
  name: string;
  role: Record<Locale, string>;
  headRole?: Record<Locale, string>;
  description?: string;
  profile?: string;
  portrait?: { src: string; width: number; height: number; zoom?: number; position?: string };
  coLeaders?: readonly { name: string; profile?: string; portrait?: { src: string; width: number; height: number } }[];
  members?: readonly { name: string; arName?: string }[];
};

export type TeamCommittee = {
  id: "scientific" | "organization";
  leader: TeamPerson;
  leads: readonly TeamPerson[];
};

export const teamCommittees: readonly TeamCommittee[] = [
  {
    "id": "scientific",
    "leader": {
      "id": "abdulrahman-ismail-maqbool",
      "name": "Abdulrahman Ismail Maqbool",
      "role": {
        "en": "Conference Leader",
        "ar": "قائد المؤتمر"
      },
      "headRole": {
        "en": "Head of Scientific Committee",
        "ar": "رئيس اللجنة العلمية"
      },
      "portrait": {
        "src": "/media/team/abdulrahman-ismail-maqbool.webp",
        "width": 926,
        "height": 1400,
        "zoom": 1.22,
        "position": "50% 60%"
      }
    },
    "leads": [
      {
        "id": "aishah-baothman",
        "name": "Aishah Baothman",
        "role": {
          "en": "Program & Flow Lead",
          "ar": "رئيسة قسم البرنامج وسير الفعاليات"
        },
        "description": "Professional disaster coordinator",
        "profile": "https://www.linkedin.com/in/aishah-baothman-3711aa319"
      },
      {
        "id": "akram-awan",
        "name": "Akram Awan",
        "role": {
          "en": "Digital & Analytics Lead",
          "ar": "رئيس القسم الرقمي والتحليلات"
        },
        "description": "The numbers are being difficult",
        "profile": "https://www.linkedin.com/in/akram-awan-233a7b2bb/",
        "portrait": {
          "src": "/media/team/akram-awan.webp",
          "width": 880,
          "height": 1100,
          "zoom": 1.38,
          "position": "50% 35%"
        }
      },
      {
        "id": "amal-sayqal",
        "name": "Amal Sayqal",
        "role": {
          "en": "3MT Lead",
          "ar": "رئيسة قسم مسابقة العرض في ثلاث دقائق"
        },
        "description": "Running on research and a strict 3-minute timer.",
        "profile": "https://www.linkedin.com/in/amal-sayqal-319344144"
      },
      {
        "id": "heba-mousa",
        "name": "Heba Mousa",
        "role": {
          "en": "Abstracts Lead",
          "ar": "رئيسة قسم الملخصات البحثية"
        },
        "description": "Reading abstracts so you don't have to",
        "profile": "https://www.linkedin.com/in/heba-ahmed-mousa-412154380",
        "portrait": {
          "src": "/media/team/heba-mousa.webp",
          "width": 1000,
          "height": 1000,
          "zoom": 1.16,
          "position": "50% 75%"
        }
      },
      {
        "id": "laura-hamadi",
        "name": "Laura Hamadi",
        "role": {
          "en": "Academic Sessions Lead",
          "ar": "رئيسة قسم الجلسات الأكاديمية"
        },
        "description": "a shot of espresso",
        "profile": "https://www.linkedin.com/in/laura-h-b144913a1",
        "coLeaders": [
          {
            "name": "Mohammed Almohmadi",
            "profile": "https://www.linkedin.com/in/mohammed-almohmadi-80a5293a8",
            "portrait": { "src": "/media/team/mohammed-almohmadi.webp", "width": 640, "height": 800 }
          }
        ]
      },
      {
        "id": "mohammad-alsayegh",
        "name": "Mohammad Alsayegh",
        "role": {
          "en": "Scientific Officer (Joker)",
          "ar": "المسؤول العلمي (الجوكر)"
        },
        "description": "Dealing a hand, across all scientific operations",
        "portrait": {
          "src": "/media/team/mohammad-alsayegh.webp",
          "width": 1000,
          "height": 1311
        }
      },
      {
        "id": "omar-alsaggaf",
        "name": "Omar Alsaggaf",
        "role": {
          "en": "Hackathon Lead",
          "ar": "رئيس قسم الهاكاثون"
        },
        "description": "Can't hack a ton, but can Hackathon",
        "profile": "https://www.linkedin.com/in/omar-alsaggaf-040865402",
        "portrait": {
          "src": "/media/team/omar-alsaggaf.webp",
          "width": 480,
          "height": 640
        }
      },
      {
        "id": "reem-albeladi",
        "name": "Reem Albeladi",
        "role": {
          "en": "Judges & Faculty Lead",
          "ar": "رئيسة قسم المحكّمين وأعضاء هيئة التدريس"
        },
        "description": "Behind every fair evaluation",
        "profile": "https://www.linkedin.com/in/reem-albeladi-8964ab347"
      },
      {
        "id": "toleen-alhindi",
        "name": "Toleen Alhindi",
        "role": {
          "en": "Awards Lead",
          "ar": "رئيسة قسم الجوائز"
        },
        "description": "Just here to make things happen."
      }
    ]
  },
  {
    "id": "organization",
    "leader": {
      "id": "fatima-salem-alfrhah",
      "name": "Fatima Salem Alfrhah",
      "role": {
        "en": "Conference Leader",
        "ar": "قائدة المؤتمر"
      },
      "headRole": {
        "en": "Head of Organization Committee",
        "ar": "رئيسة اللجنة التنظيمية"
      },
      "description": "Making MSRC happen, fueled by caffeine and panic."
    },
    "leads": [
      {
        "id": "areen-youssef",
        "name": "Areen Youssef",
        "role": {
          "en": "Media Production Lead",
          "ar": "رئيسة قسم الإنتاج الإعلامي"
        }
      },
      {
        "id": "esraa-metwalli",
        "name": "Esraa Metwalli",
        "role": {
          "en": "PR & Finance Lead",
          "ar": "رئيسة قسم العلاقات العامة والمالية"
        },
        "portrait": {
          "src": "/media/team/esraa-metwalli.webp",
          "width": 1000,
          "height": 1250
        }
      },
      {
        "id": "hanadi-orayf",
        "name": "Hanadi Orayf",
        "role": {
          "en": "Media & Design Lead",
          "ar": "رئيسة قسم الإعلام والتصميم"
        },
        "description": "Graphic design is my passion ❤️",
        "profile": "https://www.linkedin.com/in/hanady-oraif-6684a62b9",
        "portrait": {
          "src": "/media/team/hanadi-orayf.webp",
          "width": 1000,
          "height": 667
        },
        "members": [
          {
            "name": "Fatima Alshuqayfi",
            "arName": "فاطمه الشقيفي"
          },
          {
            "name": "Rama Alghamdi",
            "arName": "رامه الغامدي"
          },
          {
            "name": "Tamara Alsindi",
            "arName": "تمارا السندي"
          }
        ]
      },
      {
        "id": "lara-qawas",
        "name": "Lara Qawas",
        "role": {
          "en": "Evaluation Lead",
          "ar": "رئيسة قسم التقييم"
        },
        "description": "Looking back, so we can move forward.",
        "portrait": {
          "src": "/media/team/lara-qawas.webp",
          "width": 1000,
          "height": 1123
        }
      },
      {
        "id": "majed-aljabri",
        "name": "Majed Aljabri",
        "role": {
          "en": "Logistics & AV Lead",
          "ar": "رئيس قسم اللوجستيات والصوتيات والمرئيات"
        },
        "description": "Behind the scenes, making it happen",
        "portrait": {
          "src": "/media/team/majed-aljabri.webp",
          "width": 933,
          "height": 1400,
          "zoom": 1.55,
            "position": "50% 50%"
        }
      },
      {
        "id": "noor-faisal-alquait",
        "name": "Noor Faisal Alquait",
        "role": {
          "en": "Registration Lead",
          "ar": "رئيسة قسم التسجيل"
        },
        "description": "The first hello behind every great event"
      },
      {
        "id": "ola-altaib",
        "name": "Ola Altaib",
        "role": {
          "en": "Ambassadors & Outreach Lead",
          "ar": "رئيسة قسم السفراء والتواصل"
        },
        "profile": "https://www.linkedin.com/in/ola-altaib-440008278",
        "portrait": {
          "src": "/media/team/ola-altaib.webp",
          "width": 981,
          "height": 1280
        }
      },
      {
        "id": "sara-qadi",
        "name": "Sara Qadi",
        "role": {
          "en": "VIP & Hospitality Lead",
          "ar": "رئيسة قسم كبار الشخصيات والضيافة"
        },
        "description": "Making MSRC feel like home, one guest at a time.",
        "profile": "https://www.linkedin.com/in/sara-qadi-542453390",
        "portrait": {
          "src": "/media/team/sara-qadi.webp",
          "width": 719,
          "height": 959,
          "zoom": 1.3,
          "position": "50% 65%"
        }
      },
      {
        "id": "sarah-tayeb",
        "name": "Sarah Tayeb",
        "role": {
          "en": "Décor Lead",
          "ar": "رئيسة قسم الديكور"
        },
        "description": "Turning ideas into aesthetics."
      },
      {
        "id": "sulaf-alghamdi",
        "name": "Sulaf Alghamdi",
        "role": {
          "en": "Operation & Workforce Lead",
          "ar": "رئيسة قسم العمليات والقوى العاملة"
        },
        "description": "Running operations, not from them",
        "profile": "https://www.linkedin.com/in/sulaf-alghamdi-774058219",
        "portrait": {
          "src": "/media/team/sulaf-alghamdi.webp",
          "width": 1000,
          "height": 993
        }
      }
    ]
  }
];

export const teamCopy = {
  "en": {
    "title": "The people\nbehind MSRC.",
    "lead": "Two committees. One shared vision. Meet the team bringing MSRC 2027 together.",
    "committeeView": "Committee view",
    "both": "Both committees",
    "scientific": "Scientific",
    "organization": "Organization",
    "scientificTitle": "Scientific committee",
    "organizationTitle": "Organization committee",
    "portraitPending": "Portrait pending",
    "viewTeam": "View team",
    "members": "Members",
    "coLeader": "Co-Leader",
    "close": "Close",
    "profileLabel": "LinkedIn",
    "ledBy": "Led by",
    "teamTitle": "team",
    "home": "Home",
    "breadcrumb": "Breadcrumb",
    "label": "Our Team"
  },
  "ar": {
    "title": "الفريق خلف\nمؤتمر MSRC.",
    "lead": "لجنتان، ورؤية واحدة. تعرّفوا على الفريق الذي يعمل على تنظيم مؤتمر MSRC 2027.",
    "committeeView": "عرض اللجان",
    "both": "اللجنتان",
    "scientific": "العلمية",
    "organization": "التنظيمية",
    "scientificTitle": "اللجنة العلمية",
    "organizationTitle": "اللجنة التنظيمية",
    "portraitPending": "الصورة لاحقًا",
    "viewTeam": "عرض الفريق",
    "members": "الأعضاء",
    "coLeader": "نائب رئيس القسم",
    "close": "إغلاق",
    "profileLabel": "لينكدإن",
    "ledBy": "بقيادة",
    "teamTitle": "فريق",
    "home": "الرئيسية",
    "breadcrumb": "مسار التنقل",
    "label": "فريقنا"
  }
} as const;
