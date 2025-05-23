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
          '"Chromium";v="136", "Google Chrome";v="136", "Not.A/Brand";v="99"',
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
      body: `__VIEWSTATE=jW3B5OCQYHC83zRMA4%2F6yT%2FGaaM9J1SqZjXRw9ROGIYeKPHZneCk4tozaIhzSjwCcttwYPqswVhDvsyJSSTHTQ7tuBnPkZRxqOMAYikDAQ5W%2BfjeFfVTDuI5HIybDCWBNzjUYyZr6CwGT2bYCCq3wOvfijagIR%2FhS1cUIBTLOTafdHhNhivmYSvDBUhsb%2BDUBQ3JH9HWK3zkWiPtHygKqW%2Bv31SYnGt2A4W0gNEjYfW2gvqX4El%2F1VmlMik8UHuwVNccW4HMMh2Lp9umt4uTgHrFm4NJkUtPz3Hrg523nZLL1UzSta6mWDD8xUREFVPz8hTrn0dYx6rL7341i3fHo%2FHS%2BWbJs61CthQKGzKmr5pNWKU%2F2p5YcFmWHMC7%2BHQTOqs6lXgdNStGF6rn%2FUMmfLLwJ9sxpiHj%2Fwlh7u%2BZxTvbPaWqGypgBgUnoQWOygytovTHWYIZVUXT7cFaO2CPRB3z%2FBAJaUPGjf%2BSmtdDlJ9dxLR0CJOk5zHSpvUTHshZcy5ISnNmcex4%2FS2fepAGM0XILrOPg%2B5xSaj4KX0sc1U%3D&__VIEWSTATEGENERATOR=7BA8A1FC&__EVENTVALIDATION=dlUdGrg9kbW7NtwsDYm0Vtps3behf7%2FoU78OQJgTYoV12526qEqbb4lPPiAb7LXptmDxJQ7VSUsM7KPR2zrdrG3ISUwIfkpb9gAMsi9yVTv6gd7MMMW7dnQ3bni5Y9bVqBfeYdZobg9uzbTOiq88985O5ao0fcXMKVY6Gyif6o0qUwbjhmCIfjsYZ%2FxhWi6ugjk9WVmP%2FWNDvVbNWJy1pMqRkZQXfefY5rVKl%2BtREwaH21gUcLzEv%2FeNiC492fky111IQGUg98Y8RWaatEDO0wQ%2F8FIFm8FuDr1dtiMr5P6FwBqlS21LwBQ3eCwrRU29hSNxxOmx7vSmK1RKpm%2FRaOVBsL0Yv6CiGHgrozrX%2F%2FrKXIRbCdvqiAtj1TBCfbZd%2BB7ARjiAT1R7Ceoi%2BPT3NA%3D%3D&zn=${employer_no_zn}&em=${employer_no_number}&mn=${formattedPeriod}&sb=1&checkb=Get+Reference`,
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
