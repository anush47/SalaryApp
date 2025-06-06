interface LocalizedString {
  [key: string]: string;
}

interface LocalizedContent {
  [key: string]: string | string[];
}

interface HelpSubsection {
  id: string;
  title: LocalizedString;
  content: LocalizedContent;
  imageUrl?: LocalizedString;
}

interface HelpSection {
  id: string;
  title: LocalizedString;
  videoUrl?: LocalizedString;
  content: LocalizedContent;
  imageUrl?: LocalizedString;
  subsections?: HelpSubsection[];
}

export const availableLanguages = [
  { code: "en", name: "English" },
  { code: "si", name: "Sinhala" },
];

export const mainVideoSection: HelpSection = {
  id: "overview-video",
  title: {
    en: "Watch Our Quick Start Video",
    si: "අපගේ ඉක්මන් ආරම්භක වීඩියෝව නරඹන්න",
  },
  videoUrl: {
    en: "https://www.youtube.com/embed/StWSpZHF998?si=7iEoPGTE70EXKZ0h",
    si: "https://www.youtube.com/embed/sinhala-video-id", // Placeholder
  },
  content: {
    en: "This video provides a comprehensive overview of SalaryApp's core functionalities for new employers.",
    si: "මෙම වීඩියෝව නව සේවා යෝජකයින් සඳහා SalaryApp හි මූලික ක්‍රියාකාරකම් පිළිබඳ පුළුල් දළ විශ්ලේෂණයක් සපයයි.",
  },
};

export const helpContentData: HelpSection[] = [
  {
    id: "getting-started",
    title: {
      en: "1. Getting Started with SalaryApp",
      si: "1. SalaryApp සමඟ ආරම්භ කිරීම",
    },
    content: {
      en: [
        "Welcome to SalaryApp! To get started, simply log in using your Google account. If you don't have an account, you can create one easily.",
        "Once logged in, you'll be directed to the dashboard where you can manage your salary details.",
      ],
      si: [
        "SalaryApp වෙත සාදරයෙන් පිළිගනිමු! ආරම්භ කිරීමට, ඔබගේ Google ගිණුම භාවිතයෙන් පුරනය වන්න. ඔබට ගිණුමක් නොමැති නම්, ඔබට පහසුවෙන් එකක් සෑදිය හැක.",
        "පුරනය වූ පසු, ඔබට ඔබගේ වැටුප් විස්තර කළමනාකරණය කළ හැකි උපකරණ පුවරුව වෙත යොමු කරනු ඇත.",
      ],
    },
    imageUrl: {
      en: "/Logo.png",
    },
  },
  {
    id: "creating-company",
    title: {
      en: "2. Creating Your First Company",
      si: "2. ඔබගේ පළමු සමාගම නිර්මාණය කිරීම",
    },
    content: {
      en: [
        "The first step is to add your company. Click on the 'Add Company' button on the dashboard.",
        "Fill in the required details such as company name, address, and contact information. Ensure all fields are accurate.",
        "After saving, your new company will appear on your dashboard.",
      ],
      si: [
        "පළමු පියවර වන්නේ ඔබගේ සමාගම එක් කිරීමයි. උපකරණ පුවරුවේ 'සමාගම එක් කරන්න' බොත්තම ක්ලික් කරන්න.",
        "සමාගමේ නම, ලිපිනය සහ සම්බන්ධතා තොරතුරු වැනි අවශ්‍ය විස්තර පුරවන්න. සියලුම ක්ෂේත්‍ර නිවැරදි බව සහතික කරන්න.",
        "සුරැකීමෙන් පසු, ඔබගේ නව සමාගම ඔබගේ උපකරණ පුවරුවේ දිස්වනු ඇත.",
      ],
    },
    subsections: [
      {
        id: "company-details",
        title: {
          en: "2.1. Configuring Company Details",
          si: "2.1. සමාගම් විස්තර වින්‍යාස කිරීම",
        },
        content: {
          en: [
            "Navigate to your company's profile to set up payment structures, shifts, and working days.",
            "This information is crucial for accurate salary calculations.",
          ],
          si: [
            "ගෙවීම් ව්‍යුහයන්, මාරුවීම් සහ වැඩ කරන දින සැකසීමට ඔබගේ සමාගමේ පැතිකඩ වෙත යන්න.",
            "මෙම තොරතුරු නිවැරදි වැටුප් ගණනය කිරීම් සඳහා ඉතා වැදගත් වේ.",
          ],
        },
      },
    ],
  },
  {
    id: "managing-employees",
    title: {
      en: "3. Managing Employees",
      si: "3. සේවකයින් කළමනාකරණය කිරීම",
    },
    content: {
      en: [
        "After setting up your company, you can add and manage your employees.",
        "Go to the 'Employees' section within your company's dashboard.",
      ],
      si: [
        "ඔබගේ සමාගම පිහිටුවීමෙන් පසු, ඔබට ඔබගේ සේවකයින් එක් කිරීමට සහ කළමනාකරණය කිරීමට හැකිය.",
        "ඔබගේ සමාගමේ උපකරණ පුවරුව තුළ 'සේවකයින්' කොටස වෙත යන්න.",
      ],
    },
    subsections: [
      {
        id: "adding-employees",
        title: {
          en: "3.1. Adding New Employees",
          si: "3.1. නව සේවකයින් එක් කිරීම",
        },
        content: {
          en: [
            "Click on 'Add Employee' and fill in their personal and employment details.",
            "Ensure all mandatory fields are completed for accurate record-keeping.",
          ],
          si: [
            "ඔබගේ Google ගිණුම භාවිතයෙන් පුරනය වන්න. ඔබට ගිණුමක් නොමැති නම්, ඔබට පහසුවෙන් එකක් සෑදිය හැක.",
            "පුරනය වූ පසු, ඔබට ඔබගේ වැටුප් විස්තර කළමනාකරණය කළ හැකි උපකරණ පුවරුව වෙත යොමු කරනු ඇත.",
          ],
        },
      },
      {
        id: "editing-employees",
        title: {
          en: "3.2. Editing Employee Details",
          si: "3.2. සේවක විස්තර සංස්කරණය කිරීම",
        },
        content: {
          en: [
            "You can edit existing employee details by selecting them from the list.",
            "Make sure to save any changes you make.",
          ],
          si: [
            "ලැයිස්තුවෙන් සේවකයින් තෝරා ගැනීමෙන් ඔබට පවතින සේවක විස්තර සංස්කරණය කළ හැකිය.",
            "ඔබ කරන ඕනෑම වෙනස්කමක් සුරැකීමට වග බලා ගන්න.",
          ],
        },
      },
    ],
  },
  {
    id: "generating-salaries",
    title: {
      en: "4. Generating & Managing Salaries",
      si: "4. වැටුප් උත්පාදනය සහ කළමනාකරණය",
    },
    content: {
      en: [
        "The core function of SalaryApp is to help you generate and manage employee salaries efficiently.",
        "Navigate to the 'Salaries' section in your company's dashboard.",
      ],
      si: [
        "SalaryApp හි මූලික කාර්යය වන්නේ සේවක වැටුප් කාර්යක්ෂමව උත්පාදනය කිරීමට සහ කළමනාකරණය කිරීමට ඔබට උපකාර කිරීමයි.",
        "ඔබගේ සමාගමේ උපකරණ පුවරුවේ 'වැටුප්' කොටස වෙත යන්න.",
      ],
    },
    subsections: [
      {
        id: "initial-setup",
        title: {
          en: "4.1. Initial Setup for Salary Generation",
          si: "4.1. වැටුප් උත්පාදනය සඳහා ආරම්භක සැකසුම",
        },
        content: {
          en: [
            "Before generating salaries, ensure all employee details and company payment structures are correctly configured.",
          ],
          si: [
            "වැටුප් උත්පාදනය කිරීමට පෙර, සියලුම සේවක විස්තර සහ සමාගම් ගෙවීම් ව්‍යුහයන් නිවැරදිව වින්‍යාස කර ඇති බවට සහතික වන්න.",
          ],
        },
      },
      {
        id: "generate-salaries",
        title: {
          en: "4.2. Generating Salaries",
          si: "4.2. වැටුප් උත්පාදනය",
        },
        content: {
          en: [
            "Select the pay period and click 'Generate Salaries'. The system will calculate salaries based on configured rules.",
          ],
          si: [
            "ගෙවීම් කාලය තෝරා 'වැටුප් උත්පාදනය කරන්න' ක්ලික් කරන්න. පද්ධතිය වින්‍යාස කර ඇති නීති මත පදනම්ව වැටුප් ගණනය කරනු ඇත.",
          ],
        },
      },
      {
        id: "view-edit-salaries",
        title: {
          en: "4.3. Viewing & Editing Salaries",
          si: "4.3. වැටුප් බැලීම සහ සංස්කරණය කිරීම",
        },
        content: {
          en: [
            "You can view generated salaries and make any necessary adjustments before finalizing payments.",
          ],
          si: [
            "ගෙවීම් අවසන් කිරීමට පෙර ඔබට උත්පාදනය කරන ලද වැටුප් බැලීමට සහ අවශ්‍ය ගැලපීම් කිරීමට හැකිය.",
          ],
        },
      },
    ],
  },
  {
    id: "payments-purchases",
    title: {
      en: "5. Payments & Purchases",
      si: "5. ගෙවීම් සහ මිලදී ගැනීම්",
    },
    content: {
      en: [
        "Track all your company's payments and purchases within SalaryApp.",
        "Access these sections from your company's dashboard to manage financial records.",
      ],
      si: [
        "ඔබගේ සමාගමේ සියලුම ගෙවීම් සහ මිලදී ගැනීම් SalaryApp තුළ නිරීක්ෂණය කරන්න.",
        "මූල්‍ය වාර්තා කළමනාකරණය කිරීමට ඔබගේ සමාගමේ උපකරණ පුවරුවෙන් මෙම කොටස් වෙත පිවිසෙන්න.",
      ],
    },
  },
  {
    id: "user-settings",
    title: {
      en: "6. User Settings",
      si: "6. පරිශීලක සැකසුම්",
    },
    content: {
      en: [
        "Manage your personal account settings, including changing your password and other preferences.",
        "Access this section from the main user dashboard.",
      ],
      si: [
        "ඔබගේ මුරපදය සහ අනෙකුත් මනාපයන් වෙනස් කිරීම ඇතුළුව ඔබගේ පුද්ගලික ගිණුම් සැකසුම් කළමනාකරණය කරන්න.",
        "ප්‍රධාන පරිශීලක උපකරණ පුවරුවෙන් මෙම කොටස වෙත පිවිසෙන්න.",
      ],
    },
  },
];
