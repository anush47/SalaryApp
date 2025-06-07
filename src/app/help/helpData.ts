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

export const helpContentData: HelpSection[] = [
  {
    id: "getting-started",
    title: {
      en: "1. Getting Started with SalaryApp",
      si: "1. SalaryApp සමඟ ආරම්භ කිරීම",
    },
    content: {
      en: [
        "Let`s get started! Just click on <b>“Get Started”</b> to begin.",
        "Now, select <b>“Continue with Google”</b> to log in using your Google account.",
        "Pick your Google account, and continue to sign in.",
        "Once you're in, click on <b>“Go to My Companies”</b> to see your list of companies.",
      ],
      si: [
        "ආරම්භ කරමු! ආරම්භ කිරීමට <b>“Get Started”</b> බොත්තම ඔබන්න.",
        "දැන්, ඔබේ Google ගිණුම භාවිතා කර පුරනය වීමට <b>“Continue with Google”</b> තෝරන්න.",
        "ඔබේ Google ගිණුම තෝරා, පිවිසෙන්න.",
        "පුරනය වූ පසු, ඔබේ සමාගම් ලැයිස්තුව දැකීමට <b>“Go to My Companies”</b> ක්ලික් කරන්න.",
      ],
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
        "Ready to add a new company? Hit <b>“Add Company”</b> to get started.",
        "Go ahead and enter your employer number right here.",
        "Click <b>“Search”</b> to find your registered business name from the Central Bank — it should show up below.",
        "Fill in the details based on your business info.",
        "All done? Click <b>“Add”</b> to save the company.",
        "Now click on the newly added company to open up its details.",
      ],
      si: [
        "නව සමාගමක් එක් කිරීමට සූදානම්ද? ආරම්භ කිරීමට <b>“Add Company”</b> ක්ලික් කරන්න.",
        "ඔබේ සේවාදායක අංකය මෙහි ඇතුළත් කරන්න.",
        "<b>“Search”</b> ක්ලික් කර මධ්‍යම බැංකුවෙන් ලියාපදිංචි ව්‍යාපාර නම සොයන්න — පහළින් පෙන්වනු ඇත.",
        "ඔබගේ ව්‍යාපාර තොරතුරු අනුව විස්තර පුරවන්න.",
        "සියල්ල සම්පූර්ණද? සමාගම සුරැකිමට <b>“Add”</b> ක්ලික් කරන්න.",
        "දැන්, නව සමාගම ක්ලික් කර එහි විස්තර විවෘත කරන්න.",
      ],
    },
  },
  {
    id: "managing-employees",
    title: {
      en: "3. Managing Employees",
      si: "3. සේවක කළමනාකරණය",
    },
    content: {
      en: [
        "Let’s manage your employees! Click on <b>“Employees”</b>.",
        "Then click on <b>“Add Employee”</b> to add someone new.",
        "Fill out the employee’s details — name, contact info, and so on.",
        "Choose the category they belong to. You can also enter a salary as a value or a range — but this part is optional.",
        "Now, click on <b>“OT-Method”</b> to decide how their overtime should be calculated.",
        "Choose <b>“Calculate from In-Out”</b> if OT depends on attendance. Or pick <b>“No Overtime”</b> if it doesn’t apply.",
        "Click on <b>“Overrides”</b> to customize settings like payment structure or shifts for this specific employee.",
        "This is where you can override the company defaults for that individual employee.",
        "Done? Click <b>“Add”</b> to save the employee details.",
      ],
      si: [
        "ඔබේ සේවකයන් කළමනාකරණය කරමු! <b>“Employees”</b> ක්ලික් කරන්න.",
        "පසුව, අලුත් සේවකයෙකු එක් කිරීමට <b>“Add Employee”</b> ක්ලික් කරන්න.",
        "සේවකයාගේ විස්තර පුරවන්න — නම, සම්බන්ධතා තොරතුරු, ආදිය.",
        "ඔවුන් අයත් කාණ්ඩය තෝරන්න. වැටුප් අගයක් හෝ පරාසයක් ලෙස ද ඇතුළත් කළ හැක — නමුත් මෙය අනිවාර්ය නොවේ.",
        "දැන්, ඔවුන්ගේ අතිකාලය ගණනය කරන ආකාරය තීරණය කිරීමට <b>“OT-Method”</b> ක්ලික් කරන්න.",
        "<b>“Calculate from In-Out”</b> තෝරන්න නම් අතිකාලය සහභාගීත්වය මත පදනම් වේ. නැතහොත් <b>“No Overtime”</b> තෝරන්න.",
        "<b>“Overrides”</b> ක්ලික් කර මෙම සේවකයා සඳහා ගෙවීම් ව්‍යුහය හෝ මාරු සැකසුම් විශේෂාංග අභිරුචිකරණය කරන්න.",
        "මෙහිදී ඔබ පුද්ගල සේවකයෙකුට සමාගමේ මූලික සැකසුම් වටහා දිය හැක.",
        "සම්පූර්ණද? සේවක විස්තර සුරැකිමට <b>“Add”</b> ක්ලික් කරන්න.",
      ],
    },
  },
  {
    id: "in-out-csv",
    title: {
      en: "4.3. In-Out CSV Format",
      si: "4.3. පැමිණීම/පිටවීම CSV ආකෘතිය",
    },
    content: {
      en: [
        `The <code>In-Out CSV</code> file is used to record employee attendance and is essential 
      for generating accurate salary reports.<br><br>
      
      The CSV must contain two columns named exactly as follows:<br><br>
      
      1. <code>employee</code> &ndash; The unique ID of the employee .<br>
      2. <code>time</code> &ndash; The exact timestamp of each In or Out record in ISO 8601 format 
         (<code>YYYY-MM-DDTHH:MM:SS</code>).<br><br>
      
      Example format:<br>
      <pre><code>employee,time
683f2d609adad715186dafd6,2025-04-30T08:10:00
683f2d609adad715186dafd6,2025-04-30T17:05:00
6711a4169af32d5d8e10cf10,2025-04-30T07:55:00
6711a4169af32d5d8e10cf10,2025-04-30T17:10:00
      </code></pre>
      
      Ensure that each employee has correct 'in' and 'out' times for each working day. 
      Multiple days can be listed in the same file.`,
      ],
      si: [
        `<code>In-Out CSV</code> ගොනුව සේවකයින්ගේ පැමිණීම සහ පිටවීම වාර්තා කිරීම සඳහා භාවිතා වේ. 
      නිවැරදි වැටුප් ගණනය සඳහා මෙය අත්‍යවශ්‍ය වේ.<br><br>
      
      මෙම CSV ගොනුවේ පහත සඳහන් නාමයන් සහිත තීරු දෙකක් අනිවාර්යයෙන්ම තිබිය යුතුය:<br><br>
      
      1. <code>employee</code> &ndash; සේවකයාගේ අද්විතීය හැඳුනුම් අංකය.<br>
      2. <code>time</code> &ndash; එක් එක් පැමිණීම හෝ පිටවීම සඳහා නියමිත කාලය 
         (ISO 8601 ආකෘතියෙන්: <code>YYYY-MM-DDTHH:MM:SS</code>).<br><br>
      
      උදාහරණයක් ලෙස:<br>
      <pre><code>employee,time
683f2d609adad715186dafd6,2025-04-30T08:10:00
683f2d609adad715186dafd6,2025-04-30T17:05:00
6711a4169af32d5d8e10cf10,2025-04-30T07:55:00
6711a4169af32d5d8e10cf10,2025-04-30T17:10:00
      </code></pre>
      
      එක් සේවකයෙකුට එක් දිනයක් සඳහා නිවැරදි 'පැමිණීම' සහ 'පිටවීම' කාලයන් 
      තිබිය යුතුය. බහු දිනයන් එකම ගොනුව තුළ ඇතුළත් කළ හැක.`,
      ],
    },
  },
];
