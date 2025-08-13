import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { options } from "../../auth/[...nextauth]/options";
import { z } from "zod";

// In-memory cache for VIEWSTATE and EVENTVALIDATION
const viewStateCache = new Map<string, { viewState: string; eventValidation: string; timestamp: number }>();
const VIEWSTATE_CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

//employerNoSchema
const employerNoSchema = z
  .string()
  .min(1, "Employer Number is required")
  .regex(
    /^[A-Z]\/*\d{4,5}$/i,
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

    // Get reference number and name with retry logic
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
    console.error("getReferenceNoName error:", error);
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

  // Try to get cached VIEWSTATE and EVENTVALIDATION first
  let viewState = "";
  let eventValidation = "";
  let usedCachedViewState = false;

  const viewStateCacheKey = "cbsl_viewstate";
  const cachedViewState = viewStateCache.get(viewStateCacheKey);
  
  if (cachedViewState && Date.now() - cachedViewState.timestamp < VIEWSTATE_CACHE_TTL) {
    viewState = cachedViewState.viewState;
    eventValidation = cachedViewState.eventValidation;
    usedCachedViewState = true;
  } else {
    // Fetch fresh VIEWSTATE and EVENTVALIDATION
    try {
      const initialResponse = await fetch("https://www.cbsl.lk/EPFCRef/", {
        headers: {
          accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
          "accept-language": "en-LK,en-GB;q=0.9,en-US;q=0.8,en;q=0.7,si;q=0.6",
          "cache-control": "no-cache",
          "sec-ch-ua":
            '"Google Chrome";v="137", "Chromium";v="137", "Not/A)Brand";v="24"',
          "sec-ch-ua-mobile": "?0",
          "sec-ch-ua-platform": '"Windows"',
          "sec-fetch-dest": "document",
          "sec-fetch-mode": "navigate",
          "sec-fetch-site": "same-origin",
          "upgrade-insecure-requests": "1",
          Referer: "https://www.cbsl.lk/EPFCRef/",
          "Referrer-Policy": "strict-origin-when-cross-origin",
        },
        method: "GET",
      });

      if (!initialResponse.ok) {
        throw new Error(`Failed to fetch initial page: ${initialResponse.statusText}`);
      }

      const initialText = await initialResponse.text();

      // Extract VIEWSTATE and EVENTVALIDATION dynamically
      const viewStateMatch = initialText.match(/id="__VIEWSTATE"[^>]*value="([^"]*)"/);
      const eventValidationMatch = initialText.match(/id="__EVENTVALIDATION"[^>]*value="([^"]*)"/);

      if (!viewStateMatch || !eventValidationMatch) {
        throw new Error("Failed to extract VIEWSTATE or EVENTVALIDATION from the page");
      }

      viewState = viewStateMatch[1];
      eventValidation = eventValidationMatch[1];

      // Cache the VIEWSTATE and EVENTVALIDATION
      viewStateCache.set(viewStateCacheKey, {
        viewState,
        eventValidation,
        timestamp: Date.now()
      });
    } catch (error) {
      console.error("Error fetching VIEWSTATE and EVENTVALIDATION:", error);
      throw error;
    }
  }

  try {
    // Make the POST request with the VIEWSTATE and EVENTVALIDATION
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
          '"Google Chrome";v="137", "Chromium";v="137", "Not/A)Brand";v="24"',
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
      body: `__VIEWSTATE=${encodeURIComponent(viewState)}&__VIEWSTATEGENERATOR=7BA8A1FC&__EVENTVALIDATION=${encodeURIComponent(eventValidation)}&zn=${employer_no_zn}&em=${employer_no_number}&mn=${formattedPeriod}&sb=&checkb=Get+Reference`,
      method: "POST",
    });

    if (!response.ok) {
      throw new Error(`Network response was not ok: ${response.statusText}`);
    }

    const text = await response.text();

    // Extract employer name with improved regex
    const nameMatch = text.match(/<span[^>]*id=["']empnm["'][^>]*>(.*?)<\/span>/i);
    const employer_name = nameMatch
      ? nameMatch[1]
          .replace(/<[^>]*>/g, "")
          .split(":")[1]
          ?.trim() || null
      : null;

    // Extract reference number with improved regex
    const refMatch = text.match(/<span[^>]*id=["']refno["'][^>]*>(.*?)<\/span>/i);
    const reference_no = refMatch
      ? refMatch[1]
          .replace(/<[^>]*>/g, "")
          .split(":")[1]
          ?.trim() || null
      : null;

    // If we got data, return it
    if (reference_no && employer_name) {
      return [reference_no, employer_name];
    }

    // If we didn't get data but used cached viewstate, try again with fresh viewstate
    if (usedCachedViewState) {
      console.log("Retrying with fresh VIEWSTATE and EVENTVALIDATION");
      // Remove cached viewstate and try again
      viewStateCache.delete(viewStateCacheKey);
      // Recursively call with fresh viewstate
      return await get_ref_no_name(employer_no, period);
    }

    // If we didn't get data and didn't use cached viewstate, throw an error
    throw new Error("Failed to extract reference number or employer name from response");
  } catch (error) {
    // If we used cached viewstate and failed, try again with fresh viewstate
    if (usedCachedViewState) {
      console.log("Retrying with fresh VIEWSTATE and EVENTVALIDATION after error");
      // Remove cached viewstate and try again
      viewStateCache.delete(viewStateCacheKey);
      // Recursively call with fresh viewstate
      return await get_ref_no_name(employer_no, period);
    }

    if (error instanceof Error) {
      console.error("An error occurred in get_ref_no_name:", error.message);
    } else {
      console.error("An unknown error occurred in get_ref_no_name");
    }
    // Return null values to indicate failure
    return [null, null];
  }
};
