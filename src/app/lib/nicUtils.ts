export const getNICDetails = (nic: string) => {
    let year, days, birthDay, age, gender;

    // Clean the NIC string
    const cleanNic = nic ? nic.trim() : "";

    if (cleanNic.length === 10) {
        // Old NIC format
        year = parseInt("19" + cleanNic.substring(0, 2));
        days = parseInt(cleanNic.substring(2, 5));
    } else if (cleanNic.length === 12) {
        // New NIC format
        year = parseInt(cleanNic.substring(0, 4));
        days = parseInt(cleanNic.substring(4, 7));
    } else {
        return { birthDay: "", age: "", gender: "" };
    }

    // Determine gender
    if (days > 500) {
        gender = "female";
        days -= 500;
    } else {
        gender = "male";
    }

    // Determine date of birth
    const dobDate = new Date(`${year}-01-01`); // January 1st of the given year
    //check if year is leap
    const isLeapYear = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
    if (days > 59 && !isLeapYear) {
        days -= 1;
    }
    dobDate.setDate(dobDate.getDate() + days - 1);

    //format as dd/mm/yyyy
    birthDay = `${dobDate.getDate().toString().padStart(2, "0")}-${(
        dobDate.getMonth() + 1
    )
        .toString()
        .padStart(2, "0")}-${dobDate.getFullYear()}`; // Format DD/MM/YYYY

    // Calculate age
    const today = new Date();
    age = today.getFullYear() - year;
    if (
        today.getMonth() < dobDate.getMonth() ||
        (today.getMonth() === dobDate.getMonth() &&
            today.getDate() < dobDate.getDate())
    ) {
        age--;
    }

    age = age.toString();

    return { birthDay, age, gender };
};
