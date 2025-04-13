import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { options } from "../../auth/[...nextauth]/options";
import { z } from "zod";

//employerNoSchema
const employerNoSchema = z
  .string()
  .min(1, "Employer Number is required")
  .regex(
    /^[A-Z]\/\d{5}$/i,
    "Employer Number must match the pattern A/12345 or a/12345"
  );

//period schema
const periodSchema = z
  .string()
  .min(1, "Period is required")
  .regex(/^\d{4}-\d{2}$/i, "Period must match the pattern YYYY-MM");

export async function POST(req: NextRequest) {
  try {
    // Get user session
    const session = await getServerSession(options);
    const user = session?.user || null;
    const userId = user?.id;

    if (!userId) {
      return NextResponse.json(
        { message: "User ID is required" },
        { status: 400 }
      );
    }

    // Parse and validate the request body
    const body = await req.json();

    const employerNo = employerNoSchema.parse(body.employerNo);
    let period = body.period;

    // if period not available
    if (!period) {
      const date = new Date();
      date.setMonth(date.getMonth() - 2);
      period = date.toISOString().slice(0, 7);
    }

    period = periodSchema.parse(period);

    // Get reference number and name
    const [referenceNo, name] = await get_ref_no_name(employerNo, period);

    // Return success response
    return NextResponse.json({ name, referenceNo });
  } catch (error) {
    // Handle Zod validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: error.errors[0].message },
        { status: 400 }
      );
    }
    // Handle general errors
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred",
      },
      { status: 500 }
    );
  }
}

const get_ref_no_name = async (employer_no: string, period: string) => {
  const [employer_no_zn, employer_no_number] = employer_no.split("/");
  const formattedPeriod = period.replace("-", "");

  try {
    const response = await fetch("https://www.cbsl.lk/EPFCRef/", {
      headers: {
        accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
        "accept-language": "en-LK,en-GB;q=0.9,en-US;q=0.8,en;q=0.7,si;q=0.6",
        "cache-control": "no-cache",
        "content-type": "application/x-www-form-urlencoded",
        pragma: "no-cache",
        priority: "u=0, i",
        "sec-ch-ua":
          '"Chromium";v="134", "Not:A-Brand";v="24", "Google Chrome";v="134"',
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": '"Windows"',
        "sec-fetch-dest": "document",
        "sec-fetch-mode": "navigate",
        "sec-fetch-site": "same-origin",
        "sec-fetch-user": "?1",
        "upgrade-insecure-requests": "1",
        Referer: "https://www.cbsl.lk/EPFCRef/",
        "Referrer-Policy": "strict-origin-when-cross-origin",
      },
      body: `__VIEWSTATE=GUmswFk27PcGVsZ8lPRHoMYhQTZ343yD0vHZB5RCY8fKZYQAIwpnL7sf7iZ51w6L3efg5eA4H1IycZNmbUGbZjyCGmNtXrb4%2FqZtpHUdyVHWAcsNijYjwKzlymNuUnx6wC%2BLq8021VJkqaZy6%2BAId4y5nThnxZTA%2FP4wt%2BWM5ONK3BNrZ%2Fkn0h%2FfpBiqEF9qcImIpvBTyKXd61%2BWou7JOKaGnml%2Bp3TuN2euB8O4JTWs7zHcT8Bjj9Q3wV0W2kQsDhF9rGukMrSVivXIoDtTiWlMummUDwtfTl%2BUbIBqJFRUeVdYnhNvgH80LyGisDzRH7zY4aEsZpgKlgIJUccm5ZhTmlDsucQ%2BMcD44KUBTs5TJf%2Bk8xczsrO3wGMHIUGd%2FRrwoOGCkY1d3VBOf%2BUVkdtfRMDkESSZEtEtZZp1AVyHgnuX6YdtmV83p0o3daDQfgqZ217Zjmkyc87Yi7CrmCak%2B7OhOK%2FGZDx6n9SExCUfgO2kXTjt6FMf1x8xXvuTpLQJr8kUWKEedWTOB3Fvsw%3D%3D&__VIEWSTATEGENERATOR=7BA8A1FC&__EVENTVALIDATION=Q%2BlfbKtyxBaXC2VftdYAxF3ZMYTj7CsYnCWeGetFVCRITa9nb61I8Mc0V8iRRxSHigYJKAu70SB8ZCaznKh4opu6BBvZVskKVMbHjg%2BJCntsxJBOZWCFecECHnpCwk3l2yqUJ76Bkl05hWHgqlruJl%2Bw9%2FZsmmnWeyHMqMhXBQT4NHYanwfrRnTzRE9q6QRIg4m5s0BOuznOwiLF%2FxwzphzUKWaf46QYL481H6jh7%2F07OGyKmlHszSZVF2Rs1JUXafJ5K9%2FdCzuvsWEwJCAAtx3cQrF8PYnO9wvbZO7Zt5tmaJL9gzuVB25cmJ4dP%2FZDWGBlbLRz6xXxieQbgSLwtobF5Qvmru%2BOQW5iFcG6%2FqJg9fCJ9EcohLijGVmqPp0W&zn=${employer_no_zn}&em=${employer_no_number}&mn=${formattedPeriod}&sb=1&checkb=Get+Reference`,
      method: "POST",
    });

    if (!response.ok) {
      throw new Error(`Network response was not ok: ${response.statusText}`);
    }

    const text = await response.text();

    // Extract employer name
    const matchName = text.match(/<span id="empnm">.*<\/span>/);
    const employer_name = matchName
      ? matchName[0]
          .replace(/<[^>]*>/g, "")
          .split(":")[1]
          .trim()
      : null;

    // Extract reference number
    const matchRef = text.match(/<span id="refno">.*<\/span>/);
    const reference_no = matchRef
      ? matchRef[0]
          .replace(/<[^>]*>/g, "")
          .split(":")[1]
          .trim()
      : null;

    return [reference_no, employer_name];
  } catch (error) {
    if (error instanceof Error) {
      console.error("An error occurred:", error.message);
    } else {
      console.error("An unknown error occurred");
    }
    return [null, null];
  }
};
