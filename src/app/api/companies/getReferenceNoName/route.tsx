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
      body: `__VIEWSTATE=%2B1P8Ax4KQC%2Fn1ERfjoYSDB5xB7ItFv7YMVvqQIekOHm6Cv1iELg7VdxQk32DcPbtpcFNCTvdPUlfHjeD59wgowGrHCMq1fiBhaldp3mY6AMTOK7BP2eO2nlMxmX133O1726%2FUN1UYGfaVHIJJHtnJdYs3yyZd7aWdU%2FbW58DSQ3OtnGyngyoMQt97DVvFfj%2F0zu1vAnNx8tOAn%2BK%2BvVnZ1XX1A1CzNvCoBcpulywRyaBqryIZgPHa1e%2BPy3Vs%2FJOv9W0BtkY%2Fw4jUg0revPuCsZ4qKL%2BRb1fadMPW9wQV%2F2LMXafCxuEUbFWCXLUtz4pi9EWyI3A%2FRzMfPeyqEZbyD8XnLEKj6drDLlpAt0c5rPdxCiXiNB9VpHR1WlSzorVxOfilzHejX6uvmB8J1uaOb7cBx8MGXvVvYNE9%2F0v1AzcoZLI02fFw8o7sme8yH57q3FjqQbRhfPbYSrAvPCho38jK01tRDj2dWRr6ypISxM%3D&__VIEWSTATEGENERATOR=7BA8A1FC&__EVENTVALIDATION=9KANQy%2FUf4qEZj9p%2F%2BqHXDn4tPspDYl%2BIcOte09%2BilFbreYEYGpHE%2FprxceO3giuZ9liaoyTJwvr6XbG73gILEqb7Ku6gAS8EAvSKKgvpm%2FdmhsMsNNEO84jwy7bgEFsnKEQM4MskMi2AOAYYje7L23BNLhqQIrCIzORIpwy6XPfdwmfiNrv8bb%2Fjwy6RbnZNxHYQGpk7DrEpuWh3HshToYaA8Itq4uUtuS2DhMsQcZO7YhA00FTqUKzxzg3usZExiEp12O7r4CXhtjsIVCUwDKdRXyRTHwdNAYsm9ydHxRhSDiQU9vDRP683JdkwCGmwa7uhno6LV5M8fcqQM%2BxEeV%2FIG9UtLIUbpI4eO9ocFFl82GK%2BU4fDqYe4LAeQMtCUm7kkfCmRmjdD0QNFxtrkeuYK0B8puntvrlqj%2FP8RvNVEXMZRJGpzcayWqE8LpBr&zn=${employer_no_zn}&em=${employer_no_number}&mn=${formattedPeriod}&sb=&checkb=Get+Reference`,
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
