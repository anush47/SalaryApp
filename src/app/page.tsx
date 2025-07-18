import { getServerSession } from "next-auth";
import { options } from "./api/auth/[...nextauth]/options";
import HomePageClient from "./HomePageClient";

export default async function HomePage() {
  const session = await getServerSession(options);

  return <HomePageClient initialSession={session} />;
}